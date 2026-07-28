import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrders, useMyLedger, useUserRecommendations, useRfqs } from '../api/queries';
import useAuthStore from '../store/authStore';
import useB2BCartStore from '../store/b2bCartStore';
import {
  BusinessDisclaimerBanner,
  BusinessWelcomeBanner,
  BusinessMetricsGrid,
  BusinessConsignmentTracker,
  BusinessUtilitiesPanel,
  BusinessLedgerSection,
  BusinessRecommendationsSection,
} from '../components/dashboard/BusinessDashboardComponents';

const getStepperStatus = (status) => {
  const steps = [
    { key: 'PENDING', label: 'Order Placed', desc: 'Awaiting wholesaler acceptance' },
    { key: 'PROCESSING', label: 'Processing', desc: 'Packing & inspection' },
    { key: 'SHIPPED', label: 'In Transit', desc: 'Dispatched with logistics' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Settled to financial ledger' },
  ];

  const statusIndexMap = {
    PENDING: 0,
    PROCESSING: 1,
    SHIPPED: 2,
    DELIVERED: 3,
    RETURN_COMPLETED: 3,
    CANCELLED: -1,
  };

  const currentIndex = statusIndexMap[status] ?? 0;

  return steps.map((step, idx) => ({
    ...step,
    isCompleted: idx < currentIndex,
    isActive: idx === currentIndex,
    isPending: idx > currentIndex,
  }));
};

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const b2bCartItems = useB2BCartStore((state) => state.totals.itemCount);

  // Fetch B2B queries
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: ledgerData, isLoading: ledgerLoading } = useMyLedger();
  const { data: recommendationsData, isLoading: recsLoading } = useUserRecommendations();
  const { data: rfqs = [], isLoading: rfqsLoading } = useRfqs();

  // Filter standard customer orders
  const activeOrders = useMemo(
    () => orders.filter((order) => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(order.status)),
    [orders]
  );

  const latestOrder = useMemo(
    () =>
      orders.length > 0
        ? orders.toSorted((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        : null,
    [orders]
  );

  const recommendedItems = recommendationsData?.recommendations || [];
  const ledgerEntries = ledgerData?.entries || [];

  // Active RFQs (Pending and Counter Offered status)
  const activeRfqsCount = useMemo(
    () => rfqs.filter((r) => ['PENDING', 'COUNTER_OFFERED'].includes(r.status)).length,
    [rfqs]
  );

  const isLoading = ordersLoading || ledgerLoading || recsLoading || rfqsLoading;

  const [searchParams, setSearchParams] = useSearchParams();

  // Controlled states for table visibility & selection
  const [ledgerColumnVisibility, setLedgerColumnVisibility] = useState({});
  const [ledgerRowSelection, setLedgerRowSelection] = useState({});

  // Table state derivation
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;
  const pagination = useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize,
    }),
    [page, pageSize]
  );

  const sortParam = searchParams.get('sort') || 'createdAt:desc';
  const sorting = useMemo(() => {
    const [id, order] = sortParam.split(':');
    if (!id) return [];
    return [{ id, desc: order === 'desc' }];
  }, [sortParam]);

  const globalFilter = searchParams.get('q') || '';

  // Synchronizers
  const setPagination = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    const nextParams = new URLSearchParams(searchParams);
    const newPage = String(next.pageIndex + 1);
    const newPageSize = String(next.pageSize);
    if (searchParams.get('page') !== newPage || searchParams.get('pageSize') !== newPageSize) {
      nextParams.set('page', newPage);
      nextParams.set('pageSize', newPageSize);
      setSearchParams(nextParams, { replace: true });
    }
  };

  const setSorting = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const nextParams = new URLSearchParams(searchParams);
    if (next && next.length > 0) {
      nextParams.set('sort', `${next[0].id}:${next[0].desc ? 'desc' : 'asc'}`);
    } else {
      nextParams.delete('sort');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const setGlobalFilter = (updater) => {
    const next = typeof updater === 'function' ? updater(globalFilter) : updater;
    const nextParams = new URLSearchParams(searchParams);
    if (next) {
      nextParams.set('q', next);
      nextParams.set('page', '1');
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const ledgerColumns = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-[#6C757D]">
            {new Date(getValue()).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'wholesaler',
        accessorFn: (row) => row.wholesaler?.businessName,
        header: 'Wholesaler',
        cell: ({ row }) => (
          <span className="font-bold text-[#16171a]">
            {row.original.wholesaler?.businessName || 'System'}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ getValue }) => <span className="text-[#6C757D]">{getValue()}</span>,
      },
      {
        accessorKey: 'amount',
        header: 'Amount (₹)',
        cell: ({ getValue }) => {
          const val = parseFloat(getValue());
          const isCredit = val > 0;
          return (
            <span
              className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${
                isCredit
                  ? 'bg-[#EFEFEF] border-[#C0C0C0] text-emerald-800'
                  : 'bg-[#EFEFEF] border-[#C0C0C0] text-[#8B0000]'
              }`}
            >
              {isCredit ? '+' : ''}
              {val.toFixed(2)}
            </span>
          );
        },
        meta: {
          className: 'text-right',
        },
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-8 pb-12 animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-44 bg-[#EFEFEF] rounded-lg border border-[#C0C0C0]" />
        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-32 bg-[#EFEFEF] rounded-lg border border-[#C0C0C0]" />
          <div className="h-32 bg-[#EFEFEF] rounded-lg border border-[#C0C0C0]" />
          <div className="h-32 bg-[#EFEFEF] rounded-lg border border-[#C0C0C0]" />
          <div className="h-32 bg-[#EFEFEF] rounded-lg border border-[#C0C0C0]" />
        </div>
        {/* Split Section Skeleton */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="h-64 bg-[#EFEFEF] rounded-lg border border-[#C0C0C0]" />
          <div className="h-64 bg-[#EFEFEF] rounded-lg border border-[#C0C0C0]" />
        </div>
      </div>
    );
  }

  const trackingSteps = latestOrder ? getStepperStatus(latestOrder.status) : [];

  return (
    <div className="space-y-8 pb-12 text-[#16171a] font-sans">
      <BusinessDisclaimerBanner />

      <BusinessWelcomeBanner user={user} />

      <BusinessMetricsGrid
        activeRfqsCount={activeRfqsCount}
        activeOrdersCount={activeOrders.length}
        b2bCartItems={b2bCartItems}
        totalOrdersCount={orders.length}
      />

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <BusinessConsignmentTracker latestOrder={latestOrder} trackingSteps={trackingSteps} />

        <BusinessUtilitiesPanel />
      </section>

      <BusinessLedgerSection
        ledgerEntries={ledgerEntries}
        ledgerColumns={ledgerColumns}
        sorting={sorting}
        setSorting={setSorting}
        pagination={pagination}
        setPagination={setPagination}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        ledgerColumnVisibility={ledgerColumnVisibility}
        setLedgerColumnVisibility={setLedgerColumnVisibility}
        ledgerRowSelection={ledgerRowSelection}
        setLedgerRowSelection={setLedgerRowSelection}
      />

      <BusinessRecommendationsSection
        recsLoading={recsLoading}
        recommendedItems={recommendedItems}
        navigate={navigate}
      />
    </div>
  );
}
