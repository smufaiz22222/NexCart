import { MessageSquare, ArrowRight, FileText, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';
import SellerCounterForm from './SellerCounterForm';
import BuyerCounterForm from './BuyerCounterForm';

const toMoney = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
};

const getActiveOffer = (rfq) => {
  const isCounter = rfq.status === 'COUNTER_OFFERED';
  const unitPrice = isCounter
    ? Number(rfq.counterPrice ?? rfq.targetPrice)
    : Number(rfq.targetPrice);
  const quantity =
    isCounter && rfq.counterQuantity !== null && rfq.counterQuantity !== undefined
      ? Number(rfq.counterQuantity)
      : Number(rfq.quantity);
  return {
    isCounter,
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    quantity: Number.isFinite(quantity) ? quantity : 0,
  };
};

const getStatusBadge = (status, isWholesalerPath) => {
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

function RfqCardHeader({ rfq, isWholesaler, isWholesalerPath }) {
  return (
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
            isWholesalerPath ? 'bg-zinc-950 border-zinc-800' : 'bg-[#EFEFEF] border-[#C0C0C0]'
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
              className={cn('w-6 h-6', isWholesalerPath ? 'text-zinc-600' : 'text-[#6C757D]')}
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
            className={cn('text-xs mt-0.5', isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]')}
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
            'text-xs font-mono px-2.5 py-1 rounded-md border',
            isWholesalerPath
              ? 'bg-zinc-950 text-zinc-400 border-zinc-800'
              : 'bg-white text-[#16171a] border-[#C0C0C0]'
          )}
        >
          RFQ-{rfq.id.slice(0, 6).toUpperCase()}
        </span>
        {getStatusBadge(rfq.status, isWholesalerPath)}
      </div>
    </div>
  );
}

function RfqCardNegotiationGrid({ rfq, isWholesalerPath }) {
  const offer = getActiveOffer(rfq);
  const catalogPrice = Number(rfq.product?.price);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        className={cn(
          'p-3.5 rounded-lg border',
          isWholesalerPath ? 'bg-zinc-950 border-zinc-800/80' : 'bg-[#faf9f7] border-[#ddd7cc]'
        )}
      >
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider mb-1',
            isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
          )}
        >
          Original Catalog Price
        </p>
        <p
          className={cn(
            'text-sm font-semibold font-mono',
            isWholesalerPath ? 'text-zinc-300' : 'text-[#16171a]'
          )}
        >
          {Number.isFinite(catalogPrice) ? `₹${toMoney(catalogPrice)}` : 'N/A'}
        </p>
      </div>

      <div
        className={cn(
          'p-3.5 rounded-lg border',
          isWholesalerPath ? 'bg-zinc-950 border-zinc-800/80' : 'bg-[#faf9f7] border-[#ddd7cc]'
        )}
      >
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider mb-1',
            isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
          )}
        >
          {offer.isCounter ? 'Merchant Counter Price' : 'Target Price Bid'}
        </p>
        <p
          className={cn(
            'text-base font-bold font-mono',
            isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]'
          )}
        >
          ₹{toMoney(offer.unitPrice)}
        </p>
        {offer.isCounter && (
          <p
            className={cn(
              'text-[10px] mt-1 font-mono',
              isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
            )}
          >
            Buyer bid was ₹{toMoney(rfq.targetPrice)}
          </p>
        )}
      </div>

      <div
        className={cn(
          'p-3.5 rounded-lg border',
          isWholesalerPath ? 'bg-zinc-950 border-zinc-800/80' : 'bg-[#faf9f7] border-[#ddd7cc]'
        )}
      >
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider mb-1',
            isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
          )}
        >
          {offer.isCounter ? 'Counter Quantity' : 'Requested Quantity'}
        </p>
        <p
          className={cn(
            'text-sm font-bold font-mono',
            isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
          )}
        >
          {offer.quantity} units
        </p>
        {offer.isCounter &&
          rfq.counterQuantity !== null &&
          rfq.counterQuantity !== undefined &&
          Number(rfq.counterQuantity) !== Number(rfq.quantity) && (
            <p
              className={cn(
                'text-[10px] mt-1 font-mono',
                isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
              )}
            >
              Original request: {rfq.quantity} units
            </p>
          )}
      </div>

      <div
        className={cn(
          'p-3.5 rounded-lg border',
          isWholesalerPath ? 'bg-zinc-950 border-zinc-800/80' : 'bg-[#faf9f7] border-[#ddd7cc]'
        )}
      >
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider mb-1',
            isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
          )}
        >
          {offer.isCounter ? 'Counter Deal Total' : 'Total Projected Deal'}
        </p>
        <p
          className={cn(
            'text-sm font-bold font-mono',
            isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
          )}
        >
          ₹{toMoney(offer.unitPrice * offer.quantity)}
        </p>
      </div>
    </div>
  );
}

