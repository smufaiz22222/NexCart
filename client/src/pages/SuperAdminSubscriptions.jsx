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

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const formatDate = (value) => {
  if (!value) return 'N/A';
  return dateFormatter.format(new Date(value));
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

const generateRandomCouponCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'NEX-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

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
    isUpgrade: false,
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
          <span className="font-bold font-mono text-[#EAECEF]">{getValue()}</span>
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
        accessorKey: 'isUpgrade',
        header: 'Type',
        cell: ({ getValue }) => (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold border ${
              getValue()
                ? 'bg-[#F0B90B]/10 text-[#F0B90B] border-[#F0B90B]/20'
                : 'bg-[#2B3139] text-[#EAECEF] border-zinc-200'
            }`}
          >
            {getValue() ? 'Upgrade' : 'Standard'}
          </span>
        ),
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
                <span className="inline-flex rounded-full bg-[#0ECB81]/10 px-2 py-0.5 text-xs font-bold text-[#0ECB81] border border-[#0ECB81]/20">
                  Used
                </span>
                <span className="block text-[10px] text-[#5E6673]">
                  By: {coupon.usedBy?.businessName || 'Merchant'} (
                  {new Date(coupon.usedAt).toLocaleDateString()})
                </span>
              </div>
            );
          }
          if (isExpired) {
            return (
              <span className="inline-flex rounded-full bg-[#F6465D]/10 px-2 py-0.5 text-xs font-bold text-[#F6465D] border border-[#F6465D]/20">
                Expired
              </span>
            );
          }
          return (
            <span className="inline-flex rounded-full bg-[#1E9CF1]/10 px-2 py-0.5 text-xs font-bold text-[#1E9CF1] border border-[#1E9CF1]/20">
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
                className="rounded p-1 text-[#5E6673] hover:bg-[#2B3139] hover:text-rose-600 transition cursor-pointer"
                title="Delete Coupon"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            );
          }
          return <span className="text-xs text-[#5E6673]">-</span>;
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

  const activeWholesalerId = useMemo(() => {
    if (filteredWholesalers.length === 0) return '';

    if (filteredWholesalers.some((item) => item.id === selectedWholesalerId)) {
      return selectedWholesalerId;
    }

    return filteredWholesalers[0].id;
  }, [filteredWholesalers, selectedWholesalerId]);

  useEffect(() => {
    if (!activeWholesalerId) {
      setSelectedTenant(null);
      return;
    }

    const loadTenant = async () => {
      try {
        setIsTenantLoading(true);
        const response = await apiClient.get(`/admin/wholesalers/${activeWholesalerId}`);
        setSelectedTenant(response.data.tenant);
      } catch (fetchError) {
        setError(fetchError.response?.data?.error || 'Failed to load seller subscription details.');
      } finally {
        setIsTenantLoading(false);
      }
    };

    loadTenant();
  }, [activeWholesalerId]);

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
        isUpgrade: false,
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
        <div className="flex items-center gap-3 rounded-lg border border-[#2B3139] bg-[#1E2329] px-5 py-4 text-[#F0B90B]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading subscriptions workspace</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="rounded-xl border border-[#2B3139] bg-[#12161C] p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-[#F0B90B]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0B90B]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Subscription Control
            </div>
            <h1 className="mt-3 max-w-2xl text-2xl font-bold text-[#EAECEF] sm:text-3xl">
              Merchant plans, billing, and activations.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#848E9C]">
              Query any wholesaler, inspect active plans, view past transactions, and perform manual
              overrides.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TopCard title="Paid Active" value={paidActive} icon={CreditCard} accent="yellow" />
            <TopCard title="Trial Active" value={trialActive} icon={Sparkles} accent="blue" />
            <TopCard title="Past Due" value={pastDue} icon={CalendarClock} accent="red" />
            <TopCard
              title="Total Sellers"
              value={wholesalers.length}
              icon={Building2}
              accent="green"
            />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-[#F6465D]/30 bg-[#F6465D]/5 px-4 py-3 text-sm text-[#F6465D]">
          {error}
        </div>
      ) : null}

      {/* Main Workspace */}
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] xl:grid-cols-[0.8fr_1.2fr]">
        {/* Left: Directory */}
        <section className="rounded-xl border border-[#2B3139] bg-[#12161C] p-5 lg:sticky lg:top-24 lg:self-start max-h-[85vh] flex flex-col">
          <div className="border-b border-[#2B3139] pb-4 shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#848E9C]">
              Directory
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#EAECEF]">Subscription Targets</h2>

            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-3 rounded-lg border border-[#2B3139] bg-[#1E2329] px-3 py-2.5">
                <Search className="h-4 w-4 text-[#5E6673]" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search business or email"
                  className="w-full bg-transparent text-sm text-[#EAECEF] outline-none placeholder:text-[#5E6673]"
                />
              </label>

              <div className="flex flex-wrap gap-1.5">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedFilter(filter.value)}
                    className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                      selectedFilter === filter.value
                        ? 'bg-[#F0B90B]/10 text-[#F0B90B]'
                        : 'text-[#5E6673] hover:text-[#848E9C]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2 overflow-y-auto flex-1 pr-1">
            {filteredWholesalers.length > 0 ? (
              filteredWholesalers.map((wholesaler) => {
                const isSelected = wholesaler.id === activeWholesalerId;
                return (
                  <button
                    key={wholesaler.id}
                    type="button"
                    onClick={() => setSelectedWholesalerId(wholesaler.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? 'border-[#F0B90B]/40 bg-[#F0B90B]/5'
                        : 'border-[#2B3139] bg-[#1E2329] hover:border-[#F0B90B]/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#EAECEF] line-clamp-1">
                          {wholesaler.businessName}
                        </p>
                        <p className="mt-0.5 text-xs text-[#5E6673] line-clamp-1">
                          {wholesaler.ownerEmail}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-semibold uppercase rounded-md px-1.5 py-0.5 ${
                          wholesaler.onboardingStatus === 'APPROVED' ||
                          wholesaler.onboardingStatus === 'ACTIVE'
                            ? 'bg-[#0ECB81]/10 text-[#0ECB81]'
                            : wholesaler.onboardingStatus === 'PAST_DUE'
                              ? 'bg-[#F6465D]/10 text-[#F6465D]'
                              : 'bg-[#F0B90B]/10 text-[#F0B90B]'
                        }`}
                      >
                        {wholesaler.onboardingStatus}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#12161C] p-2 rounded-md">
                        <span className="text-[10px] text-[#5E6673] block">Plan</span>
                        <span className="font-semibold text-[#EAECEF] truncate block">
                          {wholesaler.currentSubscription?.plan?.name || 'None'}
                        </span>
                      </div>
                      <div className="bg-[#12161C] p-2 rounded-md">
                        <span className="text-[10px] text-[#5E6673] block">Status</span>
                        <span className="font-semibold text-[#EAECEF] truncate block">
                          {wholesaler.currentSubscription?.status || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#2B3139] px-4 py-10 text-center">
                <Inbox className="h-8 w-8 text-[#5E6673] mb-2" />
                <p className="text-sm font-medium text-[#848E9C]">No Merchants Found</p>
                <p className="text-xs text-[#5E6673] mt-1">Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </section>

        {/* Right: Console */}
        <section className="rounded-xl border border-[#2B3139] bg-[#12161C] p-5 min-h-[500px] flex flex-col">
          {isTenantLoading ? (
            <div className="flex flex-1 items-center justify-center text-[#F0B90B] min-h-[400px]">
              <div className="flex flex-col items-center gap-2">
                <LoaderCircle className="h-8 w-8 animate-spin" />
                <p className="text-xs font-medium text-[#848E9C]">Syncing records...</p>
              </div>
            </div>
          ) : selectedTenant ? (
            <div className="space-y-5 flex-1 flex flex-col">
              {/* Tenant Header */}
              <div className="rounded-lg border border-[#2B3139] bg-[#1E2329] p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#848E9C]">
                      <Building2 className="h-3.5 w-3.5" />
                      Wholesaler Account
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-[#EAECEF]">
                      {selectedTenant.businessName}
                    </h2>
                    <p className="mt-0.5 text-sm text-[#5E6673]">
                      {selectedTenant.ownerEmail} · Owner: {selectedTenant.ownerName || 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase rounded-md px-2 py-1 ${
                        selectedTenant.onboardingStatus === 'ACTIVE'
                          ? 'bg-[#0ECB81]/10 text-[#0ECB81]'
                          : 'bg-[#F0B90B]/10 text-[#F0B90B]'
                      }`}
                    >
                      {selectedTenant.onboardingStatus}
                    </span>
                    {selectedTenant.currentSubscription && (
                      <span
                        className={`text-[10px] font-semibold uppercase rounded-md px-2 py-1 ${
                          selectedTenant.currentSubscription.status === 'ACTIVE'
                            ? 'bg-[#0ECB81]/10 text-[#0ECB81]'
                            : 'bg-[#F6465D]/10 text-[#F6465D]'
                        }`}
                      >
                        {selectedTenant.currentSubscription.plan?.name} ·{' '}
                        {selectedTenant.currentSubscription.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#1E2329] border border-[#2B3139] max-w-md shrink-0">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'coupons', label: 'Coupons' },
                  { id: 'history', label: 'Payments' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 rounded-md py-2 px-3 text-xs font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-[#2B3139] text-[#F0B90B]'
                        : 'text-[#5E6673] hover:text-[#848E9C]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content Panel */}
              <div className="flex-1">
                {activeTab === 'overview' && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-[#2B3139] bg-[#1E2329] p-5">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#F0B90B] mb-4">
                          <CreditCard className="h-3.5 w-3.5" />
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
                            highlight={
                              selectedTenant.currentSubscription?.status === 'ACTIVE'
                                ? 'success'
                                : null
                            }
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
                          <StateRow
                            label="Purchase Method"
                            value={selectedTenant.currentSubscription?.purchaseMethod || 'N/A'}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#2B3139] bg-[#1E2329] p-5">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#F0B90B] mb-4">
                          <Sparkles className="h-3.5 w-3.5" />
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
                            highlight={
                              selectedTenant.currentSubscription?.plan?.code === 'TRIAL' &&
                              selectedTenant.currentSubscription?.status === 'ACTIVE'
                                ? 'success'
                                : null
                            }
                          />
                          <StateRow
                            label="Eligibility"
                            value={selectedTenant.trialUsedAt ? 'Used' : 'Eligible'}
                            highlight={!selectedTenant.trialUsedAt ? 'info' : null}
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

                    <div className="rounded-lg border border-[#2B3139] bg-[#1E2329] p-5">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#F0B90B] mb-4">
                        <Activity className="h-3.5 w-3.5" />
                        Financial Overview
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <FinancialStat
                          label="All-Time Revenue"
                          value={formatCurrency(selectedTenant.metrics?.revenue || 0)}
                          accent="yellow"
                        />
                        <FinancialStat
                          label="This Subscription"
                          value={formatCurrency(selectedTenant.metrics?.subscriptionRevenue || 0)}
                          accent="green"
                        />
                        <FinancialStat
                          label="Total Orders"
                          value={selectedTenant.metrics?.orderCount || 0}
                          accent="blue"
                        />
                        <FinancialStat
                          label="Inventory Value"
                          value={formatCurrency(selectedTenant.metrics?.inventoryValue || 0)}
                          accent="purple"
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#2B3139] bg-[#1E2329] p-5">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#848E9C] mb-4">
                        <Clock className="h-3.5 w-3.5" />
                        Account Timeline
                      </div>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <StateRow
                          label="Account Created"
                          value={formatDate(selectedTenant.joinedAt)}
                        />
                        <StateRow
                          label="Onboarding"
                          value={selectedTenant.onboardingStatus || 'N/A'}
                          highlight={
                            selectedTenant.onboardingStatus === 'ACTIVE' ? 'success' : null
                          }
                        />
                        <StateRow
                          label="Payments Made"
                          value={`${(selectedTenant.subscriptionPayments || []).length} payment(s)`}
                        />
                        <StateRow
                          label="Last Payment"
                          value={
                            selectedTenant.subscriptionPayments?.length > 0
                              ? formatDate(selectedTenant.subscriptionPayments[0]?.createdAt)
                              : 'None'
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'coupons' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                      {/* Left: Create Coupon Form */}
                      <div className="space-y-5 rounded-[24px] border border-[#2B3139] bg-[#1E2329] p-6 shadow-sm">
                        <div>
                          <h3 className="text-lg font-black text-[#EAECEF] flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-[#F0B90B]" />
                            Create Subscription Coupon
                          </h3>
                          <p className="text-xs text-[#848E9C] mt-1">
                            Generate unique coupon codes that wholesalers can redeem directly on
                            their billing page to activate subscriptions.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="flex gap-2 items-end">
                            <AdminField label="Coupon Code" className="flex-1">
                              <input
                                aria-label="Coupon Code"
                                value={couponForm.code}
                                onChange={(e) =>
                                  setCouponForm({
                                    ...couponForm,
                                    code: e.target.value.toUpperCase(),
                                  })
                                }
                                placeholder="e.g. NEX-PREMIUM30"
                                className="h-11 w-full rounded-xl border border-[#2B3139] bg-[#1E2329] px-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]/50 transition"
                              />
                            </AdminField>
                            <button
                              type="button"
                              onClick={() =>
                                setCouponForm({ ...couponForm, code: generateRandomCouponCode() })
                              }
                              className="h-11 px-4 rounded-xl border border-[#2B3139] bg-[#12161C] text-xs font-bold uppercase tracking-wider text-[#848E9C] hover:bg-[#2B3139] transition"
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
                                className="h-11 w-full rounded-xl border border-[#2B3139] bg-[#1E2329] px-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]/50 transition"
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
                                aria-label="Duration in days"
                                value={couponForm.durationDays}
                                onChange={(e) =>
                                  setCouponForm({
                                    ...couponForm,
                                    durationDays: Number(e.target.value),
                                  })
                                }
                                className="h-11 w-full rounded-xl border border-[#2B3139] bg-[#1E2329] px-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]/50 transition"
                              />
                            </AdminField>
                          </div>

                          <AdminField label="Coupon Expiry Date">
                            <input
                              type="date"
                              aria-label="Coupon Expiry Date"
                              value={couponForm.expiryDate}
                              onChange={(e) =>
                                setCouponForm({ ...couponForm, expiryDate: e.target.value })
                              }
                              className="h-11 w-full rounded-xl border border-[#2B3139] bg-[#1E2329] px-3 text-sm text-[#EAECEF] outline-none focus:border-[#F0B90B]/50 transition"
                            />
                          </AdminField>

                          <div className="flex items-center gap-3 py-1 bg-white/40 p-3 rounded-xl border border-[#2B3139] mt-1">
                            <input
                              type="checkbox"
                              id="isUpgrade"
                              checked={couponForm.isUpgrade}
                              onChange={(e) =>
                                setCouponForm({ ...couponForm, isUpgrade: e.target.checked })
                              }
                              className="h-4.5 w-4.5 rounded border-[#2B3139] text-[#F0B90B] focus:ring-[#F0B90B] cursor-pointer"
                            />
                            <div className="flex flex-col">
                              <label
                                htmlFor="isUpgrade"
                                className="text-xs font-black uppercase tracking-wider text-[#EAECEF] cursor-pointer"
                              >
                                Is Upgrade Promocode?
                              </label>
                              <span className="text-[10px] text-[#848E9C] mt-0.5">
                                Valid only for Standard members upgrading to Premium.
                              </span>
                            </div>
                          </div>

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
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F0B90B] py-3.5 px-4 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all duration-200 hover:bg-[#D4960A] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
                      <div className="rounded-[28px] border border-[#F0B90B]/20 bg-[#0B0E11] p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#F0B90B]/10 rounded-full blur-2xl -mr-6 -mt-6"></div>

                        <div>
                          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-[#848E9C]">
                                System Access
                              </p>
                              <h4 className="text-lg font-black tracking-tight text-white mt-1">
                                Coupon Invoicing
                              </h4>
                            </div>
                            <BadgeIndianRupee className="h-7 w-7 text-[#848E9C] opacity-80" />
                          </div>

                          <p className="text-sm leading-6 text-[#848E9C]">
                            Instead of overriding seller accounts manually, coupons put the
                            activation power in the user's hands. Create a coupon, share the code
                            with the wholesaler, and they can activate it themselves.
                          </p>

                          <div className="mt-5 space-y-3">
                            <div className="flex justify-between items-center text-xs text-[#5E6673] border-b border-white/5 pb-2">
                              <span>Total Coupons Generated</span>
                              <span className="font-bold text-white">{coupons.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-[#5E6673] border-b border-white/5 pb-2">
                              <span>Used Coupons</span>
                              <span className="font-bold text-[#F0B90B]">
                                {coupons.filter((c) => c.isUsed).length}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-[#5E6673]">
                              <span>Unused Coupons</span>
                              <span className="font-bold text-[#0ECB81]">
                                {coupons.filter((c) => !c.isUsed).length}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 text-[11px] text-[#5E6673] italic">
                          * Coupons cannot be reused once activated by a wholesaler.
                        </div>
                      </div>
                    </div>

                    {/* Coupons List */}
                    <div className="rounded-[24px] border border-[#2B3139] bg-[#1E2329] p-5 shadow-sm">
                      <h3 className="text-lg font-black text-[#EAECEF] mb-4">Coupon Registry</h3>

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
                        <h3 className="text-lg font-black text-[#EAECEF]">
                          Transaction & Audit History
                        </h3>
                        <p className="text-xs text-[#848E9C] mt-1">
                          Audit log of subscription invoices and manual overrides.
                        </p>
                      </div>
                      <span className="rounded-full bg-[#2B3139] px-3.5 py-1 text-xs font-bold text-[#F0B90B] border border-[#2B3139]">
                        {(selectedTenant.subscriptionPayments || []).length} Payments
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                      {(selectedTenant.subscriptionPayments || []).length > 0 ? (
                        selectedTenant.subscriptionPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="rounded-2xl border border-[#2B3139] bg-[#1E2329] p-4 transition duration-150 hover:bg-[#12161C]"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-black text-[#EAECEF]">
                                    {payment.plan?.name || 'Subscription Activation'}
                                  </p>
                                  <span className="inline-block text-[10px] font-bold text-[#5E6673] border border-[#2B3139] px-2 py-0.5 rounded bg-[#12161C]">
                                    {payment.durationMonths} Month(s)
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-[#848E9C]">
                                  {formatDate(payment.createdAt)}
                                </p>
                              </div>

                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize border ${
                                  payment.status === 'PAID' || payment.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border-[#0ECB81]/20'
                                    : 'bg-amber-50 text-amber-700 border-[#F0B90B]/20'
                                }`}
                              >
                                {payment.status.toLowerCase()}
                              </span>
                            </div>

                            <div className="mt-3.5 grid gap-3 grid-cols-2 text-xs border-t border-[#2B3139] pt-3 text-[#848E9C]">
                              <div>
                                <span className="text-[#5E6673] font-medium block">Method</span>
                                <span className="font-bold text-[#EAECEF]">
                                  {payment.purchaseMethod}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#5E6673] font-medium block">
                                  Amount Paid
                                </span>
                                <span className="font-bold text-[#EAECEF]">
                                  {formatCurrency(payment.finalAmount || payment.amount || 0)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#5E6673] font-medium block">Discount</span>
                                <span className="font-bold text-[#EAECEF]">
                                  {payment.discountPercent || 0}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[#5E6673] font-medium block">
                                  Reference Code
                                </span>
                                <span className="font-bold text-[#EAECEF] truncate block max-w-[150px]">
                                  {payment.externalReference || payment.razorpayPaymentId || 'None'}
                                </span>
                              </div>
                            </div>

                            {payment.activationNotes && (
                              <div className="mt-3 bg-[#1E2329] border border-[#2B3139] rounded-xl p-3 text-xs text-[#848E9C] flex gap-2">
                                <FileText className="h-4 w-4 text-[#F0B90B] shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-[#F0B90B] block mb-0.5">
                                    Audit Note:
                                  </span>
                                  {payment.activationNotes}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center border border-dashed border-[#2B3139] rounded-2xl p-8 text-center text-[#848E9C] bg-white/50">
                          <History className="h-8 w-8 text-[#5E6673] mb-2 opacity-50" />
                          <p className="text-sm font-semibold">No Payments Logged</p>
                          <p className="text-xs text-[#5E6673] mt-1">
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
            <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] text-center p-8 rounded-lg border border-dashed border-[#2B3139]">
              <Building2 className="h-10 w-10 text-[#5E6673] mb-3" />
              <h3 className="text-base font-bold text-[#EAECEF]">No Merchant Selected</h3>
              <p className="mt-2 text-sm text-[#5E6673] max-w-sm">
                Select a wholesaler from the directory to view subscription details.
              </p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

const ACCENTS = {
  yellow: 'bg-[#F0B90B]/10 text-[#F0B90B]',
  blue: 'bg-[#1E9CF1]/10 text-[#1E9CF1]',
  red: 'bg-[#F6465D]/10 text-[#F6465D]',
  green: 'bg-[#0ECB81]/10 text-[#0ECB81]',
};

const HIGHLIGHT_STYLES = {
  success: 'text-[#0ECB81] bg-[#0ECB81]/10 border-[#0ECB81]/20',
  info: 'text-[#1E9CF1] bg-[#1E9CF1]/10 border-[#1E9CF1]/20',
  warning: 'text-[#F0B90B] bg-[#F0B90B]/10 border-[#F0B90B]/20',
  danger: 'text-[#F6465D] bg-[#F6465D]/10 border-[#F6465D]/20',
};

const ACCENT_BORDERS = {
  yellow: 'border-l-[#F0B90B]',
  green: 'border-l-[#0ECB81]',
  blue: 'border-l-[#1E9CF1]',
  purple: 'border-l-[#7B61FF]',
  amber: 'border-l-[#F0B90B]',
  emerald: 'border-l-[#0ECB81]',
  sky: 'border-l-[#1E9CF1]',
  violet: 'border-l-[#7B61FF]',
};

function TopCard({ title, value, icon: Icon, accent }) {
  return (
    <div className="rounded-lg border border-[#2B3139] bg-[#1E2329] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#848E9C]">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[#EAECEF]">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${ACCENTS[accent] || ACCENTS.yellow}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function AdminField({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#848E9C]">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function StateRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-[#12161C] px-3 py-2.5 text-sm">
      <span className="text-[#848E9C]">{label}</span>
      <span
        className={`text-right font-medium truncate max-w-[200px] ${
          highlight
            ? `${HIGHLIGHT_STYLES[highlight]} rounded-md px-2 py-0.5 text-xs border`
            : 'text-[#EAECEF]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function FinancialStat({ label, value, accent }) {
  return (
    <div
      className={`rounded-md bg-[#12161C] p-3 border border-[#2B3139] border-l-2 ${ACCENT_BORDERS[accent] || 'border-l-[#F0B90B]'}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#5E6673]">{label}</p>
      <p className="mt-1.5 text-lg font-bold text-[#EAECEF]">{value}</p>
    </div>
  );
}
