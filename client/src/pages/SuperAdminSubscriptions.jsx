import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../components/DataTable';
import {
  Activity,
  BadgeIndianRupee,
  Building2,
  CalendarClock,
  Clock,
  CreditCard,
  FileText,
  History,
  Inbox,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/axios';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
};

const _createDefaultStartDateTime = () => {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const filters = [
  { value: 'ALL', label: 'All Sellers' },
  { value: 'READY', label: 'Ready' },
  { value: 'PAID', label: 'Paid Active' },
  { value: 'TRIAL', label: 'Trial Active' },
  { value: 'PAST_DUE', label: 'Past Due' },
];

export default function SuperAdminSubscriptions() {
  const [wholesalers, setWholesalers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedWholesalerId, setSelectedWholesalerId] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'coupons', 'history'
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({
    code: '',
    planId: '',
    durationDays: 30,
    expiryDate: '',
  });
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTenantLoading, setIsTenantLoading] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  // Controlled states for Coupons DataTable
  const [couponColumnVisibility, setCouponColumnVisibility] = useState({});
  const [couponRowSelection, setCouponRowSelection] = useState({});

  // Coupon table state derivation
  const couponPage = Number(searchParams.get('coupon_page')) || 1;
  const couponPageSize = Number(searchParams.get('coupon_pageSize')) || 10;
  const couponPagination = useMemo(
    () => ({
      pageIndex: couponPage - 1,
      pageSize: couponPageSize,
    }),
    [couponPage, couponPageSize]
  );

  const couponSortParam = searchParams.get('coupon_sort') || 'code:asc';
  const couponSorting = useMemo(() => {
    const [id, order] = couponSortParam.split(':');
    if (!id) return [];
    return [{ id, desc: order === 'desc' }];
  }, [couponSortParam]);

  const couponGlobalFilter = searchParams.get('coupon_q') || '';

  const setCouponPagination = (updater) => {
    const next = typeof updater === 'function' ? updater(couponPagination) : updater;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('coupon_page', String(next.pageIndex + 1));
    nextParams.set('coupon_pageSize', String(next.pageSize));
    setSearchParams(nextParams, { replace: true });
  };

  const setCouponSorting = (updater) => {
    const next = typeof updater === 'function' ? updater(couponSorting) : updater;
    const nextParams = new URLSearchParams(searchParams);
    if (next && next.length > 0) {
      nextParams.set('coupon_sort', `${next[0].id}:${next[0].desc ? 'desc' : 'asc'}`);
    } else {
      nextParams.delete('coupon_sort');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const setCouponGlobalFilter = (updater) => {
    const next = typeof updater === 'function' ? updater(couponGlobalFilter) : updater;
    const nextParams = new URLSearchParams(searchParams);
    if (next) {
      nextParams.set('coupon_q', next);
      nextParams.set('coupon_page', '1');
    } else {
      nextParams.delete('coupon_q');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const [error, setError] = useState('');

  const refreshWorkspace = useCallback(async () => {
    const [wholesalersResponse, plansResponse, couponsResponse] = await Promise.all([
      apiClient.get('/admin/wholesalers'),
      apiClient.get('/admin/subscriptions/plans'),
      apiClient.get('/admin/coupons'),
    ]);

    const loadedWholesalers = wholesalersResponse.data.wholesalers || [];
    const loadedPlans = plansResponse.data.plans || [];
    setWholesalers(loadedWholesalers);
    setPlans(loadedPlans);
    setCoupons(couponsResponse.data.coupons || []);

    if (loadedPlans.length > 0) {
      setCouponForm((prev) => ({
        ...prev,
        planId: prev.planId || loadedPlans[0].id,
      }));
    }
  }, []);

  const handleDeleteCoupon = useCallback(
    async (id) => {
      if (!window.confirm('Are you sure you want to delete this coupon?')) return;
      try {
        setError('');
        await apiClient.delete(`/admin/coupons/${id}`);
        toast.success('Coupon deleted successfully!');
        await refreshWorkspace();
      } catch (err) {
        const errMsg = err.response?.data?.error || 'Failed to delete coupon.';
        setError(errMsg);
        toast.error(errMsg);
      }
    },
    [refreshWorkspace]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        await refreshWorkspace();
      } catch (fetchError) {
        setError(fetchError.response?.data?.error || 'Failed to load subscriptions page.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [refreshWorkspace]);

  const couponColumns = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ getValue }) => (
          <span className="font-bold font-mono text-zinc-800">{getValue()}</span>
        ),
      },
      {
        id: 'plan',
        accessorFn: (row) => row.plan?.name,
        header: 'Plan',
        cell: ({ row }) => <span>{row.original.plan?.name}</span>,
      },
      {
        accessorKey: 'durationDays',
        header: 'Duration',
        cell: ({ getValue }) => <span>{getValue()} days</span>,
      },
      {
        accessorKey: 'expiryDate',
        header: 'Expiry',
        cell: ({ getValue }) => <span>{new Date(getValue()).toLocaleDateString()}</span>,
      },
      {
        id: 'status',
        accessorFn: (row) => (row.isUsed ? 'used' : 'unused'),
        header: 'Status',
        cell: ({ row }) => {
          const coupon = row.original;
          const isExpired = new Date(coupon.expiryDate) < new Date();
          if (coupon.isUsed) {
            return (
              <div className="space-y-1">
                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  Used
                </span>
                <span className="block text-[10px] text-zinc-500">
                  By: {coupon.usedBy?.businessName || 'Merchant'} (
                  {new Date(coupon.usedAt).toLocaleDateString()})
                </span>
              </div>
            );
          }
          if (isExpired) {
            return (
              <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
                Expired
              </span>
            );
          }
          return (
            <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-200">
              Unused
            </span>
          );
        },
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) => {
          const coupon = row.original;
          if (!coupon.isUsed) {
            return (
              <button
                type="button"
                onClick={() => handleDeleteCoupon(coupon.id)}
                className="rounded p-1 text-zinc-400 hover:bg-[#efe4d3] hover:text-rose-600 transition cursor-pointer"
                title="Delete Coupon"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            );
          }
          return <span className="text-xs text-zinc-400">-</span>;
        },
        meta: {
          className: 'text-right pr-2',
        },
      },
    ],
    [handleDeleteCoupon]
  );

  const filteredWholesalers = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return wholesalers.filter((wholesaler) => {
      const matchesQuery =
        !query ||
        wholesaler.businessName?.toLowerCase().includes(query) ||
        wholesaler.ownerEmail?.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (selectedFilter === 'READY') {
        return ['APPROVED', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'].includes(
          wholesaler.onboardingStatus
        );
      }

      if (selectedFilter === 'PAID') {
        return (
          wholesaler.currentSubscription?.status === 'ACTIVE' &&
          wholesaler.currentSubscription?.plan?.code !== 'TRIAL'
        );
      }

      if (selectedFilter === 'TRIAL') {
        return (
          wholesaler.currentSubscription?.status === 'ACTIVE' &&
          wholesaler.currentSubscription?.plan?.code === 'TRIAL'
        );
      }

      if (selectedFilter === 'PAST_DUE') {
        return (
          wholesaler.currentSubscription?.status === 'PAST_DUE' ||
          wholesaler.onboardingStatus === 'PAST_DUE'
        );
      }

      return true;
    });
  }, [searchValue, selectedFilter, wholesalers]);

  useEffect(() => {
    if (!selectedWholesalerId && filteredWholesalers.length > 0) {
      setSelectedWholesalerId(filteredWholesalers[0].id);
      return;
    }

    if (filteredWholesalers.length === 0) {
      setSelectedWholesalerId('');
      return;
    }

    const stillVisible = filteredWholesalers.some((item) => item.id === selectedWholesalerId);
    if (!stillVisible) {
      setSelectedWholesalerId(filteredWholesalers[0].id);
    }
  }, [filteredWholesalers, selectedWholesalerId]);

  useEffect(() => {
    if (!selectedWholesalerId) {
      setSelectedTenant(null);
      return;
    }

    const loadTenant = async () => {
      try {
        setIsTenantLoading(true);
        const response = await apiClient.get(`/admin/wholesalers/${selectedWholesalerId}`);
        setSelectedTenant(response.data.tenant);
      } catch (fetchError) {
        setError(fetchError.response?.data?.error || 'Failed to load seller subscription details.');
      } finally {
        setIsTenantLoading(false);
      }
    };

    loadTenant();
  }, [selectedWholesalerId]);

  const generateRandomCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'NEX-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCoupon = async () => {
    try {
      setIsCreatingCoupon(true);
      setError('');
      await apiClient.post('/admin/coupons', couponForm);
      toast.success('Coupon created successfully!');
      setCouponForm({
        code: '',
        planId: plans[0]?.id || '',
        durationDays: 30,
        expiryDate: '',
      });
      await refreshWorkspace();
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to create coupon.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const paidActive = wholesalers.filter(
    (item) =>
      item.currentSubscription?.status === 'ACTIVE' &&
      item.currentSubscription?.plan?.code !== 'TRIAL'
  ).length;
  const trialActive = wholesalers.filter(
    (item) =>
      item.currentSubscription?.status === 'ACTIVE' &&
      item.currentSubscription?.plan?.code === 'TRIAL'
  ).length;
  const pastDue = wholesalers.filter(
    (item) =>
      item.currentSubscription?.status === 'PAST_DUE' || item.onboardingStatus === 'PAST_DUE'
  ).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-[#d8ccb9] bg-white/70 px-5 py-4 text-[#8f5d31]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-[0.24em]">
            Loading subscriptions workspace
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="overflow-hidden rounded-[32px] border border-[#d8ccb9] bg-[linear-gradient(135deg,#fffaf3_0%,#f0e3d0_58%,#e8d5b7_100%)] shadow-[0_26px_70px_rgba(57,45,29,0.12)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8ccb9] bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
              <ShieldCheck className="h-4 w-4" />
              Subscription Control Room
            </div>
            <h1 className="mt-5 max-w-2xl text-3xl font-black tracking-tight text-[#221c16] sm:text-5xl">
              Merchant plans, billing, and direct activations.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#5d5247] sm:text-base">
              Query any wholesaler account, inspect their current active plans, check details of
              past transactions, and perform manual activation overrides with real-time receipt
              previews.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TopCard title="Paid Active" value={paidActive} icon={CreditCard} accent="amber" />
            <TopCard title="Trial Active" value={trialActive} icon={Sparkles} accent="sky" />
            <TopCard title="Past Due" value={pastDue} icon={CalendarClock} accent="rose" />
            <TopCard
              title="Loaded Sellers"
              value={wholesalers.length}
              icon={Building2}
              accent="emerald"
            />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-[#e6b6b0] bg-[#fff3f1] px-4 py-3 text-sm text-[#9d3b30]">
          {error}
        </div>
      ) : null}

      {/* Main Workspace Split layout */}
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] xl:grid-cols-[0.8fr_1.2fr]">
        {/* Left Side: Wholesaler Directory */}
        <section className="rounded-[30px] border border-[#d8ccb9] bg-[#fff9f1] p-6 shadow-[0_18px_45px_rgba(57,45,29,0.07)] lg:sticky lg:top-24 lg:self-start max-h-[85vh] flex flex-col">
          <div className="border-b border-[#eadfce] pb-5 shrink-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
              Directory Index
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#221c16]">
              Subscription Targets
            </h2>

            <div className="mt-4 rounded-2xl border border-[#eadfce] bg-[#fcf7f0] p-3 space-y-3">
              <label className="flex items-center gap-3 rounded-xl border border-[#eadfce] bg-white px-3 py-2.5">
                <Search className="h-4 w-4 text-[#8b7e70]" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search business or email"
                  className="w-full bg-transparent text-sm text-[#221c16] outline-none placeholder:text-[#8b7e70]"
                />
              </label>

              <div className="flex flex-wrap gap-1.5">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedFilter(filter.value)}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                      selectedFilter === filter.value
                        ? 'bg-[#221c16] text-[#f5efe4] shadow-sm'
                        : 'border border-[#d8ccb9] bg-white text-[#5d5247] hover:bg-white/90'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable List container */}
          <div className="mt-5 space-y-3 overflow-y-auto flex-1 pr-1">
            {filteredWholesalers.length > 0 ? (
              filteredWholesalers.map((wholesaler) => {
                const isSelected = wholesaler.id === selectedWholesalerId;
                return (
                  <button
                    key={wholesaler.id}
                    type="button"
                    onClick={() => setSelectedWholesalerId(wholesaler.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition duration-200 hover:scale-[1.01] ${
                      isSelected
                        ? 'border-[#bc6c25] bg-[#fff4e6] shadow-[0_12px_24px_rgba(188,108,37,0.08)]'
                        : 'border-[#eadfce] bg-[#fcf7f0] hover:border-[#d7c0a4] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black tracking-tight text-[#221c16] line-clamp-1">
                          {wholesaler.businessName}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6b6155] line-clamp-1">
                          {wholesaler.ownerEmail}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${
                          wholesaler.onboardingStatus === 'APPROVED' ||
                          wholesaler.onboardingStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : wholesaler.onboardingStatus === 'PAST_DUE'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {wholesaler.onboardingStatus}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/60 p-2 rounded-lg border border-[#efe4d3]">
                        <span className="text-[10px] text-[#8b7e70] font-medium block">
                          Active Plan
                        </span>
                        <span className="font-bold text-[#221c16] truncate block">
                          {wholesaler.currentSubscription?.plan?.name || 'None'}
                        </span>
                      </div>
                      <div className="bg-white/60 p-2 rounded-lg border border-[#efe4d3]">
                        <span className="text-[10px] text-[#8b7e70] font-medium block">Status</span>
                        <span className="font-bold text-[#221c16] truncate block">
                          {wholesaler.currentSubscription?.status || 'No record'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8ccb9] px-4 py-12 text-center text-[#6b6155]">
                <Inbox className="h-8 w-8 text-[#8b7e70] mb-2 opacity-50" />
                <p className="text-sm font-semibold">No Merchants Found</p>
                <p className="text-xs text-[#8b7e70] mt-1">
                  Try adapting your search or filter inputs.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Tabbed Subscription Console */}
        <section className="rounded-[30px] border border-[#d8ccb9] bg-[#fff9f1] p-6 shadow-[0_18px_45px_rgba(57,45,29,0.07)] min-h-[500px] flex flex-col">
          {isTenantLoading ? (
            <div className="flex flex-1 items-center justify-center text-[#8f5d31] min-h-[400px]">
              <div className="flex flex-col items-center gap-2">
                <LoaderCircle className="h-8 w-8 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Syncing Merchant Records...
                </p>
              </div>
            </div>
          ) : selectedTenant ? (
            <div className="space-y-6 flex-1 flex flex-col">
              {/* Wholesaler Header banner */}
              <div className="rounded-[28px] border border-[#eadfce] bg-[linear-gradient(135deg,#fffdf8_0%,#f8eddb_100%)] p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                      <Building2 className="h-3.5 w-3.5" />
                      Wholesaler Account
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[#221c16] md:text-3xl">
                      {selectedTenant.businessName}
                    </h2>
                    <p className="mt-1 text-sm text-[#6b6155]">
                      {selectedTenant.ownerEmail} · Owner: {selectedTenant.ownerName || 'N/A'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border ${
                        selectedTenant.onboardingStatus === 'APPROVED' ||
                        selectedTenant.onboardingStatus === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedTenant.onboardingStatus === 'PAST_DUE'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      Onboarding: {selectedTenant.onboardingStatus}
                    </span>
                    {selectedTenant.currentSubscription ? (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border ${
                          selectedTenant.currentSubscription.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        Plan: {selectedTenant.currentSubscription.plan?.name} ·{' '}
                        {selectedTenant.currentSubscription.status}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border bg-amber-50 text-amber-700 border-amber-200">
                        No Subscription
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#efe4d3]/60 border border-[#d8ccb9] max-w-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'overview'
                      ? 'bg-[#221c16] text-[#f5efe4] shadow-[0_4px_12px_rgba(34,28,22,0.15)]'
                      : 'text-[#5d5247] hover:bg-[#efe4d3]/80 hover:text-[#221c16]'
                  }`}
                >
                  Overview & Stats
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('coupons')}
                  className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'coupons'
                      ? 'bg-[#bc6c25] text-white shadow-[0_4px_12px_rgba(188,108,37,0.15)]'
                      : 'text-[#5d5247] hover:bg-[#efe4d3]/80 hover:text-[#221c16]'
                  }`}
                >
                  Coupons
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'history'
                      ? 'bg-[#221c16] text-[#f5efe4] shadow-[0_4px_12px_rgba(34,28,22,0.15)]'
                      : 'text-[#5d5247] hover:bg-[#efe4d3]/80 hover:text-[#221c16]'
                  }`}
                >
                  Payment History
                </button>
              </div>

              {/* Tab Content Panel */}
              <div className="flex-1">
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Subscription & Trial grid */}
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8f5d31] mb-4">
                          <CreditCard className="h-4 w-4" />
                          Subscription Details
                        </div>
                        <div className="space-y-2.5">
                          <StateRow
                            label="Active Plan"
                            value={selectedTenant.currentSubscription?.plan?.name || 'Not active'}
                          />
                          <StateRow
                            label="Payment Status"
                            value={selectedTenant.currentSubscription?.status || 'No record'}
                          />
                          <StateRow
                            label="Starts At"
                            value={formatDate(
                              selectedTenant.currentSubscription?.currentPeriodStart
                            )}
                          />
                          <StateRow
                            label="Ends At"
                            value={formatDate(selectedTenant.currentSubscription?.currentPeriodEnd)}
                          />
                          <StateRow
                            label="Billing Cycle"
                            value={
                              selectedTenant.currentSubscription?.plan?.code === 'TRIAL'
                                ? '2-Day Trial'
                                : selectedTenant.currentSubscription?.durationMonths
                                  ? `${selectedTenant.currentSubscription.durationMonths} Month(s)`
                                  : 'N/A'
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8f5d31] mb-4">
                          <Sparkles className="h-4 w-4" />
                          Trial State
                        </div>
                        <div className="space-y-2.5">
                          <StateRow
                            label="Trial Active"
                            value={
                              selectedTenant.currentSubscription?.plan?.code === 'TRIAL' &&
                              selectedTenant.currentSubscription?.status === 'ACTIVE'
                                ? 'Running'
                                : 'No'
                            }
                          />
                          <StateRow
                            label="Trial Eligibility"
                            value={selectedTenant.trialUsedAt ? 'Used' : 'Eligible'}
                          />
                          <StateRow
                            label="Trial Starts"
                            value={
                              selectedTenant.trialEndsAt
                                ? formatDate(
                                    new Date(
                                      new Date(selectedTenant.trialEndsAt).getTime() -
                                        2 * 24 * 60 * 60 * 1000
                                    )
                                  )
                                : 'N/A'
                            }
                          />
                          <StateRow
                            label="Trial Ends"
                            value={formatDate(selectedTenant.trialEndsAt)}
                          />
                          <StateRow
                            label="Trial Used At"
                            value={formatDate(selectedTenant.trialUsedAt)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial stats */}
                    <div className="rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8f5d31] mb-4">
                        <Activity className="h-4 w-4" />
                        Merchant Financial Overview
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-white p-4 border border-[#eadfce] shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#8b7e70]">
                            Accumulated Revenue
                          </p>
                          <p className="mt-2 text-2xl font-black text-[#221c16]">
                            {formatCurrency(selectedTenant.metrics?.revenue || 0)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-4 border border-[#eadfce] shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#8b7e70]">
                            Total Inventory Value
                          </p>
                          <p className="mt-2 text-2xl font-black text-[#221c16]">
                            {formatCurrency(selectedTenant.metrics?.inventoryValue || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'coupons' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                      {/* Left: Create Coupon Form */}
                      <div className="space-y-5 rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-6 shadow-sm">
                        <div>
                          <h3 className="text-lg font-black text-[#221c16] flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-[#bc6c25]" />
                            Create Subscription Coupon
                          </h3>
                          <p className="text-xs text-[#6b6155] mt-1">
                            Generate unique coupon codes that wholesalers can redeem directly on
                            their billing page to activate subscriptions.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="flex gap-2 items-end">
                            <AdminField label="Coupon Code" className="flex-1">
                              <input
                                value={couponForm.code}
                                onChange={(e) =>
                                  setCouponForm({
                                    ...couponForm,
                                    code: e.target.value.toUpperCase(),
                                  })
                                }
                                placeholder="e.g. NEX-PREMIUM30"
                                className="h-11 w-full rounded-xl border border-[#d8ccb9] bg-white px-3 text-sm text-[#221c16] outline-none focus:border-[#bc6c25] transition"
                              />
                            </AdminField>
                            <button
                              type="button"
                              onClick={() =>
                                setCouponForm({ ...couponForm, code: generateRandomCouponCode() })
                              }
                              className="h-11 px-4 rounded-xl border border-[#d8ccb9] bg-white text-xs font-bold uppercase tracking-wider text-[#5d5247] hover:bg-zinc-50 transition"
                            >
                              Generate
                            </button>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <AdminField label="Select Plan">
                              <select
                                value={couponForm.planId}
                                onChange={(e) =>
                                  setCouponForm({ ...couponForm, planId: e.target.value })
                                }
                                className="h-11 w-full rounded-xl border border-[#d8ccb9] bg-white px-3 text-sm text-[#221c16] outline-none focus:border-[#bc6c25] transition"
                              >
                                <option value="" disabled>
                                  Select a plan
                                </option>
                                {plans.map((plan) => (
                                  <option key={plan.id} value={plan.id}>
                                    {plan.name} ({plan.code})
                                  </option>
                                ))}
                              </select>
                            </AdminField>

                            <AdminField label="Duration (Days)">
                              <input
                                type="number"
                                min="1"
                                value={couponForm.durationDays}
                                onChange={(e) =>
                                  setCouponForm({
                                    ...couponForm,
                                    durationDays: Number(e.target.value),
                                  })
                                }
                                className="h-11 w-full rounded-xl border border-[#d8ccb9] bg-white px-3 text-sm text-[#221c16] outline-none focus:border-[#bc6c25] transition"
                              />
                            </AdminField>
                          </div>

                          <AdminField label="Coupon Expiry Date">
                            <input
                              type="date"
                              value={couponForm.expiryDate}
                              onChange={(e) =>
                                setCouponForm({ ...couponForm, expiryDate: e.target.value })
                              }
                              className="h-11 w-full rounded-xl border border-[#d8ccb9] bg-white px-3 text-sm text-[#221c16] outline-none focus:border-[#bc6c25] transition"
                            />
                          </AdminField>

                          <button
                            type="button"
                            onClick={handleCreateCoupon}
                            disabled={
                              !couponForm.code ||
                              !couponForm.planId ||
                              !couponForm.durationDays ||
                              !couponForm.expiryDate ||
                              isCreatingCoupon
                            }
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#bc6c25] py-3.5 px-4 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all duration-200 hover:bg-[#a05a1d] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isCreatingCoupon ? (
                              <>
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Creating Coupon...
                              </>
                            ) : (
                              'Create Coupon'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Right: Quick Info */}
                      <div className="rounded-[28px] border border-[#bc6c25]/30 bg-[#221c16] p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#bc6c25]/10 rounded-full blur-2xl -mr-6 -mt-6"></div>

                        <div>
                          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-[#d7c0a4]">
                                System Access
                              </p>
                              <h4 className="text-lg font-black tracking-tight text-white mt-1">
                                Coupon Invoicing
                              </h4>
                            </div>
                            <BadgeIndianRupee className="h-7 w-7 text-[#d7c0a4] opacity-80" />
                          </div>

                          <p className="text-sm leading-6 text-zinc-300">
                            Instead of overriding seller accounts manually, coupons put the
                            activation power in the user's hands. Create a coupon, share the code
                            with the wholesaler, and they can activate it themselves.
                          </p>

                          <div className="mt-5 space-y-3">
                            <div className="flex justify-between items-center text-xs text-[#8b7e70] border-b border-white/5 pb-2">
                              <span>Total Coupons Generated</span>
                              <span className="font-bold text-white">{coupons.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-[#8b7e70] border-b border-white/5 pb-2">
                              <span>Used Coupons</span>
                              <span className="font-bold text-[#dda15e]">
                                {coupons.filter((c) => c.isUsed).length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-[#8b7e70]">
                              <span>Unused Coupons</span>
                              <span className="font-bold text-[#a7c957]">
                                {coupons.filter((c) => !c.isUsed).length}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 text-[11px] text-[#8b7e70] italic">
                          * Coupons cannot be reused once activated by a wholesaler.
                        </div>
                      </div>
                    </div>

                    {/* Coupons List */}
                    <div className="rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-5 shadow-sm">
                      <h3 className="text-lg font-black text-[#221c16] mb-4">Coupon Registry</h3>

                      <DataTable
                        columns={couponColumns}
                        data={coupons}
                        isLoading={false}
                        sorting={couponSorting}
                        setSorting={setCouponSorting}
                        pagination={couponPagination}
                        setPagination={setCouponPagination}
                        globalFilter={couponGlobalFilter}
                        setGlobalFilter={setCouponGlobalFilter}
                        columnVisibility={couponColumnVisibility}
                        setColumnVisibility={setCouponColumnVisibility}
                        rowSelection={couponRowSelection}
                        setRowSelection={setCouponRowSelection}
                        searchPlaceholder="Search coupon code..."
                        emptyStateMessage="No coupons found."
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-[#221c16]">
                          Transaction & Audit History
                        </h3>
                        <p className="text-xs text-[#6b6155] mt-1">
                          Audit log of subscription invoices and manual overrides.
                        </p>
                      </div>
                      <span className="rounded-full bg-[#efe4d3] px-3.5 py-1 text-xs font-bold text-[#8f5d31] border border-[#d8ccb9]">
                        {(selectedTenant.subscriptionPayments || []).length} Payments
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                      {(selectedTenant.subscriptionPayments || []).length > 0 ? (
                        selectedTenant.subscriptionPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="rounded-2xl border border-[#eadfce] bg-[#fcf7f0] p-4 transition duration-150 hover:bg-white"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-black text-[#221c16]">
                                    {payment.plan?.name || 'Subscription Activation'}
                                  </p>
                                  <span className="inline-block text-[10px] font-bold text-[#8b7e70] border border-[#d8ccb9] px-2 py-0.5 rounded bg-white">
                                    {payment.durationMonths} Month(s)
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-[#6b6155]">
                                  {formatDate(payment.createdAt)}
                                </p>
                              </div>

                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize border ${
                                  payment.status === 'PAID' || payment.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {payment.status.toLowerCase()}
                              </span>
                            </div>

                            <div className="mt-3.5 grid gap-3 grid-cols-2 text-xs border-t border-[#eadfce] pt-3 text-[#5d5247]">
                              <div>
                                <span className="text-[#8b7e70] font-medium block">Method</span>
                                <span className="font-bold text-[#221c16]">
                                  {payment.purchaseMethod}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8b7e70] font-medium block">
                                  Amount Paid
                                </span>
                                <span className="font-bold text-[#221c16]">
                                  {formatCurrency(payment.finalAmount || payment.amount || 0)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8b7e70] font-medium block">Discount</span>
                                <span className="font-bold text-[#221c16]">
                                  {payment.discountPercent || 0}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8b7e70] font-medium block">
                                  Reference Code
                                </span>
                                <span className="font-bold text-[#221c16] truncate block max-w-[150px]">
                                  {payment.externalReference || payment.razorpayPaymentId || 'None'}
                                </span>
                              </div>
                            </div>

                            {payment.activationNotes && (
                              <div className="mt-3 bg-white/70 border border-[#efe4d3] rounded-xl p-3 text-xs text-[#6b6155] flex gap-2">
                                <FileText className="h-4 w-4 text-[#8f5d31] shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-[#8f5d31] block mb-0.5">
                                    Audit Note:
                                  </span>
                                  {payment.activationNotes}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center border border-dashed border-[#d8ccb9] rounded-2xl p-8 text-center text-[#6b6155] bg-white/50">
                          <History className="h-8 w-8 text-[#8b7e70] mb-2 opacity-50" />
                          <p className="text-sm font-semibold">No Payments Logged</p>
                          <p className="text-xs text-[#8b7e70] mt-1">
                            This seller does not have any manual or online payment logs on record.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white/40 rounded-[24px] border border-dashed border-[#d8ccb9] animate-fadeIn">
              <Building2 className="h-12 w-12 text-[#8f5d31] mb-4 opacity-75" />
              <h3 className="text-lg font-black text-[#221c16]">No Merchant Selected</h3>
              <p className="mt-2 text-sm text-[#6b6155] max-w-sm">
                Select a wholesaler from the directory on the left to verify active subscriptions,
                view invoicing logs, or perform manual override activations.
              </p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function TopCard({ title, value, icon: Icon, accent }) {
  const accents = {
    amber: 'bg-[#bc6c25] text-white',
    sky: 'bg-[#355070] text-white',
    rose: 'bg-[#9c6644] text-white',
    emerald: 'bg-[#386641] text-white',
  };

  return (
    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm hover:scale-[1.01] transition-all duration-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">{title}</p>
          <p className="mt-2.5 text-3xl font-black tracking-tight text-[#221c16]">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accents[accent] || 'bg-[#221c16]'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function AdminField({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b7e70]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function StateRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#eadfce] bg-white px-3.5 py-2 text-sm shadow-sm">
      <span className="text-[#6b6155] font-medium">{label}</span>
      <span className="text-right font-bold text-[#221c16] truncate max-w-[200px]">{value}</span>
    </div>
  );
}
