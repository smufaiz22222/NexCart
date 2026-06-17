import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  TrendingUp,
  Truck,
  User,
  Wallet,
  MessageSquare,
  FileText,
  ShieldCheck,
  Building2
} from 'lucide-react';
import {
  useOrders,
  useMyLedger,
  useBuyerCreditStatus,
  useUserRecommendations,
  useRfqs
} from '../api/queries';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const cartTotalItems = useCartStore((state) => state.getTotalItems());

  // Fetch B2B queries
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: ledgerData, isLoading: ledgerLoading } = useMyLedger();
  const { data: creditData, isLoading: creditLoading } = useBuyerCreditStatus();
  const { data: recommendationsData, isLoading: recsLoading } = useUserRecommendations();
  const { data: rfqs = [], isLoading: rfqsLoading } = useRfqs();

  const activeOrders = orders.filter((order) =>
    ['PENDING', 'PROCESSING', 'SHIPPED'].includes(order.status)
  );

  const completedOrders = orders.filter((order) =>
    ['DELIVERED', 'RETURN_COMPLETED'].includes(order.status)
  );

  const totalSpent = completedOrders.reduce(
    (sum, order) => sum + parseFloat(order.totalAmount || 0),
    0
  );

  const latestOrder = orders.length > 0
    ? [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;

  const recommendedItems = recommendationsData?.recommendations || [];
  const ledgerEntries = ledgerData?.entries || [];

  // Active RFQs (Pending and Counter Offered status)
  const activeRfqsCount = rfqs.filter((r) =>
    ['PENDING', 'COUNTER_OFFERED'].includes(r.status)
  ).length;

  const isLoading = ordersLoading || ledgerLoading || creditLoading || recsLoading || rfqsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-[#6b665f]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#161412] border-t-transparent" />
        <p className="text-sm font-bold uppercase tracking-[0.24em]">Syncing business dashboard...</p>
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
    <div className="space-y-8 pb-12 font-sans text-[#161412]">
      {/* 1. Welcome Greeting Banner */}
      <section className="rounded-[28px] border border-[#ddd7cc] bg-white p-8 shadow-[0_12px_40px_rgba(22,20,18,0.02)] relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-50/20 rounded-full -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" /> B2B Business Workspace
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#161412] md:text-4xl">
              Hello, {user?.name || 'Partner'}!
            </h1>
            <p className="mt-2 text-sm text-[#6b665f] max-w-xl">
              Manage wholesaler procurement contracts, check credit lines, and coordinate custom pricing desks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/store"
              className="inline-flex items-center gap-2 rounded-full bg-[#161412] px-6 py-3.5 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-[#34302b] transition-all"
            >
              Order Catalog
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Operational Metrics Grid */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Aggregate Dues */}
        <div className="rounded-[22px] border border-[#ddd7cc] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] hover:border-[#161412]/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-2.5 text-rose-600">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f877b]">
              Total Outstanding
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight text-rose-600">
            ₹{totalOutstanding.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#6b665f]">Aggregate payable balance</p>
        </div>

        {/* Metric 2: Available Credit */}
        <div className="rounded-[22px] border border-[#ddd7cc] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] hover:border-[#161412]/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f877b]">
              Available Credit
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight text-emerald-600">
            ₹{totalAvailable.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#6b665f]">Sum of all supplier credit limits</p>
        </div>

        {/* Metric 3: Active RFQs */}
        <div className="rounded-[22px] border border-[#ddd7cc] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] hover:border-[#161412]/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5 text-amber-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f877b]">
              Pending RFQs
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight text-amber-600">{activeRfqsCount}</p>
          <p className="mt-1 text-xs text-[#6b665f]">Quotes under negotiation</p>
        </div>

        {/* Metric 4: Wholesale Orders */}
        <div className="rounded-[22px] border border-[#ddd7cc] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)] hover:border-[#161412]/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-blue-600">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f877b]">
              Active B2B Orders
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{activeOrders.length}</p>
          <p className="mt-1 text-xs text-[#6b665f]">Orders currently in fulfillment</p>
        </div>
      </section>

      {/* 3. Tracker and Utilities */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Fulfillment Stepper */}
        <div className="rounded-[24px] border border-[#ddd7cc] bg-white p-6 shadow-[0_12px_36px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#f3efe8] pb-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8f877b]">
                  Consignment Tracker
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-[#161412]">
                  {latestOrder ? 'Track Your Latest Consignment' : 'No Active Shipments'}
                </h2>
              </div>
              {latestOrder && (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-[#f8f6f1] text-[#161412] border border-[#ddd7cc]">
                  ID: #{latestOrder.id.slice(0, 8).toUpperCase()}
                </span>
              )}
            </div>

            {latestOrder ? (
              latestOrder.status === 'CANCELLED' ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 text-center">
                  <p className="text-sm font-bold text-rose-700">This order has been cancelled.</p>
                </div>
              ) : (
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 py-4">
                  <div className="absolute left-4 md:left-0 md:top-[18px] w-0.5 md:w-full h-[80%] md:h-0.5 bg-[#ddd7cc] -z-10" />
                  {trackingSteps.map((step, index) => (
                    <div key={step.key} className="flex md:flex-col items-center md:text-center gap-4 md:gap-3 flex-1 relative">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          step.isCompleted
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : step.isActive
                              ? 'bg-white border-[#161412] text-[#161412] font-bold ring-4 ring-[#161412]/5'
                              : 'bg-white border-[#ddd7cc] text-[#8f877b]'
                        }`}
                      >
                        {step.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : step.isActive ? (
                          <Clock className="w-4 h-4 animate-spin text-[#161412]" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${step.isActive ? 'text-[#161412]' : 'text-[#6b665f]'}`}>
                          {step.label}
                        </p>
                        <p className="text-[11px] text-[#8f877b] mt-0.5 max-w-[140px]">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="py-10 text-center text-[#8f877b] flex flex-col items-center justify-center">
                <Package className="w-12 h-12 text-[#ddd7cc] mb-3 stroke-[1.5]" />
                <p className="text-sm font-medium">When you place wholesale orders, they will show up here.</p>
              </div>
            )}
          </div>

          {latestOrder && (
            <div className="mt-6 border-t border-[#f3efe8] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-[#6b665f]">
                <div>
                  <span className="font-bold">Placed:</span>{' '}
                  {new Date(latestOrder.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-bold">Gross Total:</span>{' '}
                  <span className="font-extrabold text-[#161412]">₹{parseFloat(latestOrder.totalAmount).toLocaleString()}</span>
                </div>
              </div>
              <Link
                to="/store/orders"
                className="text-xs font-black uppercase tracking-[0.16em] text-[#161412] border border-[#ddd7cc] hover:bg-[#f8f6f1] px-4 py-2 rounded-full transition-all"
              >
                Inspect Agreement
              </Link>
            </div>
          )}
        </div>

        {/* Quick Utilities */}
        <div className="rounded-[24px] border border-[#ddd7cc] bg-white p-6 shadow-[0_12px_36px_rgba(0,0,0,0.01)] flex flex-col">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8f877b] border-b border-[#f3efe8] pb-4 mb-4">
            B2B Utilities
          </p>
          <div className="grid grid-cols-2 gap-3 flex-1">
            <Link
              to="/store/rfqs"
              className="group p-4 rounded-2xl border border-[#ddd7cc] bg-[#f8f6f1]/50 hover:bg-white hover:border-[#161412] hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between"
            >
              <MessageSquare className="w-5 h-5 text-[#6b665f] group-hover:text-amber-600 transition-colors" />
              <div className="mt-8">
                <p className="text-xs font-black uppercase tracking-wider">Price Desk</p>
                <p className="text-[10px] text-[#8f877b] mt-1">Review RFQ counter offers</p>
              </div>
            </Link>

            <a
              href="#credit-lines"
              className="group p-4 rounded-2xl border border-[#ddd7cc] bg-[#f8f6f1]/50 hover:bg-white hover:border-[#161412] hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between"
            >
              <CreditCard className="w-5 h-5 text-[#6b665f] group-hover:text-emerald-600 transition-colors" />
              <div className="mt-8">
                <p className="text-xs font-black uppercase tracking-wider">Credit Lines</p>
                <p className="text-[10px] text-[#8f877b] mt-1">Check supplier limits</p>
              </div>
            </a>

            <a
              href="#ledger-history"
              className="group p-4 rounded-2xl border border-[#ddd7cc] bg-[#f8f6f1]/50 hover:bg-white hover:border-[#161412] hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between"
            >
              <FileText className="w-5 h-5 text-[#6b665f] group-hover:text-blue-600 transition-colors" />
              <div className="mt-8">
                <p className="text-xs font-black uppercase tracking-wider">Accounting Ledger</p>
                <p className="text-[10px] text-[#8f877b] mt-1">Check invoice payments</p>
              </div>
            </a>

            <Link
              to="/store/b2b-onboarding"
              className="group p-4 rounded-2xl border border-[#ddd7cc] bg-[#f8f6f1]/50 hover:bg-white hover:border-[#161412] hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between"
            >
              <Building2 className="w-5 h-5 text-[#6b665f] group-hover:text-[#161412] transition-colors" />
              <div className="mt-8">
                <p className="text-xs font-black uppercase tracking-wider">Settings</p>
                <p className="text-[10px] text-[#8f877b] mt-1">Manage business info</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Trade Credit Desk */}
      <section id="credit-lines" className="space-y-4 pt-4">
        <h2 className="text-xl font-black tracking-tight text-[#161412]">Wholesaler Trade Credit Lines</h2>
        {creditLines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {creditLines.map((line) => (
              <div
                key={line.wholesalerId}
                className="bg-white border border-[#ddd7cc] hover:border-emerald-500/30 rounded-[22px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-all hover:shadow-[0_12px_28px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[180px]"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#f3efe8] pb-3 mb-4">
                    <h3 className="font-extrabold text-sm text-[#161412] line-clamp-1">{line.wholesalerName}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-100 text-emerald-800">
                      {line.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-[9px] font-bold text-[#8f877b] uppercase tracking-wider">Credit Limit</p>
                      <p className="font-black text-[#161412] mt-1">₹{line.creditLimit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-[#8f877b] uppercase tracking-wider">Outstanding</p>
                      <p className="font-bold text-rose-600 mt-1">₹{line.outstanding.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-[#8f877b] uppercase tracking-wider">Available</p>
                      <p className="font-bold text-emerald-600 mt-1">₹{line.available.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#f3efe8] flex items-center justify-between text-[10px] text-[#8f877b]">
                  <span>Payment terms: net 30</span>
                  <span>Currency: {line.currency}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-[#8f877b] border border-dashed border-[#ddd7cc] rounded-2xl bg-[#f8f6f1]/30">
            <CreditCard className="w-10 h-10 text-[#ddd7cc] mx-auto mb-2" />
            <p className="text-sm font-semibold">No active credit relationships.</p>
            <p className="text-xs text-[#8f877b] mt-1">
              Wholesalers will configure your trade credit limits once you initiate purchase relations.
            </p>
          </div>
        )}
      </section>

      {/* 5. Ledger Statement History */}
      <section id="ledger-history" className="rounded-[28px] border border-[#ddd7cc] bg-white p-6 shadow-[0_12px_36px_rgba(0,0,0,0.01)] pt-6">
        <div className="flex items-center justify-between border-b border-[#f3efe8] pb-4 mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8f877b]">
              B2B Accounting
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-[#161412]">Ledger Statements</h2>
          </div>
          <span className="text-xs text-[#6b665f]">
            Entries: <span className="font-bold text-[#161412]">{ledgerEntries.length}</span>
          </span>
        </div>

        {ledgerEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#ece7de]">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-wider text-[#8f877b]">
                  <th className="pb-3 pt-1">Date</th>
                  <th className="pb-3 pt-1">Wholesaler</th>
                  <th className="pb-3 pt-1">Description</th>
                  <th className="pb-3 pt-1 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece7de]/40 text-sm">
                {ledgerEntries.map((entry) => {
                  const val = parseFloat(entry.amount);
                  const isCredit = val > 0;
                  return (
                    <tr key={entry.id} className="hover:bg-[#f8f6f1]/50 transition-colors">
                      <td className="py-4 font-mono text-xs text-[#6b665f]">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 font-bold">
                        {entry.wholesaler?.businessName || 'System'}
                      </td>
                      <td className="py-4 text-[#6b665f]">{entry.description}</td>
                      <td className="py-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-xs font-bold border ${
                            isCredit
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : 'bg-rose-50 border-rose-100 text-rose-700'
                          }`}
                        >
                          {isCredit ? '+' : ''}
                          {val.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-[#8f877b] border border-dashed border-[#ddd7cc] rounded-2xl bg-[#f8f6f1]/30">
            <Wallet className="w-10 h-10 text-[#ddd7cc] mx-auto mb-2" />
            <p className="text-sm font-semibold">No accounting logs yet.</p>
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          <h2 className="text-xl font-black text-[#161412] tracking-tight">Wholesale Recommendations</h2>
        </div>

        {recsLoading ? (
          <div className="flex h-40 items-center justify-center text-zinc-400">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#161412] border-t-transparent" />
          </div>
        ) : recommendedItems.length > 0 ? (
          <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-300">
            {recommendedItems.map((item) => {
              const product = item.product;
              const reason = item.reasons?.[0] || 'Popular choice';

              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/store/product/${product.id}`)}
                  className="min-w-[240px] max-w-[240px] bg-white rounded-3xl border border-[#ddd7cc] p-4 hover:border-[#161412] hover:shadow-[0_12px_30px_rgba(22,20,18,0.04)] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="h-40 w-full bg-[#f8f6f1] rounded-2xl flex items-center justify-center overflow-hidden border border-[#ddd7cc]/40">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain mix-blend-multiply p-2 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-[#8b857c] stroke-[1.5]" />
                      )}
                    </div>
                    <div className="mt-3">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8f877b]">
                        {product.category}
                      </span>
                      <h4 className="font-bold text-sm text-[#161412] line-clamp-1 mt-0.5">
                        {product.name}
                      </h4>
                      <p className="mt-2 text-base font-extrabold text-[#161412]">
                        ₹{product.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[#f3efe8] pt-2">
                    <p className="text-[10px] text-amber-600 font-semibold italic flex items-center gap-1 line-clamp-1">
                      ✨ {reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-[#8f877b] border border-dashed border-[#ddd7cc] rounded-2xl bg-[#f8f6f1]/30">
            <Sparkles className="w-10 h-10 text-[#ddd7cc] mx-auto mb-2" />
            <p className="text-sm font-semibold">No recommendations today.</p>
          </div>
        )}
      </section>
    </div>
  );
}
