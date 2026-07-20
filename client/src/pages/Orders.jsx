import { useState, useMemo } from 'react';
import { Package, XCircle, RotateCcw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { cn } from '../utils/cn';
import { useOrders } from '../api/queries';
import OrderCard from '../components/orders/OrderCard';
import {
  OrdersLoadingSkeleton,
  OrdersHeaderSection,
  OrdersStatsCards,
  OrdersFilterTabs,
} from '../components/orders/OrdersFilterComponents';

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
    return <OrdersLoadingSkeleton isWholesalerPath={isWholesalerPath} />;
  }

  return (
    <div
      className={cn(
        'max-w-6xl mx-auto px-4 py-8 font-sans',
        isWholesalerPath ? 'text-zinc-200' : 'text-[#1e293b]'
      )}
    >
      <OrdersHeaderSection
        navigate={navigate}
        backPath={backPath}
        isWholesalerPath={isWholesalerPath}
        userRole={user?.role}
        isFetching={isFetching}
        isLoading={isLoading}
      />

      <OrdersStatsCards
        statusCounts={statusCounts}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        isWholesalerPath={isWholesalerPath}
      />

      <OrdersFilterTabs
        counts={counts}
        selectedType={selectedType}
        handleTypeChange={handleTypeChange}
        statusCounts={statusCounts}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        isWholesalerPath={isWholesalerPath}
      />

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
            type="button"
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
              type="button"
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
