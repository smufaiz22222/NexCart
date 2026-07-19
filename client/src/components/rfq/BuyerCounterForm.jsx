import { Sparkles } from 'lucide-react';

export default function BuyerCounterForm({
  rfq,
  buyerCounterState,
  setBuyerCounterState,
  onCancel,
  onSubmit,
}) {
  return (
    <div className="mt-6 border-t border-[#C0C0C0] pt-6 bg-[#EFEFEF]/30 p-5 rounded-md border border-[#C0C0C0] space-y-4">
      <h4 className="font-bold text-sm text-[#16171a] flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-[#0047AB]" /> Propose Counter Back
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">
            New Target Price Bid (₹ per unit) *
          </label>
          <input
            required
            type="number"
            step="0.01"
            aria-label="New Target Price Bid"
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
            New Target Quantity Bid (units)
          </label>
          <input
            type="number"
            aria-label="New Target Quantity Bid"
            value={buyerCounterState.quantity}
            onChange={(e) =>
              setBuyerCounterState({
                ...buyerCounterState,
                quantity: e.target.value,
              })
            }
            placeholder={`Original is ${rfq.quantity}`}
            className="w-full px-4 py-2 bg-white border border-[#C0C0C0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0047AB] text-sm font-mono text-[#16171a]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#6C757D] uppercase tracking-wider mb-2">
            Notes / Message to Seller
          </label>
          <input
            type="text"
            aria-label="Notes / Message to Seller"
            value={buyerCounterState.notes}
            onChange={(e) => setBuyerCounterState({ ...buyerCounterState, notes: e.target.value })}
            placeholder="Suggest why this target fits, e.g. shipping adjustment"
            className="w-full px-4 py-2 bg-white border border-[#C0C0C0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#0047AB] text-sm text-[#16171a]"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-[#C0C0C0] bg-white rounded-md text-xs font-medium hover:bg-[#EFEFEF] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSubmit(rfq.id, 'PENDING', {
              targetPrice: buyerCounterState.targetPrice,
              quantity: buyerCounterState.quantity,
              notes: buyerCounterState.notes,
            })
          }
          className="px-4 py-2 bg-[#0047AB] text-white rounded-md text-xs font-bold hover:bg-[#003B91] transition-colors"
        >
          Send Counter Offer
        </button>
      </div>
    </div>
  );
}
