import { useState, useMemo } from 'react';
import { ArrowLeft, Package, Clock, Truck, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { cn } from '../utils/cn';
import { useOrders } from '../api/queries';
import OrderCard from '../components/orders/OrderCard';

const statusIcons = {
  PENDING: Clock,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle2,
  CANCELLED_RETURNED: XCircle,
};

export default function Orders() {
  const location = useLocation();
  const isWholesalerPath = location.pathname.startsWith('/wholesaler');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const backPath = user?.role === 'WHOLESALER' ? '/wholesaler' : '/store/dashboard';

  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const { data: orders = [], isLoading, isError, error, isFetching, refetch } = useOrders();

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedStatus('ALL');
  };

  const counts = useMemo(() => {
    return {
      ALL: orders.length,
      B2C: orders.filter((o) => o.paymentMethod !== 'BANK_TRANSFER').length,
      B2B: orders.filter((o) => o.paymentMethod === 'BANK_TRANSFER').length,
    };
  }, [orders]);

  const typeFilteredOrders = useMemo(() => {
    if (selectedType === 'B2B') {
      return orders.filter((o) => o.paymentMethod === 'BANK_TRANSFER');
    }
    if (selectedType === 'B2C') {
      return orders.filter((o) => o.paymentMethod !== 'BANK_TRANSFER');
    }
    return orders;
  }, [orders, selectedType]);

  const statusCounts = useMemo(() => {
    return {
      ALL: typeFilteredOrders.length,
      PENDING: typeFilteredOrders.filter((o) => o.status === 'PENDING').length,
      PROCESSING: typeFilteredOrders.filter((o) => o.status === 'PROCESSING').length,
      SHIPPED: typeFilteredOrders.filter((o) => o.status === 'SHIPPED').length,
      DELIVERED: typeFilteredOrders.filter((o) => o.status === 'DELIVERED').length,
      CANCELLED_RETURNED: typeFilteredOrders.filter((o) =>
        ['CANCELLED', 'RETURN_COMPLETED'].includes(o.status)
      ).length,
    };
  }, [typeFilteredOrders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (selectedType === 'B2B') {
      result = result.filter((o) => o.paymentMethod === 'BANK_TRANSFER');
    } else if (selectedType === 'B2C') {
      result = result.filter((o) => o.paymentMethod !== 'BANK_TRANSFER');
    }

    if (selectedStatus !== 'ALL') {
      if (selectedStatus === 'CANCELLED_RETURNED') {
        result = result.filter((o) => ['CANCELLED', 'RETURN_COMPLETED'].includes(o.status));
      } else {
        result = result.filter((o) => o.status === selectedStatus);
      }
    }

    return result.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [orders, selectedType, selectedStatus]);

  if (isLoading) {
    return (
      <div
        className={cn(
          'max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse',
          isWholesalerPath ? 'text-zinc-200' : 'text-[#1e293b]'
        )}
      >
        <div
          className={cn(
            'h-20 rounded-xl border',
            isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#f1f5f9] border-[#e2e8f0]'
          )}
        />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-20 rounded-xl border',
                isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#f1f5f9] border-[#e2e8f0]'
              )}
            />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-40 rounded-xl border',
                isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#f1f5f9] border-[#e2e8f0]'
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'max-w-6xl mx-auto px-4 py-8 font-sans',
        isWholesalerPath ? 'text-zinc-200' : 'text-[#1e293b]'
      )}
    >
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(backPath)}
          className={cn(
            'flex items-center font-semibold text-sm transition-colors group mb-6',
            isWholesalerPath
              ? 'text-zinc-400 hover:text-amber-500'
              : 'text-[#64748b] hover:text-[#4f46e5]'
          )}
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1
              className={cn(
                'text-2xl font-black tracking-tight flex items-center gap-3',
                isWholesalerPath ? 'text-white' : 'text-[#1e293b]'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  isWholesalerPath ? 'bg-amber-500/20' : 'bg-[#4f46e5]'
                )}
              >
                <Package
                  className={cn('h-5 w-5', isWholesalerPath ? 'text-amber-400' : 'text-white')}
                />
              </div>
              {user?.role === 'WHOLESALER' ? 'Incoming Orders' : 'Order History'}
            </h1>
            <p
              className={cn(
                'text-sm mt-2 ml-[52px]',
                isWholesalerPath ? 'text-zinc-400' : 'text-[#64748b]'
              )}
            >
              {user?.role === 'WHOLESALER'
                ? 'Manage orders and review return, refund, and dispute requests.'
                : 'Track orders and manage returns or disputes from one place.'}
            </p>
          </div>
          {isFetching && !isLoading && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider animate-pulse',
                isWholesalerPath
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]'
              )}
            >
              Syncing...
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8 stagger-children">
        {[
          { id: 'PENDING', label: 'Pending', color: 'amber' },
          { id: 'PROCESSING', label: 'Processing', color: 'blue' },
          { id: 'SHIPPED', label: 'Shipped', color: 'indigo' },
          { id: 'DELIVERED', label: 'Delivered', color: 'emerald' },
          { id: 'CANCELLED_RETURNED', label: 'Cancelled', color: 'red' },
        ].map((stat) => {
          const Icon = statusIcons[stat.id] || XCircle;
          const count = statusCounts[stat.id];
          const isActive = selectedStatus === stat.id;
          return (
            <button
              key={stat.id}
              onClick={() => setSelectedStatus(isActive ? 'ALL' : stat.id)}
              className={cn(
                'relative rounded-xl border p-4 text-left transition-all duration-200 stat-card-glow animate-slide-in btn-press',
                isActive
                  ? isWholesalerPath
                    ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/5'
                    : 'bg-[#eef2ff] border-[#4f46e5] shadow-lg shadow-[#4f46e5]/5'
                  : isWholesalerPath
                    ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    : 'bg-white border-[#e2e8f0] hover:border-[#4f46e5]/30 hover:shadow-sm'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 mb-2',
                  isActive
                    ? isWholesalerPath
                      ? 'text-amber-400'
                      : 'text-[#4f46e5]'
                    : isWholesalerPath
                      ? 'text-zinc-500'
                      : 'text-[#64748b]'
                )}
              />
              <p
                className={cn(
                  'text-xl font-black font-mono',
                  isActive
                    ? isWholesalerPath
                      ? 'text-amber-400'
                      : 'text-[#4f46e5]'
                    : isWholesalerPath
                      ? 'text-white'
                      : 'text-[#1e293b]'
                )}
              >
                {count}
              </p>
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider mt-1',
                  isWholesalerPath ? 'text-zinc-500' : 'text-[#64748b]'
                )}
              >
                {stat.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Order Type Filter Tabs */}
      {counts.B2B > 0 && (
        <div
          className={cn(
            'mb-6 flex w-full flex-wrap gap-1 rounded-xl border p-1 sm:w-fit',
            isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#f1f5f9] border-[#e2e8f0]'
          )}
        >
          {[
            { id: 'ALL', label: 'All' },
            { id: 'B2C', label: 'Retail' },
            { id: 'B2B', label: 'Wholesale' },
          ].map((tab) => {
            const count = counts[tab.id];
            const isActive = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTypeChange(tab.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 sm:flex-initial',
                  isActive
                    ? isWholesalerPath
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'bg-white text-[#1e293b] shadow-sm border border-[#e2e8f0]'
                    : isWholesalerPath
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-[#64748b] hover:text-[#1e293b]'
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded',
                    isActive
                      ? isWholesalerPath
                        ? 'bg-amber-600/50 text-black'
                        : 'bg-[#f1f5f9] text-[#64748b]'
                      : isWholesalerPath
                        ? 'text-zinc-600'
                        : 'text-[#94a3b8]'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

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
                  ? isWholesalerPath
                    ? 'bg-amber-500 text-black border-amber-500 font-bold'
                    : 'bg-[#4f46e5] text-white border-[#4f46e5] font-bold shadow-sm'
                  : isWholesalerPath
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'bg-white border-[#e2e8f0] text-[#64748b] hover:text-[#1e293b] hover:border-[#4f46e5]/30'
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-mono leading-none rounded-full px-1.5 py-0.5',
                    isActive
                      ? 'bg-white/20 text-white'
                      : isWholesalerPath
                        ? 'text-zinc-600'
                        : 'text-[#94a3b8]'
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
      {isError ? (
        <div
          className={cn(
            'p-12 flex flex-col items-center justify-center text-center rounded-2xl border',
            isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2e8f0]'
          )}
        >
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-sm font-bold text-red-600 mb-2">Failed to load orders</p>
          <p className="text-xs text-[#64748b] mb-5 max-w-sm">
            {error?.response?.data?.error || error?.message || 'Something went wrong'}
          </p>
          <button
            onClick={() => refetch()}
            className={cn(
              'px-5 py-2.5 font-bold rounded-xl transition-colors text-white text-xs uppercase tracking-wider',
              isWholesalerPath
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-[#4f46e5] hover:bg-[#4338ca]'
            )}
          >
            Try Again
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          className={cn(
            'border-dashed p-16 text-center flex flex-col items-center rounded-2xl border',
            isWholesalerPath ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-[#e2e8f0]'
          )}
        >
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-5',
              isWholesalerPath ? 'bg-zinc-800' : 'bg-[#f1f5f9]'
            )}
          >
            <Package
              className={cn('h-8 w-8', isWholesalerPath ? 'text-zinc-500' : 'text-[#94a3b8]')}
            />
          </div>
          <h3
            className={cn('text-lg font-bold', isWholesalerPath ? 'text-white' : 'text-[#1e293b]')}
          >
            No orders found
          </h3>
          <p
            className={cn(
              'mt-2 text-sm max-w-sm',
              isWholesalerPath ? 'text-zinc-500' : 'text-[#64748b]'
            )}
          >
            {selectedStatus !== 'ALL' || selectedType !== 'ALL'
              ? 'Try adjusting your filters to see more orders.'
              : 'When a transaction is made, order details will appear here.'}
          </p>
          {(selectedStatus !== 'ALL' || selectedType !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedType('ALL');
              }}
              className={cn(
                'mt-5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border',
                isWholesalerPath
                  ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  : 'border-[#e2e8f0] text-[#64748b] hover:border-[#4f46e5] hover:text-[#4f46e5]'
              )}
            >
              <RotateCcw className="w-3.5 h-3.5 inline mr-2" />
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5 stagger-children">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              user={user}
              isWholesalerPath={isWholesalerPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