function RfqCounterOfferPanel({ rfq, isWholesaler, isWholesalerPath }) {
  if (rfq.status !== 'COUNTER_OFFERED') return null;

  const offer = getActiveOffer(rfq);

  return (
    <div
      className={cn(
        'p-4 rounded-xl border space-y-3',
        isWholesalerPath
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-100'
          : 'bg-[#eef4ff] border-[#b7c9ef] text-[#16171a]'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {isWholesaler ? 'Your Counter Offer Sent' : 'Counter Offer Received'}
          </span>
          <p
            className={cn(
              'text-[11px] mt-1',
              isWholesalerPath ? 'text-amber-200/80' : 'text-[#0047AB]'
            )}
          >
            {isWholesaler
              ? 'Waiting for the buyer to accept, counter back, or decline.'
              : 'Review the merchant terms below, then accept, counter back, or decline.'}
          </p>
        </div>
        <span className="text-sm font-mono font-bold">
          ₹{toMoney(offer.unitPrice)} / unit · {offer.quantity} units
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div
          className={cn(
            'rounded-lg border px-3 py-2',
            isWholesalerPath ? 'border-amber-500/20 bg-black/20' : 'border-[#c5d4f2] bg-white'
          )}
        >
          <p className={cn('uppercase tracking-wider mb-1', isWholesalerPath ? 'text-amber-200/70' : 'text-[#6C757D]')}>
            Unit Price
          </p>
          <p className="font-mono font-bold">₹{toMoney(offer.unitPrice)}</p>
        </div>
        <div
          className={cn(
            'rounded-lg border px-3 py-2',
            isWholesalerPath ? 'border-amber-500/20 bg-black/20' : 'border-[#c5d4f2] bg-white'
          )}
        >
          <p className={cn('uppercase tracking-wider mb-1', isWholesalerPath ? 'text-amber-200/70' : 'text-[#6C757D]')}>
            Quantity
          </p>
          <p className="font-mono font-bold">{offer.quantity} units</p>
        </div>
        <div
          className={cn(
            'rounded-lg border px-3 py-2',
            isWholesalerPath ? 'border-amber-500/20 bg-black/20' : 'border-[#c5d4f2] bg-white'
          )}
        >
          <p className={cn('uppercase tracking-wider mb-1', isWholesalerPath ? 'text-amber-200/70' : 'text-[#6C757D]')}>
            Deal Total
          </p>
          <p className="font-mono font-bold">₹{toMoney(offer.unitPrice * offer.quantity)}</p>
        </div>
      </div>

      {rfq.sellerNotes && (
        <p className="text-xs italic opacity-90 font-sans">&quot;{rfq.sellerNotes}&quot;</p>
      )}
    </div>
  );
}

function RfqCardStockWarning({
  rfq,
  isWholesaler,
  isWholesalerPath,
  currentStock,
  buyerRequiredQty,
  updatingStockMap,
  setUpdatingStockMap,
  isAdjustingStock,
  handleUpdateStock,
}) {
  if (!isWholesaler || rfq.status === 'ORDER_PLACED') return null;

  return (
    <div
      className={cn(
        'p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs',
        currentStock >= buyerRequiredQty
          ? isWholesalerPath
            ? 'bg-zinc-950/60 border-zinc-800 text-zinc-300'
            : 'bg-[#faf9f7] border-[#ddd7cc] text-zinc-700'
          : isWholesalerPath
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-red-50 border-red-200 text-red-800'
      )}
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle
          className={cn(
            'w-4 h-4 shrink-0',
            currentStock >= buyerRequiredQty
              ? isWholesalerPath
                ? 'text-amber-400'
                : 'text-[#0047AB]'
              : 'text-red-500'
          )}
        />
        <div>
          <p className="font-bold uppercase tracking-wider text-[10px]">Merchant Inventory Check</p>
          <p className="mt-0.5">
            Current Stock: <strong className="font-mono">{currentStock} units</strong> | Required
            for Deal: <strong className="font-mono">{buyerRequiredQty} units</strong>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto">
        <input
          type="number"
          min="0"
          placeholder="New stock Qty"
          aria-label="New stock quantity"
          value={
            updatingStockMap[rfq.id] !== undefined
              ? updatingStockMap[rfq.id]
              : rfq.product?.currentStock || ''
          }
          onChange={(e) => setUpdatingStockMap({ ...updatingStockMap, [rfq.id]: e.target.value })}
          className={cn(
            'w-28 px-3 py-1.5 rounded text-xs font-mono border focus:outline-none focus:ring-1',
            isWholesalerPath
              ? 'bg-zinc-900 border-zinc-700 text-white focus:ring-amber-500'
              : 'bg-white border-[#C0C0C0] text-[#16171a] focus:ring-[#0047AB]'
          )}
        />
        <button
          type="button"
          onClick={() =>
            handleUpdateStock(
              rfq.id,
              rfq.productId,
              currentStock,
              updatingStockMap[rfq.id] !== undefined ? updatingStockMap[rfq.id] : rfq.quantity
            )
          }
          disabled={isAdjustingStock[rfq.id]}
          className={cn(
            'px-3.5 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-50',
            isWholesalerPath
              ? 'bg-amber-500 hover:bg-amber-400 text-black'
              : 'bg-[#0047AB] hover:bg-[#003B91] text-white'
          )}
        >
          {isAdjustingStock[rfq.id] ? 'Updating...' : 'Update Stock'}
        </button>
      </div>
    </div>
  );
}

function RfqCardActions({
  rfq,
  isWholesaler,
  isWholesalerPath,
  hasEnoughStockForSeller,
  handleResponse,
  setCounterState,
  setBuyerCounterState,
  handleAcceptQuote,
  handleBuyerResponse,
  handleGoToCheckout,
}) {
  return (
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
        <div className="flex gap-2">
          {rfq.status === 'PENDING' && (
            <>
              <button
                type="button"
                disabled={!hasEnoughStockForSeller}
                onClick={() => handleResponse(rfq.id, 'ACCEPTED')}
                className={cn(
                  'font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-md transition-all active:scale-[0.98]',
                  !hasEnoughStockForSeller
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-50'
                    : isWholesalerPath
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
                      : 'bg-[#0047AB] hover:bg-[#003B91] text-white'
                )}
              >
                Accept Bid
              </button>
              <button
                type="button"
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
              type="button"
              onClick={() => {
                setCounterState({
                  rfqId: rfq.id,
                  counterPrice: '',
                  counterQuantity: '',
                  sellerNotes: '',
                });
                setBuyerCounterState({
                  rfqId: null,
                  targetPrice: '',
                  quantity: '',
                  notes: '',
                });
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
          {rfq.status === 'COUNTER_OFFERED' && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-md border',
                isWholesalerPath
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                  : 'border-[#C0C0C0] bg-[#EFEFEF] text-[#0047AB]'
              )}
            >
              <Clock className="w-3.5 h-3.5" /> Awaiting buyer response
            </span>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {rfq.status === 'COUNTER_OFFERED' && (
            <>
              <button
                type="button"
                onClick={() => handleAcceptQuote(rfq)}
                className="font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors text-white bg-[#0047AB] hover:bg-[#003B91]"
              >
                Accept Counter Offer
              </button>
              <button
                type="button"
                onClick={() => {
                  setBuyerCounterState({
                    rfqId: rfq.id,
                    targetPrice: '',
                    quantity: '',
                    notes: '',
                  });
                  setCounterState({
                    rfqId: null,
                    counterPrice: '',
                    counterQuantity: '',
                    sellerNotes: '',
                  });
                }}
                className="bg-white border border-[#C0C0C0] hover:bg-[#EFEFEF] text-[#0047AB] font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors"
              >
                Counter Back
              </button>
              <button
                type="button"
                onClick={() => handleBuyerResponse(rfq.id, 'REJECTED')}
                className="border border-[#C0C0C0] bg-white hover:bg-[#EFEFEF] text-[#8B0000] font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors"
              >
                Decline
              </button>
            </>
          )}
          {rfq.status === 'ACCEPTED' && (
            <button
              type="button"
              onClick={() => handleGoToCheckout(rfq)}
              className="bg-[#0047AB] hover:bg-[#003B91] text-white font-semibold text-xs uppercase tracking-wider px-5 py-2.5 rounded-md transition-colors flex items-center gap-1.5"
            >
              Go to Checkout <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function RfqCard({
  rfq,
  isWholesaler,
  isWholesalerPath,
  updatingStockMap,
  setUpdatingStockMap,
  isAdjustingStock,
  handleUpdateStock,
  handleResponse,
  handleAcceptQuote,
  handleGoToCheckout,
  handleBuyerResponse,
  counterState,
  setCounterState,
  buyerCounterState,
  setBuyerCounterState,
}) {
  const isCounterOpen = counterState.rfqId === rfq.id;
  const isBuyerCounterOpen = buyerCounterState.rfqId === rfq.id;
  const currentStock = rfq.product?.currentStock ?? 0;
  const buyerRequiredQty =
    rfq.counterQuantity !== null && rfq.counterQuantity !== undefined
      ? rfq.counterQuantity
      : rfq.quantity;
  const hasEnoughStockForSeller = currentStock >= rfq.quantity;

  return (
    <div
      className={cn(
        'p-6 space-y-6 rounded-2xl border transition-all duration-300 shadow-md',
        isWholesalerPath
          ? 'bg-[#1c1c1c] border-zinc-800 hover:border-zinc-700'
          : 'swiss-card bg-white border-[#ddd7cc] hover:border-[#c8c1b4]'
      )}
    >
      <RfqCardHeader rfq={rfq} isWholesaler={isWholesaler} isWholesalerPath={isWholesalerPath} />

      <RfqCardNegotiationGrid rfq={rfq} isWholesalerPath={isWholesalerPath} />

      <RfqCounterOfferPanel
        rfq={rfq}
        isWholesaler={isWholesaler}
        isWholesalerPath={isWholesalerPath}
      />

      {/* Counter Offer Form (Seller) */}
      {isCounterOpen && (
        <SellerCounterForm
          rfq={rfq}
          counterState={counterState}
          setCounterState={setCounterState}
          onCancel={() =>
            setCounterState({
              rfqId: null,
              counterPrice: '',
              counterQuantity: '',
              sellerNotes: '',
            })
          }
          onSubmit={handleResponse}
          isWholesalerPath={isWholesalerPath}
        />
      )}

      {/* Counter Offer Form (Buyer Counter Back) */}
      {isBuyerCounterOpen && (
        <BuyerCounterForm
          rfq={rfq}
          buyerCounterState={buyerCounterState}
          setBuyerCounterState={setBuyerCounterState}
          onCancel={() =>
            setBuyerCounterState({
              rfqId: null,
              targetPrice: '',
              quantity: '',
              notes: '',
            })
          }
          onSubmit={handleBuyerResponse}
        />
      )}

      <RfqCardStockWarning
        rfq={rfq}
        isWholesaler={isWholesaler}
        isWholesalerPath={isWholesalerPath}
        currentStock={currentStock}
        buyerRequiredQty={buyerRequiredQty}
        updatingStockMap={updatingStockMap}
        setUpdatingStockMap={setUpdatingStockMap}
        isAdjustingStock={isAdjustingStock}
        handleUpdateStock={handleUpdateStock}
      />

      <RfqCardActions
        rfq={rfq}
        isWholesaler={isWholesaler}
        isWholesalerPath={isWholesalerPath}
        hasEnoughStockForSeller={hasEnoughStockForSeller}
        handleResponse={handleResponse}
        setCounterState={setCounterState}
        setBuyerCounterState={setBuyerCounterState}
        handleAcceptQuote={handleAcceptQuote}
        handleBuyerResponse={handleBuyerResponse}
        handleGoToCheckout={handleGoToCheckout}
      />
    </div>
  );
}
