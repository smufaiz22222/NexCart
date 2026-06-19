import { useMemo } from 'react';
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

  const { data: orders = [], isLoading, isError, error, isFetching, refetch } = useOrders();

  const sortedOrders = useMemo(
    () => [...orders].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    [orders]
  );

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
      ) : sortedOrders.length === 0 ? (
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
          {sortedOrders.map((order) => (
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
