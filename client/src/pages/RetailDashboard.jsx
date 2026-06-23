import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Package,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Truck,
  User,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Activity,
  Award,
  DollarSign,
  PieChart,
  CornerDownRight,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { useOrders, useUserRecommendations } from '../api/queries';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function RetailDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const cartTotalItems = useCartStore((state) => state.getTotalItems());

  // Local state for interactive components
  const [isOrderItemsExpanded, setIsOrderItemsExpanded] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Fetch standard B2C queries
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: recommendationsData, isLoading: recsLoading } = useUserRecommendations();

  // Filter standard customer orders
  const activeOrders = useMemo(
    () => orders.filter((order) => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(order.status)),
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter((order) => ['DELIVERED', 'RETURN_COMPLETED'].includes(order.status)),
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

  // Loyalty Tier Computation
  const completedCount = completedOrders.length;
  const loyaltyTier = useMemo(() => {
    if (completedCount >= 8) {
      return {
        name: 'Gold VIP Member',
        badgeClass: 'bg-[#eef2ff] text-[#4f46e5] border border-[#c7d2fe]',
        perk: '10% member cashback & priority shipping active',
      };
    }
    if (completedCount >= 4) {
      return {
        name: 'Silver Elite Member',
        badgeClass: 'bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]',
        perk: '5% store-wide discount active',
      };
    }
    if (completedCount >= 1) {
      return {
        name: 'Bronze Member',
        badgeClass: 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]',
        perk: 'Standard wholesale tier eligibility',
      };
    }
    return {
      name: 'Retail Member',
      badgeClass: 'bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]',
      perk: 'Start shopping to unlock reward tiers',
    };
  }, [completedCount]);

  // Spending Analytics calculations
  const totalSpent = useMemo(() => {
    return completedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0);
  }, [completedOrders]);

  const categorySplit = useMemo(() => {
    const counts = {};
    orders.forEach((order) => {
      if (order.status !== 'CANCELLED') {
        order.items?.forEach((item) => {
          const category = item.product?.category || 'General';
          const subtotal = parseFloat(item.subtotalAtPurchase || item.price * item.quantity || 0);
          counts[category] = (counts[category] || 0) + subtotal;
        });
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3); // top 3
  }, [orders]);

  const monthlySpendData = useMemo(() => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const now = new Date();
    const result = [];

    // Create list of past 6 months chronologically
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      result.push({ key, label: key, amount: 0 });
    }

    orders.forEach((order) => {
      if (['DELIVERED', 'SHIPPED', 'PROCESSING', 'RETURN_COMPLETED'].includes(order.status)) {
        const date = new Date(order.createdAt);
        const key = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
        const index = result.findIndex((item) => item.key === key);
        if (index !== -1) {
          result[index].amount += parseFloat(order.totalAmount || 0);
        }
      }
    });

    const maxAmount = Math.max(...result.map((r) => r.amount), 1000); // minimum scale is 1000
    return result.map((r) => ({
      ...r,
      heightPercent: Math.min(Math.round((r.amount / maxAmount) * 100), 100),
    }));
  }, [orders]);

  // Recent Activity Feed
  const recentActivities = useMemo(() => {
    const activities = [];
    orders.forEach((order) => {
      const originalAmount =
        order.items?.reduce(
          (sum, item) =>
            sum + parseFloat(item.subtotalAtPurchase || item.price * item.quantity || 0),
          0
        ) || order.totalAmount;

      activities.push({
        id: `place-${order.id}`,
        timestamp: new Date(order.createdAt),
        title: 'Order Initiated',
        description: `Placed order #${order.id.slice(0, 8).toUpperCase()} for ${formatCurrency(originalAmount)}`,
        badgeColor: 'bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]',
      });
      if (['SHIPPED', 'DELIVERED', 'RETURN_COMPLETED'].includes(order.status)) {
        activities.push({
          id: `ship-${order.id}`,
          timestamp: new Date(order.updatedAt || order.createdAt),
          title: 'Parcel Dispatched',
          description: `Consignment ID #${order.id.slice(0, 8).toUpperCase()} left shipment facility.`,
          badgeColor: 'bg-[#eef2ff] text-[#4f46e5] border border-[#c7d2fe]',
        });
      }
      if (['DELIVERED', 'RETURN_COMPLETED'].includes(order.status)) {
        activities.push({
          id: `deliver-${order.id}`,
          timestamp: new Date(order.updatedAt || order.createdAt),
          title: 'Package Handed Over',
          description: `Order #${order.id.slice(0, 8).toUpperCase()} signed and verified.`,
          badgeColor: 'bg-[#f0fdf4] text-emerald-800 border border-[#bbf7d0]',
        });
      }
      if (order.status === 'CANCELLED') {
        activities.push({
          id: `cancel-${order.id}`,
          timestamp: new Date(order.updatedAt || order.createdAt),
          title: 'Order Retracted',
          description: `Order #${order.id.slice(0, 8).toUpperCase()} has been cancelled.`,
          badgeColor: 'bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]',
        });
      }
    });

    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);
  }, [orders]);

  // Support FAQs
  const faqs = [
    {
      q: 'How do I request a return or a refund?',
      a: 'Go to your Orders panel, select the specific item in your purchase history, and click "Request Return". Fill in the reason and return quantity.',
    },
    {
      q: 'How long does shipment and delivery take?',
      a: 'Processing takes 24-48 hours. Transit time ranges from 3 to 5 business days depending on your postal code location.',
    },
    {
      q: 'How do I upgrade to B2B Wholesale status?',
      a: 'Click on the "Join B2B Wholesale" banner at the top of the dashboard and submit your company GST details and verification info.',
    },
  ];

  const getStepperStatus = (status) => {
    const steps = [
      { key: 'PENDING', label: 'Order Placed', desc: 'Awaiting seller acceptance' },
      { key: 'PROCESSING', label: 'Processing', desc: 'Packing & inspection' },
      { key: 'SHIPPED', label: 'In Transit', desc: 'Dispatched with logistics' },
      { key: 'DELIVERED', label: 'Delivered', desc: 'Receipt confirmed' },
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
  const latestOrderItems = latestOrder?.items || [];

  if (ordersLoading) {
    return (
      <div className="space-y-8 pb-12 animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-44 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]" />
        {/* Banner 2 Skeleton */}
        <div className="h-24 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]" />
        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="h-32 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]" />
          <div className="h-32 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]" />
          <div className="h-32 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]" />
        </div>
        {/* Split Section Skeleton */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="h-64 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]" />
          <div className="h-64 bg-[#f1f5f9] rounded-lg border border-[#e2e8f0]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 text-[#1e293b] font-sans">
      {/* Greeting Banner */}
      <section className="swiss-panel p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium bg-[#f1f5f9] text-[#4f46e5] border border-[#e2e8f0] uppercase tracking-wider">
                <User className="w-3.5 h-3.5" /> Retail Account Workspace
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium ${loyaltyTier.badgeClass} uppercase tracking-wider`}
              >
                <Award className="w-3.5 h-3.5" /> {loyaltyTier.name}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#1e293b] md:text-4xl">
              Hello, {user?.name || 'Customer'}!
            </h1>
            <p className="mt-2 text-sm text-[#64748b] max-w-xl">
              {loyaltyTier.perk}. Review your shopping history, track active packages, or browse
              tailored recommendation grids.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/store"
              className="inline-flex items-center gap-2 rounded-md bg-[#4f46e5] hover:bg-[#4338ca] text-white px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Start Shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/store/dashboard/orders"
          className="swiss-card p-4 flex flex-col items-center gap-2 text-center hover:border-[#4f46e5] transition-colors group"
        >
          <Package className="w-6 h-6 text-[#64748b] group-hover:text-[#4f46e5] transition-colors" />
          <span className="text-xs font-bold text-[#1e293b]">Order History</span>
        </Link>
        <Link
          to="/store/buy-again"
          className="swiss-card p-4 flex flex-col items-center gap-2 text-center hover:border-[#4f46e5] transition-colors group"
        >
          <CornerDownRight className="w-6 h-6 text-[#64748b] group-hover:text-[#4f46e5] transition-colors" />
          <span className="text-xs font-bold text-[#1e293b]">Buy Again</span>
        </Link>
        <Link
          to="/store/profile"
          className="swiss-card p-4 flex flex-col items-center gap-2 text-center hover:border-[#4f46e5] transition-colors group"
        >
          <User className="w-6 h-6 text-[#64748b] group-hover:text-[#4f46e5] transition-colors" />
          <span className="text-xs font-bold text-[#1e293b]">Your Profile</span>
        </Link>
        <Link
          to="/store/cart"
          className="swiss-card p-4 flex flex-col items-center gap-2 text-center hover:border-[#4f46e5] transition-colors group"
        >
          <ShoppingBag className="w-6 h-6 text-[#64748b] group-hover:text-[#4f46e5] transition-colors" />
          <span className="text-xs font-bold text-[#1e293b]">Shopping Cart</span>
        </Link>
      </section>

      {/* Metrics Grid */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="swiss-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-[#e2e8f0] bg-[#f1f5f9] p-2 text-[#64748b]">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
              Total Orders
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold font-mono text-[#1e293b] tracking-tight">
              {orders.length}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">Total lifetime checkouts</p>
          </div>
        </div>

        <div className="swiss-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-[#e2e8f0] bg-[#f1f5f9] p-2 text-[#4f46e5]">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
              Active Deliveries
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold font-mono text-[#1e293b] tracking-tight">
              {activeOrders.length}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">Packages in transit</p>
          </div>
        </div>

        <div className="swiss-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-[#e2e8f0] bg-[#f1f5f9] p-2 text-[#4f46e5]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
              Cart Status
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold font-mono text-[#1e293b] tracking-tight">
              {cartTotalItems}{' '}
              <span className="text-sm font-sans font-normal text-[#64748b]">items</span>
            </p>
            <p className="mt-1 text-xs text-[#64748b]">Waiting in shopping basket</p>
          </div>
        </div>

        <div className="swiss-card p-6 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <div className="rounded-md border border-[#e2e8f0] bg-[#f1f5f9] p-2 text-emerald-800">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
              Total Volume
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold font-mono text-emerald-800 tracking-tight">
              {formatCurrency(totalSpent)}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">Net delivered investment</p>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Spending Trends bar graph */}
        <div className="swiss-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-4 mb-6">
              <TrendingUp className="w-5 h-5 text-[#4f46e5]" />
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                  Procurement Velocity
                </span>
                <h3 className="text-lg font-bold text-[#1e293b]">Monthly Spend (Past 6 Months)</h3>
              </div>
            </div>
            {orders.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-[#64748b]">
                <Activity className="w-10 h-10 mb-2 opacity-35" />
                <p className="text-sm">No spend statistics to plot yet</p>
              </div>
            ) : (
              <div className="flex items-end justify-between h-44 px-2 pt-4 border-b border-[#e2e8f0]">
                {monthlySpendData.map((data, index) => (
                  <div key={index} className="flex flex-col items-center flex-1 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute mb-20 bg-[#1e293b] text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md font-mono z-20">
                      ₹{data.amount.toLocaleString()}
                    </div>
                    {/* Vertical Bar */}
                    <div
                      style={{ height: `${Math.max(data.heightPercent, 5)}%` }}
                      className={`w-8 rounded-t-sm transition-all duration-300 cursor-pointer group-hover:scale-x-105 ${
                        data.amount > 0 ? 'bg-[#4f46e5] hover:bg-[#4338ca]' : 'bg-[#f1f5f9]'
                      }`}
                    />
                    <span className="text-[9px] font-medium font-mono text-[#64748b] mt-2 tracking-tighter">
                      {data.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-4 text-[10px] text-[#64748b] flex items-center justify-between">
            <span>Chart values display aggregate order amounts</span>
            <span className="font-bold font-mono text-[#1e293b]">INR (₹) Scale</span>
          </div>
        </div>

        {/* Category Split progress bars */}
        <div className="swiss-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-4 mb-6">
              <PieChart className="w-5 h-5 text-[#4f46e5]" />
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                  Style Breakdown
                </span>
                <h3 className="text-lg font-bold text-[#1e293b]">Top Categories Shopped</h3>
              </div>
            </div>
            {categorySplit.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-[#64748b]">
                <ShoppingBag className="w-10 h-10 mb-2 opacity-35" />
                <p className="text-sm">Categories will display as you shop</p>
              </div>
            ) : (
              <div className="space-y-4 py-1">
                {categorySplit.map((split, index) => {
                  const barColors = ['bg-[#4f46e5]', 'bg-[#64748b]', 'bg-[#1e293b]'];
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1e293b]" />
                          {split.category}
                        </span>
                        <span className="text-[#64748b] font-mono">
                          {split.percentage}% ({formatCurrency(split.amount)})
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#f1f5f9] rounded-md overflow-hidden border border-[#e2e8f0]/40">
                        <div
                          style={{ width: `${split.percentage}%` }}
                          className={`h-full rounded-md transition-all duration-500 ${barColors[index % barColors.length]}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-[#e2e8f0] text-[10px] text-[#64748b] flex items-center justify-between">
            <span>Derived from lifetime non-cancelled orders</span>
            <span className="font-semibold text-[#4f46e5] flex items-center gap-1">
              Structured category mix
            </span>
          </div>
        </div>
      </section>

      {/* Tracker / Order Details and Quick Menu */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="swiss-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4 mb-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b]">
                  Fulfillment Tracker
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#1e293b]">
                  {latestOrder ? 'Track Your Latest Order' : 'No Active Shipments'}
                </h2>
              </div>
              {latestOrder && (
                <span className="px-3 py-1 rounded-md text-xs font-mono font-semibold bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]">
                  ID: #{latestOrder.id.slice(0, 8).toUpperCase()}
                </span>
              )}
            </div>

            {latestOrder ? (
              latestOrder.status === 'CANCELLED' ? (
                <div className="rounded-md border border-[#dc2626] bg-[#f1f5f9] p-6 text-center">
                  <p className="text-sm font-bold text-[#dc2626]">This order has been cancelled.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stepper Steps */}
                  <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 py-4">
                    <div className="absolute left-4 md:left-0 md:top-[18px] w-0.5 md:w-full h-[80%] md:h-0.5 bg-[#e2e8f0] -z-10" />
                    {trackingSteps.map((step, index) => (
                      <div
                        key={step.key}
                        className="flex md:flex-col items-center md:text-center gap-4 md:gap-3 flex-1 relative"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                            step.isCompleted
                              ? 'bg-[#4f46e5] border-[#4f46e5] text-white'
                              : step.isActive
                                ? 'bg-white border-[#4f46e5] text-[#4f46e5] font-bold ring-4 ring-[#4f46e5]/5'
                                : 'bg-white border-[#e2e8f0] text-[#64748b]'
                          }`}
                        >
                          {step.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          ) : step.isActive ? (
                            <div className="relative flex items-center justify-center">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-[#4f46e5]/10 animate-ping" />
                              <Clock className="w-4 h-4 animate-spin text-[#4f46e5]" />
                            </div>
                          ) : (
                            <span className="text-xs font-bold font-mono">{index + 1}</span>
                          )}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-bold ${step.isActive ? 'text-[#4f46e5]' : 'text-[#1e293b]'}`}
                          >
                            {step.label}
                          </p>
                          <p className="text-[11px] text-[#64748b] mt-0.5 max-w-[140px]">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expandable Order Items list */}
                  <div className="bg-[#f1f5f9] border border-[#e2e8f0]/60 rounded-md p-4">
                    <button
                      onClick={() => setIsOrderItemsExpanded(!isOrderItemsExpanded)}
                      className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#1e293b] hover:text-[#4f46e5] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <CornerDownRight className="w-4 h-4 text-[#4f46e5]" />
                        {isOrderItemsExpanded ? 'Hide Item Details' : 'Show Item Details'} (
                        <span className="font-mono">{latestOrderItems.length}</span>)
                      </span>
                      {isOrderItemsExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {isOrderItemsExpanded && latestOrderItems.length > 0 && (
                      <div className="mt-4 border-t border-[#e2e8f0] pt-4 space-y-3">
                        {latestOrderItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-1.5 last:pb-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-md overflow-hidden flex items-center justify-center border border-[#e2e8f0]/40">
                                {item.product.imageUrl ? (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    className="h-full w-full object-contain p-1"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-[#64748b]" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#1e293b] line-clamp-1">
                                  {item.product.name}
                                </p>
                                <p className="text-[10px] text-[#64748b]">
                                  Qty: <span className="font-mono">{item.quantity}</span> ·{' '}
                                  {item.product.category || 'General'}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs font-bold font-mono text-[#1e293b]">
                              {formatCurrency(
                                parseFloat(item.unitPriceAtPurchase || item.price) * item.quantity
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="py-10 text-center text-[#64748b] flex flex-col items-center justify-center">
                <Package className="w-12 h-12 text-[#e2e8f0] mb-3 stroke-[1.5]" />
                <p className="text-sm font-medium">
                  When you place orders, they will show up here.
                </p>
              </div>
            )}
          </div>

          {latestOrder && (
            <div className="mt-6 border-t border-[#e2e8f0] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs text-[#64748b]">
                <div>
                  <span className="font-semibold">Placed:</span>{' '}
                  <span className="font-mono">
                    {new Date(latestOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Total:</span>{' '}
                  <span className="font-bold font-mono text-[#1e293b]">
                    {formatCurrency(latestOrder.totalAmount)}
                  </span>
                </div>
              </div>
              <Link
                to="/store/dashboard/orders"
                className="text-xs font-semibold uppercase tracking-wider text-[#1e293b] hover:text-[#4f46e5] border border-[#e2e8f0] hover:bg-[#f1f5f9] px-4 py-2 rounded-md transition-all"
              >
                Inspect Order
              </Link>
            </div>
          )}
        </div>

        {/* Quick Menu */}
        <div className="swiss-panel p-6 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748b] border-b border-[#e2e8f0] pb-4 mb-4">
              Quick Menu
            </p>
            <div className="space-y-3">
              <Link
                to="/store/dashboard/orders"
                className="flex items-center justify-between p-3.5 rounded-md border border-[#e2e8f0] hover:border-[#4f46e5] bg-[#f1f5f9]/50 hover:bg-[#f1f5f9] transition-colors"
              >
                <span className="text-xs font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#64748b]" /> My Purchase History
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/store/cart"
                className="flex items-center justify-between p-3.5 rounded-md border border-[#e2e8f0] hover:border-[#4f46e5] bg-[#f1f5f9]/50 hover:bg-[#f1f5f9] transition-colors"
              >
                <span className="text-xs font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#64748b]" /> Shopping Basket
                </span>
                <span className="text-xs px-2 py-0.5 bg-[#4f46e5] text-white rounded-md font-mono font-bold">
                  {cartTotalItems}
                </span>
              </Link>
              <Link
                to="/store/dashboard/b2b-onboarding"
                className="flex items-center justify-between p-3.5 rounded-md border border-dashed border-[#4f46e5]/40 hover:border-[#4f46e5] bg-[#4f46e5]/5 hover:bg-[#f1f5f9] transition-colors"
              >
                <span className="text-xs font-semibold flex items-center gap-2 text-[#4f46e5]">
                  <User className="w-4 h-4" /> B2B Wholesaler Portal
                </span>
                <ArrowUpRight className="w-4 h-4 text-[#4f46e5]" />
              </Link>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-[#e2e8f0] text-center text-xs text-[#64748b] flex items-center justify-center gap-1 font-mono font-bold tracking-widest">
            NEXCART CLIENT CONSOLE
          </div>
        </div>
      </section>

      {/* Recent Activity & Help Desk */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity timeline */}
        <div className="swiss-panel p-6">
          <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-4 mb-5">
            <Activity className="w-5 h-5 text-[#4f46e5]" />
            <h3 className="text-lg font-bold text-[#1e293b]">Account Milestones</h3>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-12 text-center text-[#64748b]">
              <Clock className="w-10 h-10 text-[#e2e8f0] mx-auto mb-2" />
              <p className="text-sm font-semibold">No recent activity logs.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1e293b] mt-1.5" />
                    <div className="w-0.5 h-full bg-[#e2e8f0] mt-2" />
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-[#1e293b]">{act.title}</h4>
                      <span className="text-[9px] font-bold text-[#64748b] font-mono">
                        {act.timestamp.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748b] mt-1 leading-relaxed">
                      {act.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Desk accordion */}
        <div className="swiss-panel p-6">
          <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-4 mb-5">
            <HelpCircle className="w-5 h-5 text-[#4f46e5]" />
            <h3 className="text-lg font-bold text-[#1e293b]">Support Desk</h3>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="border border-[#e2e8f0]/60 rounded-md overflow-hidden bg-[#f1f5f9]/20"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-[#1e293b] hover:bg-[#f1f5f9]/40 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#64748b]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#64748b]" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 pt-1 text-[11px] text-[#64748b] leading-relaxed border-t border-[#e2e8f0]/30 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[#e2e8f0] flex justify-between items-center">
            <Link
              to="/store/dashboard/orders"
              className="text-[10px] font-bold uppercase tracking-wider text-[#dc2626] hover:underline flex items-center gap-1 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Raise Dispute ticket
            </Link>
            <a
              href="mailto:support@nexcart.com"
              className="text-[10px] font-bold uppercase tracking-wider text-[#1e293b] hover:text-[#4f46e5] flex items-center gap-1 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Contact Support{' '}
              <ExternalLink className="w-3 h-3 text-[#4f46e5]" />
            </a>
          </div>
        </div>
      </section>

      {/* Recommendations Section */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#4f46e5]" />
          <h2 className="text-xl font-bold text-[#1e293b] tracking-tight">Recommended For You</h2>
        </div>

        {recsLoading ? (
          <div className="flex h-40 items-center justify-center text-[#64748b]">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-md bg-[#f1f5f9] h-10 w-10"></div>
              <div className="flex-1 space-y-6 py-1">
                <div className="h-2 bg-[#f1f5f9] rounded"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-2 bg-[#f1f5f9] rounded col-span-2"></div>
                    <div className="h-2 bg-[#f1f5f9] rounded col-span-1"></div>
                  </div>
                  <div className="h-2 bg-[#f1f5f9] rounded"></div>
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
                  className="min-w-[240px] max-w-[240px] swiss-card p-4 hover:border-[#4f46e5] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="h-40 w-full bg-[#f1f5f9] rounded-md flex items-center justify-center overflow-hidden border border-[#e2e8f0]/40">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-contain p-2 group-hover:scale-102 transition-transform duration-300"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-[#64748b] stroke-[1.5]" />
                      )}
                    </div>
                    <div className="mt-3">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748b]">
                        {product.category}
                      </span>
                      <h4 className="font-bold text-sm text-[#1e293b] line-clamp-1 mt-0.5">
                        {product.name}
                      </h4>
                      <p className="mt-2 text-base font-bold font-mono text-[#4f46e5]">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[#e2e8f0] pt-2">
                    <p className="text-[10px] text-[#64748b] font-semibold flex items-center gap-1 line-clamp-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#4f46e5]" /> {reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-[#64748b] border border-dashed border-[#e2e8f0] rounded-md bg-white">
            <Sparkles className="w-10 h-10 text-[#e2e8f0] mx-auto mb-2" />
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
