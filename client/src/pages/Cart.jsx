import { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { toast } from 'sonner';

import { useRazorpayCheckout } from '../components/cart/useRazorpayCheckout';
import { useAddressManager } from '../components/cart/useAddressManager';
import { useDeliveryDetails } from '../components/cart/useDeliveryDetails';
import CartItemList from '../components/cart/CartItemList';
import AddressManager from '../components/cart/AddressManager';
import CheckoutSummary from '../components/cart/CheckoutSummary';
import PaymentMethodSection from '../components/cart/PaymentMethodSection';

export default function Cart() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isCustomer = user?.role === 'CUSTOMER';
  const { cart, totals, hasHydrated, isHydrating, hydrateCart, updateQuantity, removeFromCart } =
    useCartStore();

  const deliveryDetails = useDeliveryDetails(cart);

  const hasMoqViolation = false;

  const [paymentMethod, setPaymentMethod] = useState('');
  const [localCheckoutError, setLocalCheckoutError] = useState('');
  const [isCodProcessing, setIsCodProcessing] = useState(false);

  const {
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    isAddressLoading,
    isSavingAddress,
    addressError,
    editingAddressId,
    addressForm,
    setAddressForm,
    postalLookup,
    selectedLocality,
    setSelectedLocality,
    manualLocality,
    setManualLocality,
    isManualLocality,
    setIsManualLocality,
    startAddressEdit,
    resetAddressEditor,
    handleAddressSubmit,
    handleDeleteAddress,
    handleSetDefaultAddress,
  } = useAddressManager(user?.id, isAuthenticated && isCustomer);

  const {
    isProcessing: isPrepaidProcessing,
    checkoutError: prepaidCheckoutError,
    setCheckoutError: setPrepaidCheckoutError,
    handleRazorpayCheckout,
  } = useRazorpayCheckout();

  const isProcessing = isCodProcessing || isPrepaidProcessing;
  const checkoutError = localCheckoutError || prepaidCheckoutError;

  const setCheckoutError = (err) => {
    setLocalCheckoutError(err);
    setPrepaidCheckoutError(err);
  };

  const canCheckoutAsCustomer = !isAuthenticated || isCustomer;

  useEffect(() => {
    if (!hasHydrated && canCheckoutAsCustomer) {
      hydrateCart().catch((error) =>
        setLocalCheckoutError(error.response?.data?.error || 'Failed to load cart')
      );
    }
  }, [canCheckoutAsCustomer, hasHydrated, hydrateCart]);

  const handleCheckout = async () => {
    setCheckoutError('');

    if (!isCustomer) {
      setCheckoutError('Checkout is only available for customer accounts.');
      return;
    }

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    if (hasMoqViolation) {
      setCheckoutError('Some items in your cart do not meet the B2B MOQ constraint.');
      return;
    }

    if (!selectedAddressId) {
      setCheckoutError('Please select a saved shipping address before checkout.');
      return;
    }

    if (!paymentMethod) {
      setCheckoutError('Please select a payment method before placing your order.');
      return;
    }

    try {
      if (paymentMethod === 'COD') {
        setIsCodProcessing(true);
        await apiClient.post('/orders/checkout', {
          addressId: selectedAddressId,
          paymentMethod: 'COD',
        });

        await hydrateCart();
        navigate('/store/dashboard/orders');
        toast.success('COD order placed successfully!');
        return;
      }

      await handleRazorpayCheckout(selectedAddressId);
    } catch (error) {
      setLocalCheckoutError(error.response?.data?.error || error.message || 'Checkout failed');
    } finally {
      setIsCodProcessing(false);
    }
  };

  if (isHydrating && !hasHydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#4f46e5]">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (hasHydrated && cart.length === 0) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center rounded-2xl bg-white border border-[#e2e8f0] px-6 py-16 text-center shadow-sm">
        <div className="w-20 h-20 rounded-2xl bg-[#eef2ff] flex items-center justify-center">
          <ShoppingBag className="h-10 w-10 text-[#4f46e5]" />
        </div>
        <h2 className="mt-6 text-2xl font-black tracking-tight text-[#1e293b]">
          Your cart is empty
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#64748b]">
          Looks like you haven&apos;t added anything yet. Browse the storefront and come back when
          something catches your eye.
        </p>
        <button
          type="button"
          onClick={() => navigate('/store')}
          className="mt-8 rounded-xl bg-[#4f46e5] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#4338ca] shadow-sm btn-press"
        >
          Start shopping
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-[#1e293b]">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4f46e5]">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#0f172a]">Shopping Cart</h1>
            <p className="text-xs text-[#64748b]">
              {totals.itemCount} item{totals.itemCount !== 1 ? 's' : ''} in your cart
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/store')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-xs font-bold text-[#64748b] hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all sm:w-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Continue Shopping
        </button>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] items-start">
        <section className="space-y-6">
          {/* Cart Items */}
          <div className="rounded-2xl bg-white p-6 border border-[#e2e8f0] shadow-sm">
            <CartItemList
              cart={cart}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
            />
          </div>

          {/* Address Section */}
          {isAuthenticated && isCustomer ? (
            <AddressManager
              addresses={addresses}
              selectedAddressId={selectedAddressId}
              setSelectedAddressId={setSelectedAddressId}
              isAddressLoading={isAddressLoading}
              handleSetDefaultAddress={handleSetDefaultAddress}
              startAddressEdit={startAddressEdit}
              handleDeleteAddress={handleDeleteAddress}
              editingAddressId={editingAddressId}
              addressForm={addressForm}
              setAddressForm={setAddressForm}
              postalLookup={postalLookup}
              selectedLocality={selectedLocality}
              setSelectedLocality={setSelectedLocality}
              manualLocality={manualLocality}
              setManualLocality={setManualLocality}
              isManualLocality={isManualLocality}
              setIsManualLocality={setIsManualLocality}
              isSavingAddress={isSavingAddress}
              addressError={addressError}
              resetAddressEditor={resetAddressEditor}
              handleAddressSubmit={handleAddressSubmit}
            />
          ) : (
            <div className="rounded-2xl bg-white p-8 text-center border border-dashed border-[#e2e8f0] flex flex-col items-center justify-center min-h-[200px] shadow-sm">
              <p className="text-base font-bold text-[#1e293b]">Shipping Address</p>
              <p className="mt-2 text-sm text-[#64748b] max-w-sm mx-auto">
                {isAuthenticated
                  ? 'Checkout is available for customer accounts only.'
                  : 'Sign in to save your delivery address and proceed to checkout.'}
              </p>
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                  className="mt-5 rounded-xl bg-[#4f46e5] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#4338ca] shadow-sm btn-press"
                >
                  Login to Continue
                </button>
              )}
            </div>
          )}

          {/* Payment Method Selection */}
          {isAuthenticated && isCustomer && (
            <PaymentMethodSection
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
            />
          )}
        </section>

        {/* Checkout Sidebar */}
        <CheckoutSummary
          isAuthenticated={isAuthenticated}
          isCustomer={isCustomer}
          paymentMethod={paymentMethod}
          deliveryDetails={deliveryDetails}
          totals={totals}
          checkoutError={checkoutError}
          setCheckoutError={setCheckoutError}
          isProcessing={isProcessing}
          handleCheckout={handleCheckout}
        />
      </div>
    </div>
  );
}
