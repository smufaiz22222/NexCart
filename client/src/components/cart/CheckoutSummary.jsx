import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import PaymentMethodSelector from './PaymentMethodSelector';

export default function CheckoutSummary({
  isAuthenticated,
  isCustomer,
  selectedAddress,
  paymentMethod,
  setPaymentMethod,
  deliveryDetails,
  totals,
  checkoutError,
  setCheckoutError,
  isProcessing,
  handleCheckout,
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  };

  return (
    <aside className="space-y-6">
      <div className="rounded-[34px] bg-[#161412] p-6 text-white shadow-[0_22px_60px_rgba(22,20,18,0.16)]">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8d1c5]">
          Order summary
        </p>
        <h2 className="mt-4 text-3xl font-black tracking-tight">Checkout</h2>
        <div className="mt-6 rounded-[26px] bg-white/8 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8d1c5]">Deliver to</p>
          <p className="mt-3 text-sm leading-7 text-white">
            {isAuthenticated && isCustomer
              ? selectedAddress?.formatted || 'Choose a saved address to continue.'
              : isAuthenticated
                ? 'Customer account required to choose a delivery address.'
                : 'Log in to specify delivery address.'}
          </p>
        </div>

        {isAuthenticated && isCustomer && (
          <PaymentMethodSelector
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
          />
        )}

        <div className="mt-8 space-y-4 border-t border-white/10 pt-4">
          {deliveryDetails.breakdown.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8d1c5]">
                Shipping per Seller
              </p>
              {deliveryDetails.breakdown.map((g) => (
                <div
                  key={g.sellerId}
                  className="flex justify-between items-start text-xs text-[#d8d1c5]"
                >
                  <span className="max-w-[70%] truncate">{g.sellerName}</span>
                  <div className="text-right">
                    {g.deliveryFee > 0 ? (
                      <>
                        <span className="font-bold">{formatCurrency(g.deliveryFee)}</span>
                        {g.freeDeliveryThreshold !== null && (
                          <span className="text-[10px] block text-zinc-500 font-normal mt-0.5">
                            (Free above {formatCurrency(g.freeDeliveryThreshold)})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-emerald-400 font-bold">Free</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8d1c5]">Subtotal</p>
            <p className="font-bold text-lg text-white">{formatCurrency(totals.subtotal)}</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8d1c5]">
              Delivery Fee
            </p>
            <p className="font-bold text-lg text-white">
              {deliveryDetails.totalDeliveryFee > 0 ? (
                formatCurrency(deliveryDetails.totalDeliveryFee)
              ) : (
                <span className="text-emerald-400 font-bold">Free</span>
              )}
            </p>
          </div>

          <div className="flex items-end justify-between border-t border-white/15 pt-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8d1c5]">
                Total Amount
              </p>
              <p className="mt-2 text-sm text-[#d8d1c5]">{totals.itemCount} item(s)</p>
            </div>
            <p className="text-4xl font-black tracking-tight text-white">
              {formatCurrency(Number(totals.subtotal) + deliveryDetails.totalDeliveryFee)}
            </p>
          </div>
        </div>

        {checkoutError && <p className="mt-4 text-sm text-[#f4b4aa]">{checkoutError}</p>}

        <button
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
            'mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-bold transition',
            isProcessing || (isAuthenticated && !isCustomer)
              ? 'cursor-not-allowed bg-white/10 text-[#d8d1c5]'
              : 'bg-white text-[#161412] hover:bg-[#f3ede3]'
          )}
        >
          {!isAuthenticated
            ? 'Login to Checkout'
            : !isCustomer
              ? 'Customer account required'
              : isProcessing
                ? 'Processing order...'
                : paymentMethod === 'PREPAID'
                  ? 'Pay and place order'
                  : 'Place secure order'}
          {!isProcessing && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
