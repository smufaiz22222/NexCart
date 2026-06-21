import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  RotateCcw,
  FileText,
} from 'lucide-react';
import { useOrders } from '../api/queries';
import { cn } from '../utils/cn';

const statusConfig = {
  PENDING: { label: 'Pending', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  PROCESSING: {
    label: 'Processing',
    icon: Package,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  SHIPPED: {
    label: 'Shipped',
    icon: Truck,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  DELIVERED: {
    label: 'Delivered',
    icon: CheckCircle2,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
  RETURN_COMPLETED: {
    label: 'Returned',
    icon: RotateCcw,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
  },
};

export default function B2BOrders() {
  const navigate = useNavigate();
  const { data: allOrders = [], isLoading } = useOrders();
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Filter to only show B2B-related orders (orders placed through RFQ/wholesale flow)
  // B2B orders are identified by having items from wholesalers where the user has B2B access (paymentMethod === 'BANK_TRANSFER')
  const b2bOrders = useMemo(() => {
    return allOrders
      .filter((o) => o.paymentMethod === 'BANK_TRANSFER')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allOrders]);

  const statusCounts = useMemo(() => {
    return {
      ALL: b2bOrders.length,
      PENDING: b2bOrders.filter((o) => o.status === 'PENDING').length,
      PROCESSING: b2bOrders.filter((o) => o.status === 'PROCESSING').length,
      SHIPPED: b2bOrders.filter((o) => o.status === 'SHIPPED').length,
      DELIVERED: b2bOrders.filter((o) => o.status === 'DELIVERED').length,
      CANCELLED_RETURNED: b2bOrders.filter((o) =>
        ['CANCELLED', 'RETURN_COMPLETED'].includes(o.status)
      ).length,
    };
  }, [b2bOrders]);

  const filteredB2BOrders = useMemo(() => {
    if (selectedStatus === 'ALL') return b2bOrders;
    if (selectedStatus === 'CANCELLED_RETURNED') {
      return b2bOrders.filter((o) => ['CANCELLED', 'RETURN_COMPLETED'].includes(o.status));
    }
    return b2bOrders.filter((o) => o.status === selectedStatus);
  }, [b2bOrders, selectedStatus]);

  const activeOrders = useMemo(
    () => b2bOrders.filter((o) => ['PENDING', 'PROCESSING', 'SHIPPED'].includes(o.status)),
    [b2bOrders]
  );

  const completedOrders = useMemo(
    () =>
      b2bOrders.filter((o) => ['DELIVERED', 'RETURN_COMPLETED', 'CANCELLED'].includes(o.status)),
    [b2bOrders]
  );

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[#EFEFEF] rounded" />
        <div className="h-32 bg-[#EFEFEF] rounded-xl border border-[#C0C0C0]" />
        <div className="h-32 bg-[#EFEFEF] rounded-xl border border-[#C0C0C0]" />
        <div className="h-32 bg-[#EFEFEF] rounded-xl border border-[#C0C0C0]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans text-[#16171a]">
      {/* Back button */}
      <button
        onClick={() => navigate('/store/dashboard/b2b')}
        className="flex items-center text-sm font-bold text-[#6C757D] hover:text-[#0047AB] transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to B2B Dashboard
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-[#0047AB]" />
            B2B Order History
          </h1>
          <p className="text-sm text-[#6C757D] mt-1">
            Track wholesale and RFQ-based procurement orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#6C757D] border border-[#C0C0C0] px-3 py-1.5 rounded-lg bg-[#EFEFEF]">
            {b2bOrders.length} order{b2bOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        {[
          { id: 'ALL', label: 'All Statuses' },
          { id: 'PENDING', label: 'Pending' },
          { id: 'PROCESSING', label: 'Processing' },
          { id: 'SHIPPED', label: 'Shipped' },
          { id: 'DELIVERED', label: 'Delivered' },
          { id: 'CANCELLED_RETURNED', label: 'Cancelled / Returned' },
        ].map((tab) => {
          const count = statusCounts[tab.id];
          const isActive = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border flex items-center gap-1.5',
                isActive
                  ? 'bg-[#0047AB] text-white border-[#0047AB] font-bold shadow-md shadow-blue-500/10'
                  : 'bg-white border-[#C0C0C0] text-[#6C757D] hover:text-[#16171a] hover:bg-[#EFEFEF]'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[10px] font-mono leading-none rounded-full px-1.5 py-0.5',
                  isActive ? 'bg-white/20 text-white' : 'bg-[#EFEFEF] text-zinc-500'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {b2bOrders.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#C0C0C0] rounded-2xl bg-white">
          <Package className="w-14 h-14 text-[#C0C0C0] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#161412]">No B2B orders yet</h2>
          <p className="text-sm text-[#6C757D] mt-2 max-w-sm mx-auto">
            Once you complete a wholesale purchase through the RFQ process, orders will appear here.
          </p>
          <button
            onClick={() => navigate('/store/dashboard/rfqs')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#0047AB] hover:bg-[#003B91] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <FileText className="w-4 h-4" />
            View RFQ Price Desk
          </button>
        </div>
      ) : filteredB2BOrders.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#C0C0C0] rounded-2xl bg-white">
          <Package className="w-14 h-14 text-[#C0C0C0] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#161412]">No orders match this status</h2>
          <p className="text-sm text-[#6C757D] mt-2 max-w-sm mx-auto">
            There are no B2B wholesale orders in this section. Try selecting another status filter
            above.
          </p>
        </div>
      ) : selectedStatus !== 'ALL' ? (
        <div className="space-y-4">
          {filteredB2BOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              formatCurrency={formatCurrency}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Active Orders ({activeOrders.length})
              </h2>
              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    formatCurrency={formatCurrency}
                    navigate={navigate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Orders */}
          {completedOrders.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Past Orders ({completedOrders.length})
              </h2>
              <div className="space-y-4">
                {completedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    formatCurrency={formatCurrency}
                    navigate={navigate}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, formatCurrency, navigate }) {
  const config = statusConfig[order.status] || statusConfig.PENDING;
  const StatusIcon = config.icon;
  const itemCount = order.items?.length || 0;

  return (
    <div
      className="swiss-panel p-5 hover:border-[#0047AB] transition-colors cursor-pointer"
      onClick={() => navigate('/store/dashboard/orders')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono font-bold text-[#161412]">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${config.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
            <span className="text-[10px] text-[#6C757D] font-mono">
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Items preview */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex -space-x-2">
              {order.items?.slice(0, 3).map((item, idx) => (
                <div
                  key={idx}
                  className="w-10 h-10 rounded-lg bg-[#faf9f7] border border-[#EFEFEF] flex items-center justify-center overflow-hidden"
                >
                  {item.product?.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    <Package className="w-4 h-4 text-[#C0C0C0]" />
                  )}
                </div>
              ))}
              {itemCount > 3 && (
                <div className="w-10 h-10 rounded-lg bg-[#EFEFEF] border border-[#C0C0C0] flex items-center justify-center text-[10px] font-bold text-[#6C757D]">
                  +{itemCount - 3}
                </div>
              )}
            </div>
            <div className="text-xs text-[#6C757D]">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
              {order.items?.[0]?.product?.wholesaler?.businessName && (
                <span className="ml-1">
                  from{' '}
                  <span className="font-semibold text-[#161412]">
                    {order.items[0].product.wholesaler.businessName}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="text-right shrink-0">
          <p className="text-lg font-bold font-mono text-[#161412]">
            {formatCurrency(order.totalAmount)}
          </p>
          <p className="text-[10px] text-[#6C757D] mt-0.5 uppercase tracking-wider">
            {order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}
          </p>
        </div>
      </div>
    </div>
  );
}
