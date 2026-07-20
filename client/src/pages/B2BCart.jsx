import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Landmark,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  Upload,
  FileText,
  MapPin,
} from 'lucide-react';
import useB2BCartStore from '../store/b2bCartStore';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import B2BCartCheckoutStep from '../components/cart/B2BCartCheckoutStep';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

export default function B2BCart() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    items,
    totals,
    isLoading,
    isMutating,
    hasHydrated,
    hydrateCart,
    updateQuantity,
    removeItem,
    clearCart,
    checkout,
  } = useB2BCartStore();

  const [step, setStep] = useState('cart'); // 'cart' | 'checkout'
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const isB2BApproved =
    user?.businessProfile?.verification === 'APPROVED' &&
    user?.businessProfile?.status === 'ACTIVE';

  useEffect(() => {
    if (isAuthenticated && isB2BApproved && !hasHydrated) {
      hydrateCart();
    }
  }, [isAuthenticated, isB2BApproved, hasHydrated, hydrateCart]);

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.error('Your B2B cart is empty');
      return;
    }
    setStep('checkout');
  };

  const handlePlaceOrder = async ({ addressId, paymentReferenceNo, paymentReceiptUrl }) => {
    setCheckoutError('');
    setIsProcessing(true);
    try {
      await checkout({
        addressId,
        paymentReferenceNo,
        paymentReceiptUrl,
      });
      toast.success('B2B order placed! Awaiting wholesaler payment verification.');
      navigate('/store/dashboard/b2b/orders');
    } catch (error) {
      setCheckoutError(error.response?.data?.error || 'Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated || !isB2BApproved) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Building2 className="w-14 h-14 text-[#C0C0C0] mx-auto mb-4" />
        <h2 className="text-lg font-bold">B2B Access Required</h2>
        <p className="text-sm text-[#6C757D] mt-2">
          You need an active approved B2B business profile to access the wholesale cart.
        </p>
      </div>
    );
  }

  if (isLoading && !hasHydrated) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse text-[#6C757D]">Loading B2B cart...</div>
      </div>
    );
  }

  // ---------- CHECKOUT STEP ----------
  if (step === 'checkout') {
    return (
      <B2BCartCheckoutStep
        setStep={setStep}
        checkoutError={checkoutError}
        handlePlaceOrder={handlePlaceOrder}
        items={items}
        totals={totals}
        formatCurrency={formatCurrency}
        checkoutStatus={{
          isProcessing,
          isMutating,
        }}
      />
    );
  }

  // ---------- CART STEP ----------
  return (
    <B2BCartMainView
      items={items}
      totals={totals}
      isMutating={isMutating}
      clearCart={clearCart}
      removeItem={removeItem}
      updateQuantity={updateQuantity}
      formatCurrency={formatCurrency}
      handleProceedToCheckout={handleProceedToCheckout}
      navigate={navigate}
    />
  );
}

function B2BCartMainView({
  items,
  totals,
  isMutating,
  clearCart,
  removeItem,
  updateQuantity,
  formatCurrency,
  handleProceedToCheckout,
  navigate,
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans text-[#16171a]">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/store/dashboard/b2b')}
        className="flex items-center text-sm font-bold text-[#6C757D] hover:text-[#0047AB] transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to B2B Dashboard
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-[#0047AB]" />
            Wholesale Cart
          </h1>
          <p className="text-sm text-[#6C757D] mt-1">
            Your B2B wholesale items — checkout via direct bank transfer only
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearCart();
              toast.success('B2B cart cleared');
            }}
            disabled={isMutating}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#C0C0C0] rounded-2xl bg-white">
          <ShoppingBag className="w-14 h-14 text-[#C0C0C0] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#161412]">Your wholesale cart is empty</h2>
          <p className="text-sm text-[#6C757D] mt-2 max-w-sm mx-auto">
            Accept an RFQ quote from the Price Desk to add wholesale items here for checkout.
          </p>
          <button
            type="button"
            onClick={() => navigate('/store/dashboard/rfqs')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#0047AB] hover:bg-[#003B91] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <FileText className="w-4 h-4" />
            View RFQ Price Desk
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Cart Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="border border-[#EFEFEF] rounded-xl p-5 flex gap-5 items-start bg-white hover:border-[#0047AB]/30 transition-colors"
              >
                {/* Product Image */}
                <div className="w-20 h-20 rounded-lg bg-[#faf9f7] border border-[#EFEFEF] flex items-center justify-center shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-[#C0C0C0]" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#161412] line-clamp-1">{item.name}</h3>
                      <p className="text-[10px] text-[#6C757D] mt-0.5">
                        Seller: {item.wholesalerName}
                      </p>
                      {item.rfqId && (
                        <p className="text-[10px] text-[#0047AB] font-semibold mt-0.5">
                          RFQ Negotiated Price
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={isMutating}
                      className="p-2 rounded-lg text-[#6C757D] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-50"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    {/* Quantity Controls */}
                    {item.rfqId ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-[#C0C0C0] bg-[#EFEFEF] text-xs font-bold font-mono text-[#6C757D]">
                        Qty: {item.quantity} (Negotiated)
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            item.quantity > 1 && updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1 || isMutating}
                          className="w-8 h-8 rounded-lg border border-[#C0C0C0] flex items-center justify-center text-[#6C757D] hover:border-[#161412] hover:text-[#161412] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isMutating}
                          className="w-8 h-8 rounded-lg border border-[#C0C0C0] flex items-center justify-center text-[#6C757D] hover:border-[#161412] hover:text-[#161412] disabled:opacity-50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Line Total */}
                    <div className="text-right">
                      <p className="text-xs text-[#6C757D]">
                        {formatCurrency(item.unitPrice)} x {item.quantity}
                      </p>
                      <p className="text-base font-bold font-mono text-[#161412]">
                        {formatCurrency(item.lineTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:sticky lg:top-24">
            <div className="border border-[#EFEFEF] rounded-xl p-6 bg-[#fafafa] space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] pb-3 border-b border-[#EFEFEF]">
                Wholesale Order Summary
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6C757D]">Items ({items.length})</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6C757D]">Payment</span>
                  <span className="text-xs font-semibold text-[#0047AB]">Bank Transfer Only</span>
                </div>
              </div>

              <div className="border-t border-[#EFEFEF] pt-4 flex justify-between items-center">
                <span className="font-bold text-[#161412]">Subtotal</span>
                <span className="text-xl font-bold font-mono text-[#0047AB]">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={isMutating}
                className="w-full flex items-center justify-center gap-2 bg-[#0047AB] hover:bg-[#003B91] text-white py-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Briefcase className="w-4 h-4" />
                Proceed to B2B Checkout
              </button>

              <p className="text-[10px] text-[#6C757D] text-center leading-relaxed">
                B2B wholesale orders are processed via direct bank transfer. No COD or online
                payment options available for wholesale purchases.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
