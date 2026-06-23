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
              'h-48 rounded-lg border',
              isWholesalerPath ? 'bg-zinc-900 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
            )}
          />
          <div
            className={cn(
              'h-48 rounded-lg border',
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
        'max-w-6xl mx-auto px-4 py-8 font-sans',
        isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
      )}
    >
      {/* Header Banner */}
      <div
        className={cn(
          'flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6 mb-8',
          isWholesalerPath ? 'border-zinc-800' : 'border-[#C0C0C0]'
        )}
      >
        <div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border',
              isWholesalerPath
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-[#EFEFEF] text-[#0047AB] border-[#C0C0C0]'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" /> B2B Price Desk
          </span>
          <h1
            className={cn(
              'text-3xl font-bold mt-4 tracking-tight',
              isWholesalerPath ? 'text-white' : 'text-[#16171a]'
            )}
          >
            RFQ Negotiation Room
          </h1>
          <p className={cn('text-sm mt-2', isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]')}>
            {isWholesaler
              ? 'Review custom quote bids, approve pricing tiers, or counter-propose custom invoice rates.'
              : 'Monitor custom quotes, review counter-offers, and proceed to checkout at accepted rates.'}
          </p>
        </div>
      </div>

      {rfqs.length === 0 ? (
        <div
          className={cn(
            'border-dashed p-16 text-center flex flex-col items-center justify-center rounded-2xl border',
            isWholesalerPath ? 'bg-[#111111] border-zinc-800' : 'swiss-panel'
          )}
        >
          <Clock
            className={cn(
              'w-12 h-12 mb-4 stroke-[1.5]',
              isWholesalerPath ? 'text-zinc-600' : 'text-[#C0C0C0]'
            )}
          />
          <h3
            className={cn('text-lg font-bold', isWholesalerPath ? 'text-white' : 'text-[#16171a]')}
          >
            No quotes under negotiation
          </h3>
          <p
            className={cn(
              'text-sm mt-1 max-w-md',
              isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
            )}
          >
            {isWholesaler
              ? 'When B2B business buyers request custom prices for your products, they will show up here.'
              : 'You haven\'t requested any custom prices yet. Use "Request Quote" on product detail pages.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Filter Tabs */}
          <RfqFilterTabs
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            counts={counts}
            isWholesalerPath={isWholesalerPath}
          />

          {filteredRfqs.length === 0 ? (
            <div
              className={cn(
                'border-dashed p-16 text-center flex flex-col items-center justify-center rounded-2xl border',
                isWholesalerPath ? 'bg-[#111111] border-zinc-800' : 'swiss-panel'
              )}
            >
              <Clock
                className={cn(
                  'w-12 h-12 mb-4 stroke-[1.5]',
                  isWholesalerPath ? 'text-zinc-600' : 'text-[#C0C0C0]'
                )}
              />
              <h3
                className={cn(
                  'text-lg font-bold',
                  isWholesalerPath ? 'text-white' : 'text-[#16171a]'
                )}
              >
                No quotes match this filter
              </h3>
              <p
                className={cn(
                  'text-sm mt-1 max-w-md',
                  isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                )}
              >
                There are no quotes in this section. Try choosing another filter above.
              </p>
            </div>
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
