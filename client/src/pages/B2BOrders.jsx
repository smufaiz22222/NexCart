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

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

export default function B2BOrders() {
  const navigate = useNavigate();
  const { data: allOrders = [], isLoading } = useOrders();
  const [selectedStatus, setSelectedStatus] = useState('ALL');

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

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-6">
        <div className="h-10 w-56 bg-[#f1f5f9] rounded-xl" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0]" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans text-[#1e293b]">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/store/dashboard/b2b')}
          className="flex items-center text-sm font-semibold text-[#64748b] hover:text-[#7c3aed] transition-colors group mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to B2B Dashboard
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5]">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">
                B2B Order History
              </h1>
              <p className="text-sm text-[#64748b] mt-0.5">
                Track wholesale and RFQ-based procurement orders
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#64748b] border border-[#e2e8f0] px-3 py-1.5 rounded-full bg-[#f1f5f9] font-mono">
            {b2bOrders.length} order{b2bOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Status Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8 stagger-children">
        {[
          { id: 'PENDING', label: 'Pending', icon: Clock },
          { id: 'PROCESSING', label: 'Processing', icon: Package },
          { id: 'SHIPPED', label: 'Shipped', icon: Truck },
          { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
          { id: 'CANCELLED_RETURNED', label: 'Cancelled', icon: XCircle },
        ].map((stat) => {
          const Icon = stat.icon;
          const count = statusCounts[stat.id];
          const isActive = selectedStatus === stat.id;
          return (
            <button
              key={stat.id}
              onClick={() => setSelectedStatus(isActive ? 'ALL' : stat.id)}
              className={cn(
                'relative rounded-xl border p-4 text-left transition-all duration-200 stat-card-glow stat-card-glow-purple animate-slide-in btn-press',
                isActive
                  ? 'bg-[#f5f3ff] border-[#7c3aed] shadow-lg shadow-[#7c3aed]/5'
                  : 'bg-white border-[#e2e8f0] hover:border-[#7c3aed]/30 hover:shadow-sm'
              )}
            >
              <Icon
                className={cn('h-4 w-4 mb-2', isActive ? 'text-[#7c3aed]' : 'text-[#64748b]')}
              />
              <p
                className={cn(
                  'text-xl font-black font-mono',
                  isActive ? 'text-[#7c3aed]' : 'text-[#1e293b]'
                )}
              >
                {count}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mt-1">
                {stat.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: 'ALL', label: 'All' },
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
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 btn-press',
                isActive
                  ? 'bg-[#7c3aed] text-white border-[#7c3aed] font-bold shadow-sm'
                  : 'bg-white border-[#e2e8f0] text-[#64748b] hover:text-[#1e293b] hover:border-[#7c3aed]/30'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-mono leading-none rounded-full px-1.5 py-0.5',
                    isActive ? 'bg-white/20 text-white' : 'text-[#94a3b8]'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {b2bOrders.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#e2e8f0] rounded-2xl bg-white">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f3ff] flex items-center justify-center mx-auto mb-5">
            <Package className="w-8 h-8 text-[#a78bfa]" />
          </div>
          <h2 className="text-lg font-bold text-[#1e293b]">No B2B orders yet</h2>
          <p className="text-sm text-[#64748b] mt-2 max-w-sm mx-auto">
            Once you complete a wholesale purchase through the RFQ process, orders will appear here.
          </p>
          <button
            onClick={() => navigate('/store/dashboard/rfqs')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            View Price Desk
          </button>
        </div>
      ) : filteredB2BOrders.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#e2e8f0] rounded-2xl bg-white">
          <div className="w-14 h-14 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-[#94a3b8]" />
          </div>
          <h2 className="text-lg font-bold text-[#1e293b]">No orders match this filter</h2>
          <p className="text-sm text-[#64748b] mt-2 max-w-sm mx-auto">
            Try selecting another status filter above.
          </p>
          <button
            onClick={() => setSelectedStatus('ALL')}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 border border-[#e2e8f0] hover:border-[#7c3aed] text-[#64748b] hover:text-[#7c3aed] rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear Filter
          </button>
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
        <div className="space-y-10">
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e2e8f0]">
                <div className="w-6 h-6 rounded-full bg-[#eef2ff] flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-[#4f46e5]" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Active Orders ({activeOrders.length})
                </h2>
              </div>
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
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e2e8f0]">
                <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Past Orders ({completedOrders.length})
                </h2>
              </div>
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
    <button
      type="button"
      className="rounded-xl border border-[#e2e8f0] bg-white p-5 hover:border-[#7c3aed] hover:shadow-md hover:shadow-[#7c3aed]/5 transition-all duration-200 cursor-pointer card-hover-subtle"
      onClick={() => navigate('/store/dashboard/orders')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono font-black text-[#1e293b]">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </span>
            <span className="text-[10px] text-[#64748b] font-mono">
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
              {order.items?.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="w-10 h-10 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center overflow-hidden"
                >
                  {item.product?.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    <Package className="w-4 h-4 text-[#94a3b8]" />
                  )}
                </div>
              ))}
              {itemCount > 3 && (
                <div className="w-10 h-10 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center text-[10px] font-bold text-[#64748b]">
                  +{itemCount - 3}
                </div>
              )}
            </div>
            <div className="text-xs text-[#64748b]">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
              {order.items?.[0]?.product?.wholesaler?.businessName && (
                <span className="ml-1">
                  from{' '}
                  <span className="font-bold text-[#1e293b]">
                    {order.items[0].product.wholesaler.businessName}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="text-right shrink-0">
          <p className="text-lg font-black font-mono text-[#7c3aed]">
            {formatCurrency(order.totalAmount)}
          </p>
          <p className="text-[10px] text-[#64748b] mt-0.5 uppercase tracking-wider font-semibold">
            Bank Transfer
          </p>
        </div>
      </div>
    </button>
  );
}
