import { useState, useMemo } from 'react';
import { ArrowLeft, Package } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { cn } from '../utils/cn';
import { useOrders } from '../api/queries';
import OrderCard from '../components/orders/OrderCard';

export default function Orders() {
  const location = useLocation();
  const isWholesalerPath = location.pathname.startsWith('/wholesaler');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const backPath = user?.role === 'WHOLESALER' ? '/wholesaler' : '/store';

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
          'max-w-6xl mx-auto px-4 py-8 space-y-8 animate-pulse',
          isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
        )}
      >
        <div
          className={cn(
            'h-24 rounded-lg border',
            isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
          )}
        />
        <div className="space-y-4">
          <div
            className={cn(
              'h-44 rounded-lg border',
              isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
            )}
          />
          <div
            className={cn(
              'h-44 rounded-lg border',
              isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'max-w-6xl mx-auto px-4 py-8 font-sans selection:bg-[#0047AB]/10',
        isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
      )}
    >
      <button
        onClick={() => navigate(backPath)}
        className={cn(
          'flex items-center font-bold text-sm tracking-wide transition-colors group mb-8',
          isWholesalerPath
            ? 'text-zinc-400 hover:text-amber-500'
            : 'text-[#6C757D] hover:text-[#0047AB]'
        )}
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <div
        className={cn(
          'flex justify-between items-center mb-8 border-b pb-6',
          isWholesalerPath ? 'border-zinc-800' : 'border-[#C0C0C0]'
        )}
      >
        <div>
          <h1
            className={cn(
              'text-3xl font-bold tracking-tight flex items-center gap-2',
              isWholesalerPath ? 'text-white' : 'text-[#16171a]'
            )}
          >
            {user?.role === 'WHOLESALER' ? (
              <span>Incoming Shop Orders</span>
            ) : (
              <span>My Purchase History</span>
            )}
            {isFetching && !isLoading && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border animate-pulse',
                  isWholesalerPath
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-[#EFEFEF] text-[#0047AB] border-[#C0C0C0]'
                )}
              >
                Syncing...
              </span>
            )}
          </h1>
          <p className={cn('text-sm mt-2', isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]')}>
            {user?.role === 'WHOLESALER'
              ? 'Manage orders and review return, refund, and dispute requests.'
              : 'Track orders and raise return, refund, or dispute requests from one place.'}
          </p>
        </div>
      </div>

      {/* Order Type Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-xl border border-zinc-800/10 bg-zinc-950/5 max-w-max mb-8">
        {[
          { id: 'ALL', label: 'All Orders' },
          { id: 'B2C', label: 'Retail (B2C)' },
          { id: 'B2B', label: 'Wholesale (B2B)' },
        ].map((tab) => {
          const count = counts[tab.id];
          const isActive = selectedType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTypeChange(tab.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border',
                isActive
                  ? isWholesalerPath
                    ? 'bg-amber-500/25 border-amber-500/35 text-amber-400 font-extrabold shadow-[0_2px_10px_rgba(245,158,11,0.1)]'
                    : 'bg-[#0047AB] border-[#0047AB] text-white font-extrabold'
                  : isWholesalerPath
                    ? 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                    : 'bg-transparent border-transparent text-zinc-600 hover:text-[#16171a] hover:bg-[#EFEFEF]'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono leading-none border',
                  isActive
                    ? isWholesalerPath
                      ? 'bg-amber-500/30 border-amber-500/20 text-amber-300'
                      : 'bg-white/20 border-white/10 text-white'
                    : isWholesalerPath
                      ? 'bg-zinc-900/80 border-zinc-800 text-zinc-500'
                      : 'bg-[#EFEFEF] border-[#C0C0C0] text-zinc-500'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Order Status Filter Pills */}
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
                  ? isWholesalerPath
                    ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-md shadow-amber-500/10'
                    : 'bg-[#0047AB] text-white border-[#0047AB] font-bold shadow-md shadow-blue-500/10'
                  : isWholesalerPath
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'bg-white border-[#C0C0C0] text-zinc-600 hover:text-[#16171a] hover:bg-[#EFEFEF]'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[10px] font-mono leading-none rounded-full px-1.5 py-0.5',
                  isActive
                    ? isWholesalerPath
                      ? 'bg-amber-600 text-black'
                      : 'bg-white/20 text-white'
                    : isWholesalerPath
                      ? 'bg-zinc-950 text-zinc-500'
                      : 'bg-[#EFEFEF] text-zinc-500'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isError ? (
        <div
          className={cn(
            'p-12 flex flex-col items-center justify-center text-center rounded-2xl border',
            isWholesalerPath
              ? 'bg-[#111111] border-zinc-800'
              : 'swiss-panel bg-[#f8f6f1] border-[#ddd7cc]'
          )}
        >
          <p className="text-[#8B0000] text-sm font-semibold mb-4">
            Failed to load orders:{' '}
            {error?.response?.data?.error || error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => refetch()}
            className={cn(
              'px-5 py-2.5 font-semibold rounded-md transition-colors text-white',
              isWholesalerPath
                ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold'
                : 'bg-[#0047AB] hover:bg-[#003B91]'
            )}
          >
            Retry Loading
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          className={cn(
            'border-dashed p-16 text-center flex flex-col items-center rounded-2xl border',
            isWholesalerPath ? 'bg-[#111111] border-zinc-800' : 'swiss-panel border-[#ddd7cc]'
          )}
        >
          <div
            className={cn(
              'p-5 rounded-md mb-5 border',
              isWholesalerPath
                ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                : 'bg-[#EFEFEF] border-[#C0C0C0] text-[#6C757D]'
            )}
          >
            <Package className="h-10 w-10 text-[#6C757D]" />
          </div>
          <h3
            className={cn(
              'text-lg font-bold tracking-wide',
              isWholesalerPath ? 'text-white' : 'text-[#16171a]'
            )}
          >
            No orders yet
          </h3>
          <p className={cn('mt-2 max-w-sm', isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]')}>
            When a transaction is made, the order details and invoice will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
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
