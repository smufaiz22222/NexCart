import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LoaderCircle, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { toast } from 'sonner';

import { useRazorpayCheckout } from '../components/cart/useRazorpayCheckout';
import { useAddressManager } from '../components/cart/useAddressManager';
import CartItemList from '../components/cart/CartItemList';
import AddressManager from '../components/cart/AddressManager';
import CheckoutSummary from '../components/cart/CheckoutSummary';

export default function Cart() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isCustomer = user?.role === 'CUSTOMER';
  const { cart, totals, hasHydrated, isHydrating, hydrateCart, updateQuantity, removeFromCart } =
    useCartStore();

  const deliveryDetails = useMemo(() => {
    if (!cart || cart.length === 0) return { breakdown: [], totalDeliveryFee: 0 };

    const groups = {};
    for (const item of cart) {
      const sellerId = item.product?.wholesalerId || 'unknown';
      if (!groups[sellerId]) {
        groups[sellerId] = {
          sellerName:
            item.wholesaler?.businessName || item.product?.wholesaler?.businessName || 'Seller',
          subtotal: 0,
          rawDeliveryFeeTotal: 0,
          freeDeliveryThreshold: null,
        };
      }
      const price = Number(item.price || 0);
      groups[sellerId].subtotal += price * item.quantity;

      const itemWholesaler = item.product?.wholesaler;
      if (itemWholesaler) {
        groups[sellerId].freeDeliveryThreshold =
          itemWholesaler.freeDeliveryThreshold !== undefined &&
          itemWholesaler.freeDeliveryThreshold !== null
            ? Number(itemWholesaler.freeDeliveryThreshold)
            : null;
      }

      const prodDeliveryFee = item.product?.deliveryFee;
      const baseFee =
        prodDeliveryFee !== null && prodDeliveryFee !== undefined
          ? Number(prodDeliveryFee)
          : Number(itemWholesaler?.deliveryFee || 0);

      groups[sellerId].rawDeliveryFeeTotal += baseFee * item.quantity;
    }

    const breakdown = Object.keys(groups).map((sellerId) => {
      const g = groups[sellerId];
      let appliedFee = g.rawDeliveryFeeTotal;
      if (g.freeDeliveryThreshold !== null && g.subtotal >= g.freeDeliveryThreshold) {
        appliedFee = 0;
      }
      return {
        sellerId,
        sellerName: g.sellerName,
        subtotal: g.subtotal,
        deliveryFee: appliedFee,
        freeDeliveryThreshold: g.freeDeliveryThreshold,
      };
    });

    const totalDeliveryFee = breakdown.reduce((sum, g) => sum + g.deliveryFee, 0);

    return { breakdown, totalDeliveryFee };
  }, [cart]);

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

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);

  if (isHydrating && !hasHydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#161412]">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (hasHydrated && cart.length === 0) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center rounded-[34px] bg-white px-6 py-16 text-center shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
        <div className="rounded-full bg-[#f8f6f1] p-6">
          <ShoppingBag className="h-16 w-16 text-[#161412]" />
        </div>
        <h2 className="mt-6 text-3xl font-black tracking-tight text-[#161412]">
          Your cart is empty
        </h2>
        <p className="mt-3 max-w-md text-sm leading-7 text-[#6b665f]">
          Looks like you haven&apos;t added anything yet. Browse the latest storefront collections
          and come back when something fits.
        </p>
        <button
          onClick={() => navigate('/store')}
          className="mt-8 rounded-full bg-[#161412] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#2c2926]"
        >
          Start shopping
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 text-[#161412]">
      <button
        onClick={() => navigate('/store')}
        className="inline-flex items-center gap-2 rounded-full border border-[#ddd7cc] bg-white px-4 py-3 text-sm font-bold text-[#161412]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to store
      </button>

      <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="space-y-6">
          <div className="rounded-[34px] bg-white p-6 shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
            <h1 className="text-4xl font-black tracking-tight text-[#161412]">Your cart</h1>
            <p className="mt-3 text-sm leading-7 text-[#6b665f]">
              Server-synced across refreshes, with checkout built around saved delivery addresses.
            </p>

            <CartItemList
              cart={cart}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
            />
          </div>

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
            <div className="rounded-[34px] bg-white p-8 text-center shadow-[0_18px_45px_rgba(22,20,18,0.05)] border border-dashed border-[#ddd7cc] flex flex-col items-center justify-center min-h-[260px]">
              <p className="text-xl font-black tracking-tight text-[#161412]">Shipping Details</p>
              <p className="mt-2 text-sm text-[#6b665f] max-w-sm mx-auto leading-6">
                {isAuthenticated
                  ? 'This cart checkout flow is only available for customer accounts.'
                  : 'Please sign in or create a customer account to save your delivery addresses and proceed with checkout.'}
              </p>
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                  className="mt-6 rounded-full bg-[#161412] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#2c2926]"
                >
                  Login / Register to Checkout
                </button>
              )}
            </div>
          )}
        </section>

        <CheckoutSummary
          isAuthenticated={isAuthenticated}
          isCustomer={isCustomer}
          selectedAddress={selectedAddress}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
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
