import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Clock } from 'lucide-react';
import { useRfqs, useRespondRfq, useAcceptQuote, useBuyerRespondRfq } from '../api/queries';
import useAuthStore from '../store/authStore';
import useB2BCartStore from '../store/b2bCartStore';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import apiClient from '../api/axios';

import RfqFilterTabs from '../components/rfq/RfqFilterTabs';
import RfqCard from '../components/rfq/RfqCard';
import {
  RfqManagerSkeleton,
  RfqHeaderBanner,
  RfqEmptyState,
} from '../components/rfq/RfqManagerComponents';

export default function RfqManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { data: rfqs = [], isLoading, refetch } = useRfqs();

  const isWholesalerPath = location.pathname.startsWith('/wholesaler');

  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const counts = useMemo(() => {
    return {
      ALL: rfqs.length,
      PENDING_ACTIONS: rfqs.filter((r) => ['PENDING', 'COUNTER_OFFERED'].includes(r.status)).length,
      ACCEPTED: rfqs.filter((r) => r.status === 'ACCEPTED').length,
      REJECTED: rfqs.filter((r) => r.status === 'REJECTED').length,
      PAID: rfqs.filter((r) => r.status === 'ORDER_PLACED' && r.order?.status !== 'DELIVERED')
        .length,
      COMPLETED: rfqs.filter((r) => r.status === 'ORDER_PLACED' && r.order?.status === 'DELIVERED')
        .length,
    };
  }, [rfqs]);

  const filteredRfqs = useMemo(() => {
    if (selectedFilter === 'PENDING_ACTIONS') {
      return rfqs.filter((r) => ['PENDING', 'COUNTER_OFFERED'].includes(r.status));
    }
    if (selectedFilter === 'ACCEPTED') {
      return rfqs.filter((r) => r.status === 'ACCEPTED');
    }
    if (selectedFilter === 'REJECTED') {
      return rfqs.filter((r) => r.status === 'REJECTED');
    }
    if (selectedFilter === 'PAID') {
      return rfqs.filter((r) => r.status === 'ORDER_PLACED' && r.order?.status !== 'DELIVERED');
    }
    if (selectedFilter === 'COMPLETED') {
      return rfqs.filter((r) => r.status === 'ORDER_PLACED' && r.order?.status === 'DELIVERED');
    }
    return rfqs;
  }, [rfqs, selectedFilter]);

  const respondRfq = useRespondRfq();
  const acceptQuote = useAcceptQuote();
  const buyerRespondRfq = useBuyerRespondRfq();

  const [counterState, setCounterState] = useState({
    rfqId: null,
    counterPrice: '',
    counterQuantity: '',
    sellerNotes: '',
  });

  const [buyerCounterState, setBuyerCounterState] = useState({
    rfqId: null,
    targetPrice: '',
    quantity: '',
    notes: '',
  });

  const [updatingStockMap, setUpdatingStockMap] = useState({});
  const [isAdjustingStock, setIsAdjustingStock] = useState({});

  const handleUpdateStock = async (rfqId, productId, currentStock, newStockVal) => {
    const parsed = parseInt(newStockVal, 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Please enter a valid stock quantity');
      return;
    }
    const diff = parsed - currentStock;
    if (diff === 0) return;

    try {
      setIsAdjustingStock((prev) => ({ ...prev, [rfqId]: true }));
      await apiClient.post('/inventory', {
        productId,
        changeAmount: diff,
        reason: 'MANUAL_ADJUSTMENT',
      });
      toast.success('Inventory stock updated successfully!');
      // Reset input state for this RFQ
      setUpdatingStockMap((prev) => {
        const next = { ...prev };
        delete next[rfqId];
        return next;
      });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update stock');
    } finally {
      setIsAdjustingStock((prev) => ({ ...prev, [rfqId]: false }));
    }
  };

  const isWholesaler = user?.role === 'WHOLESALER';

  const handleResponse = (id, status, extra = {}) => {
    respondRfq.mutate(
      { id, status, ...extra },
      {
        onSuccess: () => {
          toast.success(`Quote successfully marked as ${status}`);
          setCounterState({ rfqId: null, counterPrice: '', counterQuantity: '', sellerNotes: '' });
          refetch();
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to update quote');
        },
      }
    );
  };

  const handleAcceptQuote = (rfq) => {
    acceptQuote.mutate(
      { id: rfq.id },
      {
        onSuccess: async () => {
          toast.success('Counter offer accepted! Added to B2B Cart.');
          try {
            const requiredQty =
              rfq.counterQuantity !== null && rfq.counterQuantity !== undefined
                ? rfq.counterQuantity
                : rfq.quantity;
            const finalPrice = rfq.counterPrice || rfq.targetPrice;
            await useB2BCartStore.getState().addItem({
              productId: rfq.productId,
              rfqId: rfq.id,
              quantity: requiredQty,
              unitPrice: finalPrice,
            });
            navigate('/store/dashboard/b2b/cart');
          } catch (err) {
            console.error('Failed to prepare B2B cart:', err);
            toast.error('Failed to add item to B2B cart. Please try again.');
            refetch();
          }
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to accept counter offer');
        },
      }
    );
  };

  const handleGoToCheckout = async (rfq) => {
    try {
      toast.success('Added to B2B Cart!');
      const requiredQty =
        rfq.counterQuantity !== null && rfq.counterQuantity !== undefined
          ? rfq.counterQuantity
          : rfq.quantity;
      const finalPrice = rfq.counterPrice || rfq.targetPrice;
      await useB2BCartStore.getState().addItem({
        productId: rfq.productId,
        rfqId: rfq.id,
        quantity: requiredQty,
        unitPrice: finalPrice,
      });
      navigate('/store/dashboard/b2b/cart');
    } catch (err) {
      console.error('Failed to prepare B2B cart:', err);
      toast.error('Failed to prepare B2B cart. Please try again.');
    }
  };

  const handleBuyerResponse = (id, status, extra = {}) => {
    buyerRespondRfq.mutate(
      { id, status, ...extra },
      {
        onSuccess: () => {
          toast.success(
            status === 'REJECTED'
              ? 'Quote declined successfully'
              : 'Counter offer sent successfully'
          );
          setBuyerCounterState({ rfqId: null, targetPrice: '', quantity: '', notes: '' });
          refetch();
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to submit response');
        },
      }
    );
  };

  if (isLoading) {
    return <RfqManagerSkeleton isWholesalerPath={isWholesalerPath} />;
  }

  return (
    <div
      className={cn(
        'max-w-6xl mx-auto px-4 py-8 font-sans',
        isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
      )}
    >
      <RfqHeaderBanner isWholesalerPath={isWholesalerPath} isWholesaler={isWholesaler} />

      {rfqs.length === 0 ? (
        <RfqEmptyState
          isWholesalerPath={isWholesalerPath}
          isWholesaler={isWholesaler}
          title="No quotes under negotiation"
        />
      ) : (
        <div className="space-y-6">
          <RfqFilterTabs
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            counts={counts}
            isWholesalerPath={isWholesalerPath}
          />

          {filteredRfqs.length === 0 ? (
            <RfqEmptyState
              isWholesalerPath={isWholesalerPath}
              isWholesaler={isWholesaler}
              title="No quotes match this filter"
              description="There are no quotes in this section. Try choosing another filter above."
            />
          ) : (
            filteredRfqs.map((rfq) => (
              <RfqCard
                key={rfq.id}
                rfq={rfq}
                isWholesaler={isWholesaler}
                isWholesalerPath={isWholesalerPath}
                updatingStockMap={updatingStockMap}
                setUpdatingStockMap={setUpdatingStockMap}
                isAdjustingStock={isAdjustingStock}
                handleUpdateStock={handleUpdateStock}
                handleResponse={handleResponse}
                handleAcceptQuote={handleAcceptQuote}
                handleGoToCheckout={handleGoToCheckout}
                handleBuyerResponse={handleBuyerResponse}
                counterState={counterState}
                setCounterState={setCounterState}
                buyerCounterState={buyerCounterState}
                setBuyerCounterState={setBuyerCounterState}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
