import { cn } from '../../utils/cn';

export default function SellerCounterForm({
  rfq,
  counterState,
  setCounterState,
  onCancel,
  onSubmit,
  isWholesalerPath,
}) {
  return (
    <div
      className={cn(
        'mt-6 border-t pt-6 p-5 rounded-md border space-y-4',
        isWholesalerPath ? 'bg-zinc-900/50 border-zinc-800' : 'bg-[#EFEFEF]/30 border-[#C0C0C0]'
      )}
    >
      <h4 className={cn('font-bold text-sm', isWholesalerPath ? 'text-white' : 'text-[#16171a]')}>
        Propose Counter Offer
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            aria-label="Counter Offer Price"
            value={counterState.counterPrice}
            onChange={(e) => setCounterState({ ...counterState, counterPrice: e.target.value })}
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
            Counter Quantity (units)
          </label>
          <input
            type="number"
            aria-label="Counter Quantity"
            value={counterState.counterQuantity}
            onChange={(e) => setCounterState({ ...counterState, counterQuantity: e.target.value })}
            placeholder={`Original is ${rfq.quantity}`}
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
            aria-label="Counter Notes / Justification"
            value={counterState.sellerNotes}
            onChange={(e) => setCounterState({ ...counterState, sellerNotes: e.target.value })}
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
          onClick={onCancel}
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
            onSubmit(rfq.id, 'COUNTER_OFFERED', {
              counterPrice: counterState.counterPrice,
              counterQuantity: counterState.counterQuantity,
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
  );
}
