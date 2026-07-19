import React from 'react';
import { ArrowRight, Lock, ShieldCheck, Truck } from 'lucide-react';
import { cn } from '../../utils/cn';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => {
  return currencyFormatter.format(Number(value || 0));
};

export default function CheckoutSummary({
  isAuthenticated,
  isCustomer,
  paymentMethod,
  deliveryDetails,
  totals,
  checkoutError,
  setCheckoutError,
  isProcessing,
  handleCheckout,
}) {
  const grandTotal = Number(totals.subtotal) + deliveryDetails.totalDeliveryFee;

  return (
    <aside className="xl:sticky xl:top-8 space-y-4">
      {/* Price Summary */}
      <div className="rounded-2xl bg-white border border-[#e2e8f0] p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#0f172a] mb-4">Price Details</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[#64748b]">
              Subtotal ({totals.itemCount} item{totals.itemCount !== 1 ? 's' : ''})
            </span>
            <span className="font-bold text-[#0f172a]">{formatCurrency(totals.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-[#64748b]">Shipping</span>
            <span className="font-bold text-[#0f172a]">
              {deliveryDetails.totalDeliveryFee > 0 ? (
                formatCurrency(deliveryDetails.totalDeliveryFee)
              ) : (
                <span className="text-emerald-600">Free</span>
              )}
            </span>
          </div>

          {/* Per-seller breakdown if multiple */}
          {deliveryDetails.breakdown.length > 1 && (
            <div className="pl-3 space-y-1 border-l-2 border-[#e2e8f0]">
              {deliveryDetails.breakdown.map((g) => (
                <div key={g.sellerId} className="flex justify-between gap-3 text-xs text-[#94a3b8]">
                  <span className="min-w-0 flex-1 truncate">{g.sellerName}</span>
                  <span>
                    {g.deliveryFee > 0 ? (
                      formatCurrency(g.deliveryFee)
                    ) : (
                      <span className="text-emerald-500">Free</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-[#e2e8f0] pt-3 flex justify-between">
            <span className="font-bold text-[#0f172a]">Total</span>
            <span className="text-xl font-black text-[#4f46e5]">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* Error */}
        {checkoutError && (
          <p className="mt-4 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {checkoutError}
          </p>
        )}

        {/* Checkout Button */}
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              window.dispatchEvent(new CustomEvent('open-auth-modal'));
              return;
            }
            if (!isCustomer) {
              setCheckoutError('Checkout is only available for customer accounts.');
              return;
            }
            handleCheckout();
          }}
          disabled={isProcessing || (isAuthenticated && !isCustomer)}
          className={cn(
            'mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition-all btn-press',
            isProcessing || (isAuthenticated && !isCustomer)
              ? 'cursor-not-allowed bg-[#f1f5f9] text-[#94a3b8]'
              : 'bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-md shadow-[#4f46e5]/20 hover:shadow-lg hover:shadow-[#4f46e5]/30'
          )}
        >
          {!isAuthenticated
            ? 'Login to Checkout'
            : !isCustomer
              ? 'Customer account required'
              : isProcessing
                ? 'Processing...'
                : paymentMethod === 'PREPAID'
                  ? 'Pay & Place Order'
                  : 'Place Order'}
          {!isProcessing && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Trust Signals */}
      <div className="flex flex-wrap items-center justify-center gap-4 py-3 text-[#94a3b8]">
        <div className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold">Secure</span>
        </div>
        <div className="flex items-center gap-1">
          <Truck className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold">Tracked</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold">Encrypted</span>
        </div>
      </div>
    </aside>
  );
}
