import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../api/axios';

export function getCouponColumns(handleDeleteCoupon) {
  return [
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
  ];
}

export const filters = [
  { value: 'ALL', label: 'All Sellers' },
  { value: 'READY', label: 'Ready' },
  { value: 'PAID', label: 'Paid Active' },
  { value: 'TRIAL', label: 'Trial Active' },
  { value: 'PAST_DUE', label: 'Past Due' },
];

export const generateRandomCouponCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'NEX-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export function useSuperAdminSubscriptions() {
  const [wholesalers, setWholesalers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedWholesalerId, setSelectedWholesalerId] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('overview');
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
  const [couponColumnVisibility, setCouponColumnVisibility] = useState({});
  const [couponRowSelection, setCouponRowSelection] = useState({});

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

  const couponColumns = useMemo(() => getCouponColumns(handleDeleteCoupon), [handleDeleteCoupon]);

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

  return {
    wholesalers,
    plans,
    selectedWholesalerId,
    setSelectedWholesalerId,
    selectedTenant,
    searchValue,
    setSearchValue,
    selectedFilter,
    setSelectedFilter,
    activeTab,
    setActiveTab,
    coupons,
    couponForm,
    setCouponForm,
    isCreatingCoupon,
    isLoading,
    isTenantLoading,
    couponColumnVisibility,
    setCouponColumnVisibility,
    couponRowSelection,
    setCouponRowSelection,
    couponPagination,
    setCouponPagination,
    couponSorting,
    setCouponSorting,
    couponGlobalFilter,
    setCouponGlobalFilter,
    couponColumns,
    filteredWholesalers,
    activeWholesalerId,
    handleCreateCoupon,
    paidActive,
    trialActive,
    pastDue,
    error,
  };
}
