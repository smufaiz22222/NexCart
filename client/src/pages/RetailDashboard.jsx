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
  MapPin,
  Briefcase
} from 'lucide-react';
import { useOrders, useUserRecommendations } from '../api/queries';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function RetailDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const cartTotalItems = useCartStore((state) => state.getTotalItems());

  // Fetch standard B2C queries
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: recommendationsData, isLoading: recsLoading } = useUserRecommendations();

  // Filter standard customer orders
  const activeOrders = orders.filter((order) =>
    ['PENDING', 'PROCESSING', 'SHIPPED'].includes(order.status)
  );

  const completedOrders = orders.filter((order) =>
    ['DELIVERED', 'RETURN_COMPLETED'].includes(order.status)
  );

  const latestOrder = orders.length > 0
    ? [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    : null;

  const recommendedItems = recommendationsData?.recommendations || [];

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

  if (ordersLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-[#6b665f]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#161412] border-t-transparent" />
        <p className="text-sm font-bold uppercase tracking-[0.24em]">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-sans text-[#161412]">
      {/* Greeting Banner */}
      <section className="rounded-[28px] border border-[#ddd7cc] bg-white p-8 shadow-[0_12px_40px_rgba(22,20,18,0.02)] relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-[#f8f6f1] rounded-full -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#161412]/5 text-[#161412]/80 border border-[#161412]/10 uppercase tracking-widest">
              <User className="w-3.5 h-3.5" /> Retail Account Workspace
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#161412] md:text-4xl">
              Hello, {user?.name || 'Customer'}!
            </h1>
            <p className="mt-2 text-sm text-[#6b665f] max-w-xl">
              Review your purchase history, track shipments, and check recommendations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/store"
              className="inline-flex items-center gap-2 rounded-full bg-[#161412] px-6 py-3.5 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-[#34302b] transition-all"
            >
              Start Shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Join B2B Banner */}
      <section className="rounded-[24px] bg-[#161412] p-6 text-white shadow-[0_12px_40px_rgba(22,20,18,0.1)] flex flex-col md:flex-row items-center justify-between gap-6 border border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg tracking-tight">Own a business?</h3>
            <p className="text-sm text-[#c8c1b4] mt-1">
              Apply for a Business Account to unlock wholesale tiered pricing, RFQs, and wholesaler credit lines.
            </p>
          </div>
        </div>
        <Link
          to="/store/b2b-onboarding"
          className="rounded-full bg-amber-500 hover:bg-amber-600 text-[#161412] px-6 py-3.5 text-xs font-black uppercase tracking-widest transition-all"
        >
          Join B2B Wholesale
        </Link>
      </section>

      {/* Metrics Grid */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-[22px] border border-[#ddd7cc] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
          <div className="flex items-center justify-between">
            <div className="rounded-xl border border-zinc-100 bg-[#f8f6f1] p-2.5 text-zinc-700">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f877b]">
              Total Orders
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{orders.length}</p>
          <p className="mt-1 text-xs text-[#6b665f]">Total lifetime purchases</p>
        </div>

        <div className="rounded-[22px] border border-[#ddd7cc] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
          <div className="flex items-center justify-between">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-blue-600">
              <Truck className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f877b]">
              Active Deliveries
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{activeOrders.length}</p>
          <p className="mt-1 text-xs text-[#6b665f]">Orders currently in transit</p>
        </div>

        <div className="rounded-[22px] border border-[#ddd7cc] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.01)]">
          <div className="flex items-center justify-between">
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5 text-amber-600">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8f877b]">
              Cart Status
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{cartTotalItems} items</p>
          <p className="mt-1 text-xs text-[#6b665f]">Waiting in shopping basket</p>
        </div>
      </section>

      {/* Stepper / Order Tracker */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[24px] border border-[#ddd7cc] bg-white p-6 shadow-[0_12px_36px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#f3efe8] pb-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8f877b]">
                  Fulfillment Tracker
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-[#161412]">
                  {latestOrder ? 'Track Your Latest Order' : 'No Active Shipments'}
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
                <p className="text-sm font-medium">When you place orders, they will show up here.</p>
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
                  <span className="font-bold">Total:</span>{' '}
                  <span className="font-extrabold text-[#161412]">₹{parseFloat(latestOrder.totalAmount).toLocaleString()}</span>
                </div>
              </div>
              <Link
                to="/store/orders"
                className="text-xs font-black uppercase tracking-[0.16em] text-[#161412] border border-[#ddd7cc] hover:bg-[#f8f6f1] px-4 py-2 rounded-full transition-all"
              >
                View Orders
              </Link>
            </div>
          )}
        </div>

        {/* Address & Cart Summary Card */}
        <div className="rounded-[24px] border border-[#ddd7cc] bg-white p-6 shadow-[0_12px_36px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8f877b] border-b border-[#f3efe8] pb-4 mb-4">
              Quick Links
            </p>
            <div className="space-y-3">
              <Link
                to="/store/orders"
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#ddd7cc] hover:border-[#161412] bg-[#f8f6f1]/50 hover:bg-white transition"
              >
                <span className="text-xs font-bold">My Orders</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/store/cart"
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#ddd7cc] hover:border-[#161412] bg-[#f8f6f1]/50 hover:bg-white transition"
              >
                <span className="text-xs font-bold">Shopping Basket</span>
                <span className="text-xs px-2 py-0.5 bg-[#161412] text-white rounded-full font-bold">{cartTotalItems}</span>
              </Link>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-[#f3efe8] text-center text-xs text-[#8f877b]">
            Fashion Marketplace Shopping Workspace
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          <h2 className="text-xl font-black text-[#161412] tracking-tight">Recommended For You</h2>
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
