import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Sparkles, ArrowRight, FileText, Clock } from 'lucide-react';
import { useRfqs, useRespondRfq, useAcceptQuote, useBuyerRespondRfq } from '../api/queries';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import { cn } from '../utils/cn';

export default function RfqManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { data: rfqs = [], isLoading, refetch } = useRfqs();

  const isWholesalerPath = location.pathname.startsWith('/wholesaler');

  const respondRfq = useRespondRfq();
  const acceptQuote = useAcceptQuote();
  const buyerRespondRfq = useBuyerRespondRfq();

  const [counterState, setCounterState] = useState({
    rfqId: null,
    counterPrice: '',
    sellerNotes: '',
  });

  const [buyerCounterState, setBuyerCounterState] = useState({
    rfqId: null,
    targetPrice: '',
    notes: '',
  });

  const isWholesaler = user?.role === 'WHOLESALER';

  const handleResponse = (id, status, extra = {}) => {
    respondRfq.mutate(
      { id, status, ...extra },
      {
        onSuccess: () => {
          toast.success(`Quote successfully marked as ${status}`);
          setCounterState({ rfqId: null, counterPrice: '', sellerNotes: '' });
          refetch();
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to update quote');
        },
      }
    );
  };

  const handleAcceptQuote = (id) => {
    acceptQuote.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success('Counter offer accepted! Check your Cart or Checkout to proceed.');
          refetch();
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to accept counter offer');
        },
      }
    );
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
          setBuyerCounterState({ rfqId: null, targetPrice: '', notes: '' });
          refetch();
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to submit response');
        },
      }
    );
  };

  const getStatusBadge = (status) => {
    const maps = isWholesalerPath
      ? {
          PENDING: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          ACCEPTED: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          REJECTED: 'bg-red-500/10 border-red-500/20 text-red-400',
          COUNTER_OFFERED: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          ORDER_PLACED: 'bg-zinc-800 border-zinc-700 text-zinc-400',
        }
      : {
          PENDING: 'bg-[#EFEFEF] border-[#C0C0C0] text-amber-800',
          ACCEPTED: 'bg-[#EFEFEF] border-[#C0C0C0] text-emerald-800',
          REJECTED: 'bg-[#EFEFEF] border-[#C0C0C0] text-[#8B0000]',
          COUNTER_OFFERED: 'bg-[#EFEFEF] border-[#C0C0C0] text-[#0047AB]',
          ORDER_PLACED: 'bg-[#EFEFEF] border-[#C0C0C0] text-[#6C757D]',
        };
    return (
      <span
        className={cn(
          'px-2.5 py-1 rounded-md text-xs font-semibold border uppercase tracking-wider',
          maps[status] ||
            (isWholesalerPath
              ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
              : 'bg-[#EFEFEF] text-[#6C757D] border-[#C0C0C0]')
        )}
      >
        {status.replace('_', ' ')}
      </span>
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
          {rfqs.map((rfq) => {
            const isCounterOpen = counterState.rfqId === rfq.id;
            return (
              <div
                key={rfq.id}
                className={cn(
                  'p-6 space-y-6 rounded-2xl border transition-all duration-300 shadow-md',
                  isWholesalerPath
                    ? 'bg-[#1c1c1c] border-zinc-800 hover:border-zinc-700'
                    : 'swiss-card bg-white border-[#ddd7cc] hover:border-[#c8c1b4]'
                )}
              >
                {/* 1. Header Information */}
                <div
                  className={cn(
                    'flex flex-wrap items-start justify-between gap-4 border-b pb-4',
                    isWholesalerPath ? 'border-zinc-800' : 'border-[#C0C0C0]'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'h-16 w-16 rounded-md flex items-center justify-center overflow-hidden border',
                        isWholesalerPath
                          ? 'bg-zinc-950 border-zinc-800'
                          : 'bg-[#EFEFEF] border-[#C0C0C0]'
                      )}
                    >
                      {rfq.product?.imageUrl ? (
                        <img
                          src={rfq.product.imageUrl}
                          alt={rfq.product.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <FileText
                          className={cn(
                            'w-6 h-6',
                            isWholesalerPath ? 'text-zinc-600' : 'text-[#6C757D]'
                          )}
                        />
                      )}
                    </div>
                    <div>
                      <h3
                        className={cn(
                          'font-bold text-base',
                          isWholesalerPath ? 'text-white' : 'text-[#16171a]'
                        )}
                      >
                        {rfq.product?.name}
                      </h3>
                      <p
                        className={cn(
                          'text-xs mt-0.5',
                          isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
                        )}
                      >
                        {isWholesaler
                          ? `Requested by: ${rfq.buyer?.name || 'B2B Client'} (${rfq.buyer?.email})`
                          : `Merchant: ${rfq.seller?.businessName || 'Wholesaler'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'text-xs font-mono px-2.5 py-1 rounded-md font-semibold border',
                        isWholesalerPath
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                          : 'bg-[#EFEFEF] border-[#C0C0C0] text-[#16171a]'
                      )}
                    >
                      ID: #{rfq.id.slice(0, 8).toUpperCase()}
                    </span>
                    {getStatusBadge(rfq.status)}
                  </div>
                </div>

                {/* 2. Parameters Grid */}
                <div
                  className={cn(
                    'grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-md text-sm border',
                    isWholesalerPath
                      ? 'bg-zinc-950 border-zinc-800'
                      : 'bg-[#EFEFEF]/30 border-[#C0C0C0]/40'
                  )}
                >
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wider',
                        isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                      )}
                    >
                      Requested Qty
                    </p>
                    <p
                      className={cn(
                        'font-bold font-mono mt-1',
                        isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
                      )}
                    >
                      {rfq.quantity} units
                    </p>
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wider',
                        isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                      )}
                    >
                      Catalog Price
                    </p>
                    <p
                      className={cn(
                        'font-bold font-mono mt-1',
                        isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
                      )}
                    >
                      ₹{parseFloat(rfq.product?.price || 0).toFixed(2)} / unit
                    </p>
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wider',
                        isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                      )}
                    >
                      Target Price Bid
                    </p>
                    <p
                      className={cn(
                        'font-bold font-mono mt-1',
                        isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]'
                      )}
                    >
                      ₹{parseFloat(rfq.targetPrice).toFixed(2)} / unit
                    </p>
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wider',
                        isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                      )}
                    >
                      Counter Proposed
                    </p>
                    <p
                      className={cn(
                        'font-bold font-mono mt-1',
                        isWholesalerPath ? 'text-emerald-400' : 'text-emerald-800'
                      )}
                    >
                      {rfq.counterPrice
                        ? `₹${parseFloat(rfq.counterPrice).toFixed(2)} / unit`
                        : '--'}
                    </p>
                  </div>
                </div>

                {/* Notes logs */}
                <div className="space-y-2 text-xs">
                  {rfq.notes && (
                    <div
                      className={cn(
                        'p-3 rounded-md leading-relaxed border',
                        isWholesalerPath
                          ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                          : 'bg-white border-[#C0C0C0] text-[#16171a]'
                      )}
                    >
                      <span
                        className={cn(
                          'font-bold mr-1',
                          isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
                        )}
                      >
                        Buyer Notes:
                      </span>{' '}
                      {rfq.notes}
                    </div>
                  )}
                  {rfq.sellerNotes && (
                    <div
                      className={cn(
                        'p-3 rounded-md leading-relaxed border',
                        isWholesalerPath
                          ? 'bg-zinc-900/30 border-zinc-800 text-zinc-300'
                          : 'bg-[#EFEFEF]/20 border-[#C0C0C0] text-[#16171a]'
                      )}
                    >
                      <span
                        className={cn(
                          'font-bold mr-1',
                          isWholesalerPath ? 'text-amber-500' : 'text-[#0047AB]'
                        )}
                      >
                        Seller Notes:
                      </span>{' '}
                      {rfq.sellerNotes}
                    </div>
                  )}
                </div>

                {/* 3. Action Triggers */}
                <div
                  className={cn(
                    'border-t pt-4 flex flex-wrap justify-between items-center gap-4',
                    isWholesalerPath ? 'border-zinc-800' : 'border-[#C0C0C0]'
                  )}
                >
                  <span
                    className={cn(
                      'text-[11px] font-mono',
                      isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                    )}
                  >
                    Updated: {new Date(rfq.updatedAt).toLocaleDateString()}
                  </span>

                  {isWholesaler ? (
                    // WHOLESALER CONTROLS
                    <div className="flex gap-2">
                      {rfq.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleResponse(rfq.id, 'ACCEPTED')}
                            className={cn(
                              'font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-md transition-all active:scale-[0.98]',
                              isWholesalerPath
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
                                : 'bg-[#0047AB] hover:bg-[#003B91] text-white'
                            )}
                          >
                            Accept Bid
                          </button>
                          <button
                            onClick={() => handleResponse(rfq.id, 'REJECTED')}
                            className={cn(
                              'font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-md transition-all active:scale-[0.98] border',
                              isWholesalerPath
                                ? 'border-zinc-800 bg-zinc-900 text-red-400 hover:bg-red-500/10 hover:border-red-500/20'
                                : 'border-[#C0C0C0] bg-white hover:bg-[#EFEFEF] text-[#8B0000]'
                            )}
                          >
                            Reject Quote
                          </button>
                        </>
                      )}
                      {(rfq.status === 'PENDING' || rfq.status === 'REJECTED') && (
                        <button
                          onClick={() => {
                            setCounterState({ rfqId: rfq.id, counterPrice: '', sellerNotes: '' });
                            setBuyerCounterState({ rfqId: null, targetPrice: '', notes: '' });
                          }}
                          className={cn(
                            'font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-md transition-all active:scale-[0.98]',
                            isWholesalerPath
                              ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-md shadow-amber-500/10'
                              : 'bg-[#0047AB] hover:bg-[#003B91] text-white'
                          )}
                        >
                          {rfq.status === 'REJECTED' ? 'Send Another Offer' : 'Counter Offer'}
                        </button>
                      )}
                    </div>
                  ) : (
                    // CUSTOMER CONTROLS
                    <div className="flex gap-2">
                      {rfq.status === 'COUNTER_OFFERED' && (
                        <>
                          <button
                            onClick={() => handleAcceptQuote(rfq.id)}
                            className="bg-[#0047AB] hover:bg-[#003B91] text-white font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors"
                          >
                            Accept Counter Offer
                          </button>
                          <button
                            onClick={() => {
                              setBuyerCounterState({ rfqId: rfq.id, targetPrice: '', notes: '' });
                              setCounterState({ rfqId: null, counterPrice: '', sellerNotes: '' });
                            }}
                            className="bg-white border border-[#C0C0C0] hover:bg-[#EFEFEF] text-[#0047AB] font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors"
                          >
                            Counter Back
                          </button>
                          <button
                            onClick={() => handleBuyerResponse(rfq.id, 'REJECTED')}
                            className="border border-[#C0C0C0] bg-white hover:bg-[#EFEFEF] text-[#8B0000] font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {rfq.status === 'ACCEPTED' && (
                        <button
                          onClick={() => navigate('/store/cart')}
                          className="bg-[#0047AB] hover:bg-[#003B91] text-white font-semibold text-xs uppercase tracking-wider px-5 py-2.5 rounded-md transition-colors flex items-center gap-1.5"
                        >
                          Go to Checkout <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Counter offer sub-form (Wholesaler only) */}
                {isCounterOpen && (
                  <div
                    className={cn(
                      'mt-6 border-t pt-6 p-5 rounded-md border space-y-4',
                      isWholesalerPath
                        ? 'bg-zinc-900/50 border-zinc-800'
                        : 'bg-[#EFEFEF]/30 border-[#C0C0C0]'
                    )}
                  >
                    <h4
                      className={cn(
                        'font-bold text-sm',
                        isWholesalerPath ? 'text-white' : 'text-[#16171a]'
                      )}
                    >
                      Propose Counter Offer
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          className={cn(
                            'block text-xs font-semibold uppercase tracking-wider mb-2',
                            isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
                          )}
                        >
                          Counter Offer Price (₹ per unit) *
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={counterState.counterPrice}
                          onChange={(e) =>
                            setCounterState({ ...counterState, counterPrice: e.target.value })
                          }
                          placeholder={`Bid is ₹${rfq.targetPrice}`}
                          className={cn(
                            'w-full px-4 py-2 rounded-md focus:outline-none focus:ring-1 text-sm font-mono transition-all border',
                            isWholesalerPath
                              ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-amber-500'
                              : 'bg-white border-[#C0C0C0] text-[#16171a] focus:ring-[#0047AB]'
                          )}
                        />
                      </div>
                      <div>
                        <label
                          className={cn(
                            'block text-xs font-semibold uppercase tracking-wider mb-2',
                            isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
                          )}
                        >
                          Counter Notes / Justification
                        </label>
                        <input
                          type="text"
                          value={counterState.sellerNotes}
                          onChange={(e) =>
                            setCounterState({ ...counterState, sellerNotes: e.target.value })
                          }
                          placeholder="Why this price? e.g. shipping/freight costs"
                          className={cn(
                            'w-full px-4 py-2 rounded-md focus:outline-none focus:ring-1 text-sm transition-all border',
                            isWholesalerPath
                              ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:ring-amber-500'
                              : 'bg-white border-[#C0C0C0] text-[#16171a] focus:ring-[#0047AB]'
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          setCounterState({ rfqId: null, counterPrice: '', sellerNotes: '' })
                        }
                        className={cn(
                          'px-4 py-2 rounded-md text-xs font-medium transition-all border',
                          isWholesalerPath
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                            : 'bg-white border-[#C0C0C0] text-zinc-700 hover:bg-[#EFEFEF]'
                        )}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          handleResponse(rfq.id, 'COUNTER_OFFERED', {
                            counterPrice: counterState.counterPrice,
                            sellerNotes: counterState.sellerNotes,
                          })
                        }
                        className={cn(
                          'px-4 py-2 rounded-md text-xs font-bold transition-all',
                          isWholesalerPath
                            ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold'
                            : 'bg-[#0047AB] text-white hover:bg-[#003B91]'
                        )}
                      >
                        Send Proposal
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Counter back sub-form (Buyer/Customer only) */}
                {buyerCounterState.rfqId === rfq.id && (
                  <div className="mt-6 border-t border-[#C0C0C0] pt-6 bg-[#EFEFEF]/30 p-5 rounded-md border border-[#C0C0C0] space-y-4">
                    <h4 className="font-bold text-sm text-[#16171a] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#0047AB]" /> Propose Counter Back
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">
                          New Target Price Bid (₹ per unit) *
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={buyerCounterState.targetPrice}
                          onChange={(e) =>
                            setBuyerCounterState({
                              ...buyerCounterState,
                              targetPrice: e.target.value,
                            })
                          }
                          placeholder={`Merchant counter is ₹${rfq.counterPrice || rfq.targetPrice}`}
                          className="w-full px-4 py-2 bg-white border border-[#C0C0C0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0047AB] text-sm font-mono text-[#16171a]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">
                          Notes / Message to Seller
                        </label>
                        <input
                          type="text"
                          value={buyerCounterState.notes}
                          onChange={(e) =>
                            setBuyerCounterState({ ...buyerCounterState, notes: e.target.value })
                          }
                          placeholder="Suggest why this target fits, e.g. shipping adjustment"
                          className="w-full px-4 py-2 bg-white border border-[#C0C0C0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0047AB] text-sm text-[#16171a]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          setBuyerCounterState({ rfqId: null, targetPrice: '', notes: '' })
                        }
                        className="px-4 py-2 border border-[#C0C0C0] bg-white rounded-md text-xs font-medium hover:bg-[#EFEFEF] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          handleBuyerResponse(rfq.id, 'PENDING', {
                            targetPrice: buyerCounterState.targetPrice,
                            notes: buyerCounterState.notes,
                          })
                        }
                        className="px-4 py-2 bg-[#0047AB] text-white rounded-md text-xs font-bold hover:bg-[#003B91] transition-colors"
                      >
                        Send Counter Offer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
