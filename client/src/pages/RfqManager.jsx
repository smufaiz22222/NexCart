import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  XCircle,
  CheckCircle,
  FileText,
  DollarSign,
  Briefcase,
  AlertCircle,
  Send,
  Loader,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useRfqs, useRespondRfq, useAcceptQuote, useBuyerRespondRfq } from '../api/queries';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

export default function RfqManager() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: rfqs = [], isLoading, isError, refetch } = useRfqs();

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
          toast.success(status === 'REJECTED' ? 'Quote declined successfully' : 'Counter offer sent successfully');
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
    const maps = {
      PENDING: 'bg-amber-50 border-amber-100 text-amber-700',
      ACCEPTED: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      REJECTED: 'bg-rose-50 border-rose-100 text-rose-700',
      COUNTER_OFFERED: 'bg-blue-50 border-blue-100 text-blue-700',
      ORDER_PLACED: 'bg-purple-50 border-purple-100 text-purple-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded text-xs font-bold border uppercase tracking-wider ${maps[status] || 'bg-zinc-100 text-zinc-600'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-[#6b665f]">
        <Loader className="h-8 w-8 animate-spin text-[#161412]" />
        <p className="text-sm font-bold uppercase tracking-[0.24em]">Loading negotiations desk...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans text-[#161412]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#ddd7cc] pb-6 mb-8">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#161412]/5 text-[#161412]/80 border border-[#161412]/10 uppercase tracking-widest">
            <MessageSquare className="w-3.5 h-3.5" /> B2B Price Desk
          </span>
          <h1 className="text-3xl font-black mt-4 tracking-tight">RFQ Negotiation Room</h1>
          <p className="text-sm text-[#6b665f] mt-2">
            {isWholesaler 
              ? 'Review custom quote bids, approve pricing tiers, or counter-propose custom invoice rates.'
              : 'Monitor custom quotes, review counter-offers, and proceed to checkout at accepted rates.'
            }
          </p>
        </div>
      </div>

      {rfqs.length === 0 ? (
        <div className="bg-white rounded-[28px] border border-dashed border-[#ddd7cc] p-16 text-center flex flex-col items-center justify-center">
          <Clock className="w-12 h-12 text-[#ddd7cc] mb-4 stroke-[1.5]" />
          <h3 className="text-lg font-bold text-[#161412]">No quotes under negotiation</h3>
          <p className="text-sm text-[#6b665f] mt-1 max-w-md">
            {isWholesaler 
              ? 'When B2B business buyers request custom prices for your products, they will show up here.'
              : 'You haven\'t requested any custom prices yet. Use "Request Quote" on product detail pages.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {rfqs.map((rfq) => {
            const isCounterOpen = counterState.rfqId === rfq.id;
            return (
              <div 
                key={rfq.id}
                className="bg-white border border-[#ddd7cc] rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(22,20,18,0.01)] hover:border-[#161412]/20 transition-all p-6"
              >
                {/* 1. Header Information */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f3efe8] pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-[#f8f6f1] rounded-2xl flex items-center justify-center overflow-hidden border border-[#ddd7cc]/40">
                      {rfq.product?.imageUrl ? (
                        <img src={rfq.product.imageUrl} alt={rfq.product.name} className="h-full w-full object-contain mix-blend-multiply p-1" />
                      ) : (
                        <FileText className="w-6 h-6 text-[#8b857c]" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base">{rfq.product?.name}</h3>
                      <p className="text-xs text-[#6b665f] mt-0.5">
                        {isWholesaler 
                          ? `Requested by: ${rfq.buyer?.name || 'B2B Client'} (${rfq.buyer?.email})`
                          : `Merchant: ${rfq.seller?.businessName || 'Wholesaler'}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-[#f8f6f1] border border-[#ddd7cc] px-2 py-1 rounded">
                      ID: #{rfq.id.slice(0, 8).toUpperCase()}
                    </span>
                    {getStatusBadge(rfq.status)}
                  </div>
                </div>

                {/* 2. Parameters Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#f8f6f1]/50 border border-[#ddd7cc]/30 text-sm">
                  <div>
                    <p className="text-xs font-bold text-[#8f877b] uppercase tracking-wider">Requested Qty</p>
                    <p className="font-black text-[#161412] mt-1">{rfq.quantity} units</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#8f877b] uppercase tracking-wider">Catalog Price</p>
                    <p className="font-extrabold text-[#161412] mt-1">₹{parseFloat(rfq.product?.price || 0).toFixed(2)} / unit</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#8f877b] uppercase tracking-wider">Target Price Bid</p>
                    <p className="font-extrabold text-amber-600 mt-1">₹{parseFloat(rfq.targetPrice).toFixed(2)} / unit</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#8f877b] uppercase tracking-wider">Counter Proposed</p>
                    <p className="font-extrabold text-blue-600 mt-1">
                      {rfq.counterPrice ? `₹${parseFloat(rfq.counterPrice).toFixed(2)} / unit` : '--'}
                    </p>
                  </div>
                </div>

                {/* Notes logs */}
                <div className="mt-4 space-y-2 text-xs">
                  {rfq.notes && (
                    <div className="p-3 bg-white border border-[#ddd7cc]/60 rounded-xl leading-relaxed text-[#6b665f]">
                      <span className="font-black text-[#161412] mr-1">Buyer Notes:</span> {rfq.notes}
                    </div>
                  )}
                  {rfq.sellerNotes && (
                    <div className="p-3 bg-white border border-blue-100 rounded-xl leading-relaxed text-[#6b665f]">
                      <span className="font-black text-blue-800 mr-1">Seller Notes:</span> {rfq.sellerNotes}
                    </div>
                  )}
                </div>

                {/* 3. Action Triggers */}
                <div className="mt-6 border-t border-[#f3efe8] pt-4 flex flex-wrap justify-between items-center gap-4">
                  <span className="text-[11px] text-[#8f877b]">
                    Updated: {new Date(rfq.updatedAt).toLocaleDateString()}
                  </span>

                  {isWholesaler ? (
                    // WHOLESALER CONTROLS
                    <div className="flex gap-2">
                      {rfq.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleResponse(rfq.id, 'ACCEPTED')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-[#0a0a0a] font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
                          >
                            Accept Bid
                          </button>
                          <button
                            onClick={() => handleResponse(rfq.id, 'REJECTED')}
                            className="border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
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
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full transition-all"
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
                            className="bg-emerald-500 hover:bg-emerald-600 text-[#0a0a0a] font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5"
                          >
                            Accept Counter Offer
                          </button>
                          <button
                            onClick={() => {
                              setBuyerCounterState({ rfqId: rfq.id, targetPrice: '', notes: '' });
                              setCounterState({ rfqId: null, counterPrice: '', sellerNotes: '' });
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-all"
                          >
                            Counter Back
                          </button>
                          <button
                            onClick={() => handleBuyerResponse(rfq.id, 'REJECTED')}
                            className="border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-full transition-all"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {rfq.status === 'ACCEPTED' && (
                        <button
                          onClick={() => navigate('/store/cart')}
                          className="bg-[#161412] hover:bg-[#34302b] text-white font-black text-xs uppercase tracking-[0.16em] px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5"
                        >
                          Go to Cart to Checkout <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Counter offer sub-form (Wholesaler only) */}
                {isCounterOpen && (
                  <div className="mt-6 border-t border-[#f3efe8] pt-6 bg-[#f8f6f1]/50 p-5 rounded-2xl border border-[#ddd7cc] space-y-4">
                    <h4 className="font-bold text-sm text-[#161412]">Propose Counter Offer</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#8f877b] uppercase tracking-wider mb-2">
                          Counter Offer Price (₹ per unit) *
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={counterState.counterPrice}
                          onChange={(e) => setCounterState({ ...counterState, counterPrice: e.target.value })}
                          placeholder={`Bid is ₹${rfq.targetPrice}`}
                          className="w-full px-4 py-2 bg-white border border-[#ddd7cc] rounded-xl focus:outline-none focus:border-[#161412] text-sm font-mono text-[#161412]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#8f877b] uppercase tracking-wider mb-2">
                          Counter Notes / Justification
                        </label>
                        <input
                          type="text"
                          value={counterState.sellerNotes}
                          onChange={(e) => setCounterState({ ...counterState, sellerNotes: e.target.value })}
                          placeholder="Why this price? e.g. shipping/freight costs"
                          className="w-full px-4 py-2 bg-white border border-[#ddd7cc] rounded-xl focus:outline-none focus:border-[#161412] text-sm text-[#161412]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setCounterState({ rfqId: null, counterPrice: '', sellerNotes: '' })}
                        className="px-4 py-2 border border-[#ddd7cc] bg-white rounded-full text-xs font-medium hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResponse(rfq.id, 'COUNTER_OFFERED', {
                          counterPrice: counterState.counterPrice,
                          sellerNotes: counterState.sellerNotes
                        })}
                        className="px-4 py-2 bg-[#161412] text-white rounded-full text-xs font-bold hover:bg-[#34302b]"
                      >
                        Send Proposal
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Counter back sub-form (Buyer/Customer only) */}
                {buyerCounterState.rfqId === rfq.id && (
                  <div className="mt-6 border-t border-[#f3efe8] pt-6 bg-blue-50/10 p-5 rounded-2xl border border-blue-200/50 space-y-4">
                    <h4 className="font-bold text-sm text-[#161412] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Propose Counter Back
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#8f877b] uppercase tracking-wider mb-2">
                          New Target Price Bid (₹ per unit) *
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={buyerCounterState.targetPrice}
                          onChange={(e) => setBuyerCounterState({ ...buyerCounterState, targetPrice: e.target.value })}
                          placeholder={`Merchant counter is ₹${rfq.counterPrice || rfq.targetPrice}`}
                          className="w-full px-4 py-2 bg-white border border-[#ddd7cc] rounded-xl focus:outline-none focus:border-[#161412] text-sm font-mono text-[#161412]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#8f877b] uppercase tracking-wider mb-2">
                          Notes / Message to Seller
                        </label>
                        <input
                          type="text"
                          value={buyerCounterState.notes}
                          onChange={(e) => setBuyerCounterState({ ...buyerCounterState, notes: e.target.value })}
                          placeholder="Suggest why this target fits, e.g. shipping adjustment"
                          className="w-full px-4 py-2 bg-white border border-[#ddd7cc] rounded-xl focus:outline-none focus:border-[#161412] text-sm text-[#161412]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setBuyerCounterState({ rfqId: null, targetPrice: '', notes: '' })}
                        className="px-4 py-2 border border-[#ddd7cc] bg-white rounded-full text-xs font-medium hover:bg-zinc-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleBuyerResponse(rfq.id, 'PENDING', {
                          targetPrice: buyerCounterState.targetPrice,
                          notes: buyerCounterState.notes
                        })}
                        className="px-4 py-2 bg-[#161412] text-white rounded-full text-xs font-bold hover:bg-[#34302b]"
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
