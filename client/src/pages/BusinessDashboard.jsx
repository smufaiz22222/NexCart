import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DataTable from '../components/DataTable';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  Wallet,
  MessageSquare,
  FileText,
  ShieldCheck,
  Building2,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useOrders,
  useMyLedger,
  useBuyerCreditStatus,
  useUserRecommendations,
  useRfqs,
} from '../api/queries';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const _cartTotalItems = useCartStore((state) => state.getTotalItems());

  // Fetch B2B queries
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: ledgerData, isLoading: ledgerLoading } = useMyLedger();
  const { data: creditData, isLoading: creditLoading } = useBuyerCreditStatus();
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
        ? [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
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

  const isLoading = ordersLoading || ledgerLoading || creditLoading || recsLoading || rfqsLoading;

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
    nextParams.set('page', String(next.pageIndex + 1));
    nextParams.set('pageSize', String(next.pageSize));
    setSearchParams(nextParams, { replace: true });
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

  const creditLines = creditData?.creditLines || [];
  const totalOutstanding = creditData?.totalOutstanding || 0;
  const totalAvailable = creditData?.totalAvailable || 0;

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

  const trackingSteps = latestOrder ? getStepperStatus(latestOrder.status) : [];

  return (
    <div className="space-y-8 pb-12 text-[#16171a] font-sans">
      {/* Welcome Greeting Banner */}
      <section className="swiss-panel p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium bg-[#EFEFEF] text-[#0047AB] border border-[#C0C0C0] uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> B2B Business Workspace
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#16171a] md:text-4xl">
              Hello, {user?.name || 'Partner'}!
            </h1>
            <p className="mt-2 text-sm text-[#6C757D] max-w-xl">
              Manage wholesaler procurement contracts, check credit lines, and coordinate custom
              pricing desks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/store"
              className="inline-flex items-center gap-2 rounded-md bg-[#0047AB] hover:bg-[#003B91] text-white px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Order Catalog
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Operational Metrics Grid */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Aggregate Dues */}
        <div className="swiss-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-[#C0C0C0] bg-[#EFEFEF] p-2.5 text-[#8B0000]">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C757D]">
              Total Outstanding
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold font-mono text-[#8B0000] tracking-tight">
              {formatCurrency(totalOutstanding)}
            </p>
            <p className="mt-1 text-xs text-[#6C757D]">Aggregate payable balance</p>
          </div>
        </div>

        {/* Metric 2: Available Credit */}
        <div className="swiss-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-[#C0C0C0] bg-[#EFEFEF] p-2.5 text-emerald-800">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C757D]">
              Available Credit
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold font-mono text-emerald-800 tracking-tight">
              {formatCurrency(totalAvailable)}
            </p>
            <p className="mt-1 text-xs text-[#6C757D]">Sum of all supplier credit limits</p>
          </div>
        </div>

        {/* Metric 3: Active RFQs */}
        <div className="swiss-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-[#C0C0C0] bg-[#EFEFEF] p-2.5 text-[#0047AB]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C757D]">
              Pending RFQs
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold font-mono text-[#0047AB] tracking-tight">
              {activeRfqsCount}
            </p>
            <p className="mt-1 text-xs text-[#6C757D]">Quotes under negotiation</p>
          </div>
        </div>

        {/* Metric 4: Wholesale Orders */}
        <div className="swiss-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-[#C0C0C0] bg-[#EFEFEF] p-2.5 text-[#16171a]">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6C757D]">
              Active B2B Orders
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold font-mono text-[#16171a] tracking-tight">
              {activeOrders.length}
            </p>
            <p className="mt-1 text-xs text-[#6C757D]">Orders currently in fulfillment</p>
          </div>
        </div>
      </section>

      {/* Tracker and Utilities */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Fulfillment Stepper */}
        <div className="swiss-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#C0C0C0] pb-4 mb-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6C757D]">
                  Consignment Tracker
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#16171a]">
                  {latestOrder ? 'Track Your Latest Consignment' : 'No Active Shipments'}
                </h2>
              </div>
              {latestOrder && (
                <span className="px-3 py-1 rounded-md text-xs font-mono font-semibold bg-[#EFEFEF] text-[#16171a] border border-[#C0C0C0]">
                  ID: #{latestOrder.id.slice(0, 8).toUpperCase()}
                </span>
              )}
            </div>

            {latestOrder ? (
              latestOrder.status === 'CANCELLED' ? (
                <div className="rounded-md border border-[#8B0000] bg-[#EFEFEF] p-6 text-center">
                  <p className="text-sm font-bold text-[#8B0000]">This order has been cancelled.</p>
                </div>
              ) : (
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 py-4">
                  <div className="absolute left-4 md:left-0 md:top-[18px] w-0.5 md:w-full h-[80%] md:h-0.5 bg-[#C0C0C0] -z-10" />
                  {trackingSteps.map((step, index) => (
                    <div
                      key={step.key}
                      className="flex md:flex-col items-center md:text-center gap-4 md:gap-3 flex-1 relative"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          step.isCompleted
                            ? 'bg-[#0047AB] border-[#0047AB] text-white'
                            : step.isActive
                              ? 'bg-white border-[#0047AB] text-[#0047AB] font-bold ring-4 ring-[#0047AB]/5'
                              : 'bg-white border-[#C0C0C0] text-[#6C757D]'
                        }`}
                      >
                        {step.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : step.isActive ? (
                          <Clock className="w-4 h-4 animate-spin text-[#0047AB]" />
                        ) : (
                          <span className="text-xs font-bold font-mono">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold ${step.isActive ? 'text-[#0047AB]' : 'text-[#16171a]'}`}
                        >
                          {step.label}
                        </p>
                        <p className="text-[11px] text-[#6C757D] mt-0.5 max-w-[140px]">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="py-10 text-center text-[#6C757D] flex flex-col items-center justify-center">
                <Package className="w-12 h-12 text-[#C0C0C0] mb-3 stroke-[1.5]" />
                <p className="text-sm font-medium">
                  When you place wholesale orders, they will show up here.
                </p>
              </div>
            )}
          </div>

          {latestOrder && (
            <div className="mt-6 border-t border-[#C0C0C0] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-[#6C757D]">
                <div>
                  <span className="font-semibold">Placed:</span>{' '}
                  <span className="font-mono">
                    {new Date(latestOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Gross Total:</span>{' '}
                  <span className="font-bold font-mono text-[#16171a]">
                    {formatCurrency(latestOrder.totalAmount)}
                  </span>
                </div>
              </div>
              <Link
                to="/store/orders"
                className="text-xs font-semibold uppercase tracking-wider text-[#16171a] hover:text-[#0047AB] border border-[#C0C0C0] hover:bg-[#EFEFEF] px-4 py-2 rounded-md transition-all"
              >
                Inspect Agreement
              </Link>
            </div>
          )}
        </div>

        {/* B2B Utilities */}
        <div className="swiss-panel p-6 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6C757D] border-b border-[#C0C0C0] pb-4 mb-4">
            B2B Utilities
          </p>
          <div className="grid grid-cols-2 gap-3 flex-1">
            <Link
              to="/store/rfqs"
              className="group p-4 rounded-md border border-[#C0C0C0] bg-[#EFEFEF]/50 hover:bg-white hover:border-[#0047AB] transition-colors flex flex-col justify-between"
            >
              <MessageSquare className="w-5 h-5 text-[#6C757D] group-hover:text-[#0047AB] transition-colors" />
              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#16171a]">
                  Price Desk
                </p>
                <p className="text-[10px] text-[#6C757D] mt-1">Review RFQ counter offers</p>
              </div>
            </Link>

            <a
              href="#credit-lines"
              className="group p-4 rounded-md border border-[#C0C0C0] bg-[#EFEFEF]/50 hover:bg-white hover:border-[#0047AB] transition-colors flex flex-col justify-between"
            >
              <CreditCard className="w-5 h-5 text-[#6C757D] group-hover:text-emerald-800 transition-colors" />
              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#16171a]">
                  Credit Lines
                </p>
                <p className="text-[10px] text-[#6C757D] mt-1">Check supplier limits</p>
              </div>
            </a>

            <a
              href="#ledger-history"
              className="group p-4 rounded-md border border-[#C0C0C0] bg-[#EFEFEF]/50 hover:bg-white hover:border-[#0047AB] transition-colors flex flex-col justify-between"
            >
              <FileText className="w-5 h-5 text-[#6C757D] group-hover:text-[#0047AB] transition-colors" />
              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#16171a]">
                  Accounting Ledger
                </p>
                <p className="text-[10px] text-[#6C757D] mt-1">Check invoice payments</p>
              </div>
            </a>

            <Link
              to="/store/b2b-onboarding"
              className="group p-4 rounded-md border border-[#C0C0C0] bg-[#EFEFEF]/50 hover:bg-white hover:border-[#0047AB] transition-colors flex flex-col justify-between"
            >
              <Building2 className="w-5 h-5 text-[#6C757D] group-hover:text-[#16171a] transition-colors" />
              <div className="mt-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#16171a]">
                  Settings
                </p>
                <p className="text-[10px] text-[#6C757D] mt-1">Manage business info</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Trade Credit Desk */}
      <section id="credit-lines" className="space-y-4 pt-4">
        <h2 className="text-xl font-bold tracking-tight text-[#16171a]">
          Wholesaler Trade Credit Lines
        </h2>
        {creditLines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {creditLines.map((line) => (
              <div
                key={line.wholesalerId}
                className="swiss-panel p-6 flex flex-col justify-between min-h-[180px]"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#C0C0C0] pb-3 mb-4">
                    <h3 className="font-bold text-sm text-[#16171a] line-clamp-1">
                      {line.wholesalerName}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-[#EFEFEF] border border-[#C0C0C0] text-[#0047AB]">
                      {line.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-[9px] font-semibold text-[#6C757D] uppercase tracking-wider">
                        Credit Limit
                      </p>
                      <p className="font-bold font-mono text-[#16171a] mt-1">
                        {formatCurrency(line.creditLimit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-[#6C757D] uppercase tracking-wider">
                        Outstanding
                      </p>
                      <p className="font-bold font-mono text-[#8B0000] mt-1">
                        {formatCurrency(line.outstanding)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-[#6C757D] uppercase tracking-wider">
                        Available
                      </p>
                      <p className="font-bold font-mono text-emerald-800 mt-1">
                        {formatCurrency(line.available)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#C0C0C0] flex items-center justify-between text-[10px] text-[#6C757D]">
                  <span>Payment terms: Net 30</span>
                  <span className="font-mono">Currency: {line.currency}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-[#6C757D] border border-dashed border-[#C0C0C0] rounded-md bg-white">
            <CreditCard className="w-10 h-10 text-[#C0C0C0] mx-auto mb-2" />
            <p className="text-sm font-semibold">No active credit relationships.</p>
            <p className="text-xs text-[#6C757D] mt-1">
              Wholesalers will configure your trade credit limits once you initiate purchase
              relations.
            </p>
          </div>
        )}
      </section>

      {/* Ledger Statement History */}
      <section id="ledger-history" className="swiss-panel p-6 pt-6">
        <div className="flex items-center justify-between border-b border-[#C0C0C0] pb-4 mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6C757D]">
              B2B Accounting
            </p>
            <h2 className="mt-1 text-lg font-bold text-[#16171a]">Ledger Statements</h2>
          </div>
          <span className="text-xs text-[#6C757D] font-mono">
            Entries: <span className="font-bold text-[#16171a]">{ledgerEntries.length}</span>
          </span>
        </div>

        {ledgerEntries.length > 0 ? (
          <DataTable
            columns={ledgerColumns}
            data={ledgerEntries}
            isLoading={false}
            sorting={sorting}
            setSorting={setSorting}
            pagination={pagination}
            setPagination={setPagination}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            columnVisibility={ledgerColumnVisibility}
            setColumnVisibility={setLedgerColumnVisibility}
            rowSelection={ledgerRowSelection}
            setRowSelection={setLedgerRowSelection}
            searchPlaceholder="Search wholesaler or description..."
            emptyStateMessage="No matching ledger entries found."
          />
        ) : (
          <div className="py-12 text-center text-[#6C757D] border border-dashed border-[#C0C0C0] rounded-md bg-white">
            <Wallet className="w-10 h-10 text-[#C0C0C0] mx-auto mb-2" />
            <p className="text-sm font-semibold">No accounting logs yet.</p>
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#0047AB]" />
          <h2 className="text-xl font-bold text-[#16171a] tracking-tight">
            Wholesale Recommendations
          </h2>
        </div>

        {recsLoading ? (
          <div className="flex h-40 items-center justify-center text-[#6C757D]">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-md bg-[#EFEFEF] h-10 w-10"></div>
              <div className="flex-1 space-y-6 py-1">
                <div className="h-2 bg-[#EFEFEF] rounded"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-2 bg-[#EFEFEF] rounded col-span-2"></div>
                    <div className="h-2 bg-[#EFEFEF] rounded col-span-1"></div>
                  </div>
                  <div className="h-2 bg-[#EFEFEF] rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ) : recommendedItems.length > 0 ? (
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
            {recommendedItems.map((item) => {
              const product = item.product;
              const reason = item.reasons?.[0] || 'Popular choice';

              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/store/product/${product.id}`)}
                  className="min-w-[240px] max-w-[240px] swiss-card p-4 hover:border-[#0047AB] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="h-40 w-full bg-[#EFEFEF] rounded-md flex items-center justify-center overflow-hidden border border-[#C0C0C0]/40">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain p-2 group-hover:scale-102 transition-transform duration-300"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-[#6C757D] stroke-[1.5]" />
                      )}
                    </div>
                    <div className="mt-3">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#6C757D]">
                        {product.category}
                      </span>
                      <h4 className="font-bold text-sm text-[#16171a] line-clamp-1 mt-0.5">
                        {product.name}
                      </h4>
                      <p className="mt-2 text-base font-bold font-mono text-[#0047AB]">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[#C0C0C0] pt-2">
                    <p className="text-[10px] text-[#6C757D] font-semibold flex items-center gap-1 line-clamp-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#0047AB]" /> {reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-[#6C757D] border border-dashed border-[#C0C0C0] rounded-md bg-white">
            <Sparkles className="w-10 h-10 text-[#C0C0C0] mx-auto mb-2" />
            <p className="text-sm font-semibold">No recommendations today.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
