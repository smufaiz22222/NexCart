import { Landmark } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function B2BCartOrderSummary({
  items,
  totals,
  formatCurrency,
  checkoutError,
  handlePlaceOrder,
  isProcessing,
  isMutating,
}) {
  return (
    <div className="lg:sticky lg:top-24">
      <div className="border border-[#EFEFEF] rounded-xl p-6 bg-[#fafafa] space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] border-b border-[#EFEFEF] pb-3">
          B2B Order Summary
        </h2>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs py-1">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.name}</p>
                <p className="text-[#6C757D]">x{item.quantity}</p>
              </div>
              <p className="font-bold ml-3 shrink-0">{formatCurrency(item.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-[#EFEFEF] pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#6C757D]">Items</span>
            <span className="font-semibold">{totals.itemCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6C757D]">Payment Method</span>
            <span className="font-semibold text-[#0047AB]">Bank Transfer</span>
          </div>
        </div>

        <div className="border-t border-[#EFEFEF] pt-3 flex justify-between items-center">
          <span className="font-bold">Total</span>
          <span className="text-xl font-bold font-mono text-[#0047AB]">
            {formatCurrency(totals.subtotal)}
          </span>
        </div>

        {checkoutError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
            {checkoutError}
          </p>
        )}

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={isProcessing || isMutating}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors',
            isProcessing || isMutating
              ? 'bg-[#C0C0C0] text-white cursor-not-allowed'
              : 'bg-[#0047AB] hover:bg-[#003B91] text-white'
          )}
        >
          <Landmark className="w-4 h-4" />
          {isProcessing ? 'Processing...' : 'Confirm B2B Order'}
        </button>

        <p className="text-[10px] text-[#6C757D] text-center leading-relaxed">
          Your order will be placed pending wholesaler payment verification. No COD or online
          payment applies to B2B wholesale orders.
        </p>
      </div>
    </div>
  );
}
