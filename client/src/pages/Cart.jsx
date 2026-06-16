import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Home,
  LoaderCircle,
  MapPin,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import { cn } from '../utils/cn';
import { toast } from 'sonner';

const OTHER_LOCALITY_VALUE = '__OTHER__';

const defaultAddressForm = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  landmark: '',
  postalCode: '',
  city: '',
  state: '',
  country: 'India',
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function Cart() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { cart, totals, hasHydrated, isHydrating, hydrateCart, updateQuantity, removeFromCart } =
    useCartStore();
  const selectedAddressStorageKey = user?.id
    ? `nexcart:selectedAddressId:${user.id}`
    : 'nexcart:selectedAddressId';

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(true);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(defaultAddressForm);
  const [postalLookup, setPostalLookup] = useState({
    status: 'idle',
    message: '',
    city: '',
    state: '',
    district: '',
    localities: [],
    otherValue: OTHER_LOCALITY_VALUE,
    postalCode: '',
    resolved: false,
  });
  const [selectedLocality, setSelectedLocality] = useState('');
  const [manualLocality, setManualLocality] = useState('');
  const [isManualLocality, setIsManualLocality] = useState(false);

  const canSubmitAddress =
    postalLookup.resolved &&
    postalLookup.postalCode === addressForm.postalCode &&
    addressForm.city &&
    addressForm.state &&
    (isManualLocality ? manualLocality.trim() : addressForm.addressLine2.trim());

  const resolvedLocalityOptions = useMemo(
    () => postalLookup.localities.filter(Boolean),
    [postalLookup.localities]
  );

  const syncSelectedAddress = useCallback(
    (nextAddresses) => {
      const persistedAddressId = localStorage.getItem(selectedAddressStorageKey);
      const matchingPersisted = nextAddresses.find((address) => address.id === persistedAddressId);
      const nextSelectedAddress =
        matchingPersisted?.id || nextAddresses.find((address) => address.isDefault)?.id || '';

      setSelectedAddressId(nextSelectedAddress);
      if (nextSelectedAddress) {
        localStorage.setItem(selectedAddressStorageKey, nextSelectedAddress);
      } else {
        localStorage.removeItem(selectedAddressStorageKey);
      }
    },
    [selectedAddressStorageKey]
  );

  const fetchAddresses = useCallback(async () => {
    setIsAddressLoading(true);
    try {
      const response = await apiClient.get('/addresses');
      const nextAddresses = response.data.addresses || [];
      setAddresses(nextAddresses);
      syncSelectedAddress(nextAddresses);
    } catch (error) {
      setAddressError(error.response?.data?.error || 'Failed to load saved addresses');
    } finally {
      setIsAddressLoading(false);
    }
  }, [syncSelectedAddress]);

  useEffect(() => {
    if (!hasHydrated) {
      hydrateCart().catch((error) =>
        setCheckoutError(error.response?.data?.error || 'Failed to load cart')
      );
    }
    fetchAddresses();
  }, [fetchAddresses, hasHydrated, hydrateCart]);

  useEffect(() => {
    if (!selectedAddressId) return;
    localStorage.setItem(selectedAddressStorageKey, selectedAddressId);
  }, [selectedAddressId, selectedAddressStorageKey]);

  useEffect(() => {
    const postalCode = addressForm.postalCode.trim();

    if (!/^\d{6}$/.test(postalCode)) {
      setPostalLookup((current) => ({
        ...current,
        status: postalCode.length ? 'invalid' : 'idle',
        message: postalCode.length ? 'Postal code must be exactly 6 digits.' : '',
        city: '',
        state: '',
        district: '',
        localities: [],
        postalCode,
        resolved: false,
      }));

      setSelectedLocality('');
      setManualLocality('');
      setIsManualLocality(false);
      setAddressForm((current) => ({ ...current, city: '', state: '' }));
      return undefined;
    }

    const timer = setTimeout(async () => {
      setPostalLookup((current) => ({
        ...current,
        status: 'loading',
        message: 'Fetching city and state from your postal code...',
        postalCode,
      }));

      try {
        const response = await apiClient.get(`/addresses/pincode/${postalCode}`);
        const lookup = response.data;
        const localityOptions = lookup.localities || [];
        const firstKnownLocality =
          localityOptions.find((locality) => locality !== lookup.otherValue) || '';

        setPostalLookup({
          ...lookup,
          status: lookup.resolved ? 'resolved' : 'error',
          message: lookup.message,
        });

        setAddressForm((current) => ({
          ...current,
          postalCode,
          city: lookup.city || '',
          state: lookup.state || '',
          addressLine2: firstKnownLocality || '',
        }));
        setSelectedLocality(firstKnownLocality || lookup.otherValue || OTHER_LOCALITY_VALUE);
        setManualLocality('');
        setIsManualLocality(false);
      } catch (error) {
        setPostalLookup({
          status: 'error',
          message:
            error.response?.data?.message ||
            error.response?.data?.error ||
            'Failed to resolve postal code',
          city: '',
          state: '',
          district: '',
          localities: [],
          otherValue: OTHER_LOCALITY_VALUE,
          postalCode,
          resolved: false,
        });
        setSelectedLocality('');
        setManualLocality('');
        setIsManualLocality(false);
        setAddressForm((current) => ({ ...current, city: '', state: '', addressLine2: '' }));
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [addressForm.postalCode]);

  const startAddressEdit = (address = null) => {
    const nextForm = address
      ? {
          fullName: address.fullName || '',
          phone: address.phone || '',
          addressLine1: address.addressLine1 || '',
          addressLine2: address.addressLine2 || '',
          landmark: address.landmark || '',
          postalCode: address.postalCode || '',
          city: address.city || '',
          state: address.state || '',
          country: address.country || 'India',
        }
      : defaultAddressForm;

    setEditingAddressId(address?.id || null);
    setAddressForm(nextForm);
    setManualLocality('');
    setSelectedLocality(address?.addressLine2 || '');
    setIsManualLocality(false);
    setAddressError('');
  };

  const resetAddressEditor = () => {
    setEditingAddressId(null);
    setAddressForm(defaultAddressForm);
    setPostalLookup({
      status: 'idle',
      message: '',
      city: '',
      state: '',
      district: '',
      localities: [],
      otherValue: OTHER_LOCALITY_VALUE,
      postalCode: '',
      resolved: false,
    });
    setSelectedLocality('');
    setManualLocality('');
    setIsManualLocality(false);
    setAddressError('');
  };

  const handleAddressSubmit = async (event) => {
    event.preventDefault();
    setAddressError('');

    if (!canSubmitAddress) {
      setAddressError('Please complete the postal-code lookup and locality before saving.');
      return;
    }

    setIsSavingAddress(true);

    try {
      const payload = {
        ...addressForm,
        addressLine2: isManualLocality ? manualLocality.trim() : addressForm.addressLine2.trim(),
      };

      if (editingAddressId) {
        await apiClient.put(`/addresses/${editingAddressId}`, payload);
      } else {
        await apiClient.post('/addresses', payload);
      }

      await fetchAddresses();
      resetAddressEditor();
    } catch (error) {
      setAddressError(error.response?.data?.error || 'Failed to save address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      await apiClient.delete(`/addresses/${addressId}`);
      await fetchAddresses();
      if (editingAddressId === addressId) {
        resetAddressEditor();
      }
    } catch (error) {
      setAddressError(error.response?.data?.error || 'Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await apiClient.patch(`/addresses/${addressId}/default`);
      await fetchAddresses();
      setSelectedAddressId(addressId);
    } catch (error) {
      setAddressError(error.response?.data?.error || 'Failed to update default address');
    }
  };

  const handleCheckout = async () => {
    setCheckoutError('');

    if (cart.length === 0) {
      setCheckoutError('Your cart is empty.');
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

    setIsProcessing(true);

    try {
      if (paymentMethod === 'COD') {
        await apiClient.post('/orders/checkout', {
          addressId: selectedAddressId,
          paymentMethod: 'COD',
        });

        await hydrateCart();
        navigate('/store/orders');
        toast.success('COD order placed successfully!');
        return;
      }

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        throw new Error('Failed to load Razorpay checkout. Please try again.');
      }

      const createResponse = await apiClient.post('/orders/prepaid/create', {
        addressId: selectedAddressId,
        paymentMethod: 'PREPAID',
      });

      const { keyId, razorpayOrderId, amount, currency } = createResponse.data;

      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount,
          currency,
          name: 'NexCart',
          description: 'Marketplace prepaid order',
          order_id: razorpayOrderId,
          handler: async (response) => {
            try {
              await apiClient.post('/orders/prepaid/verify', {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              await hydrateCart();
              navigate('/store/orders');
              toast.success('Prepaid order placed successfully!');
              resolve();
            } catch (verificationError) {
              reject(
                new Error(verificationError.response?.data?.error || 'Payment verification failed')
              );
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled by user')),
          },
          theme: {
            color: '#161412',
          },
        });

        razorpay.open();
      });
    } catch (error) {
      setCheckoutError(error.response?.data?.error || error.message || 'Checkout failed');
    } finally {
      setIsProcessing(false);
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

            <div className="mt-8 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-5 rounded-[28px] border border-[#ece7de] bg-[#fbfaf7] p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[22px] bg-[#f0eeea] p-3">
                      {item.selectedSize && (
                        <span className="absolute right-2 top-2 rounded-full bg-[#161412] px-2 py-1 text-[10px] font-bold text-white">
                          {item.selectedSize}
                        </span>
                      )}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain mix-blend-multiply"
                        />
                      ) : (
                        <ShoppingBag className="h-8 w-8 text-[#8b857c]" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-black tracking-tight text-[#161412]">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-sm text-[#6b665f]">
                        {item.wholesaler?.businessName || 'Unknown shop'}
                      </p>
                      <p className="mt-3 text-xl font-black text-[#161412]">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex items-center rounded-full border border-[#ddd7cc] bg-white">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1).catch(() => {})}
                        className="p-3 text-[#6b665f] transition hover:text-[#161412]"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-10 text-center text-sm font-bold text-[#161412]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1).catch(() => {})}
                        className="p-3 text-[#6b665f] transition hover:text-[#161412]"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id).catch(() => {})}
                      className="rounded-full border border-[#efcdc7] bg-[#fff3f1] p-3 text-[#b34d3f]"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] bg-white p-6 shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-[#f8f6f1] px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                  <MapPin className="h-4 w-4" />
                  Shipping addresses
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-[#161412]">
                  Choose delivery details
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#6b665f]">
                  Save multiple addresses, restore your selection on refresh, and use pincode-based
                  city and state fill.
                </p>
              </div>

              <button
                type="button"
                onClick={() => startAddressEdit(null)}
                className="rounded-full border border-[#161412] px-5 py-3 text-sm font-bold text-[#161412]"
              >
                Add address
              </button>
            </div>

            <div className="mt-8 space-y-4">
              {isAddressLoading ? (
                <div className="flex items-center gap-3 rounded-[24px] bg-[#f8f6f1] px-5 py-5 text-sm font-semibold text-[#6b665f]">
                  <LoaderCircle className="h-5 w-5 animate-spin text-[#161412]" />
                  Loading saved addresses...
                </div>
              ) : addresses.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#ddd7cc] px-5 py-6 text-sm text-[#6b665f]">
                  No saved addresses yet. Add one below to continue checkout.
                </div>
              ) : (
                addresses.map((address) => (
                  <div
                    key={address.id}
                    className={cn(
                      'rounded-[26px] border p-5 transition',
                      selectedAddressId === address.id
                        ? 'border-[#161412] bg-[#f8f6f1]'
                        : 'border-[#ece7de] bg-[#fbfaf7]'
                    )}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedAddressId(address.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-black tracking-tight text-[#161412]">
                            {address.fullName}
                          </span>
                          {address.isDefault && (
                            <span className="rounded-full bg-[#161412] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                              Default
                            </span>
                          )}
                          {selectedAddressId === address.id && (
                            <CheckCircle2 className="h-4 w-4 text-[#161412]" />
                          )}
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[#6b665f]">{address.formatted}</p>
                      </button>

                      <div className="flex flex-wrap gap-2">
                        {!address.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(address.id)}
                            className="rounded-full border border-[#ddd7cc] bg-white px-3 py-2 text-xs font-bold text-[#161412]"
                          >
                            Set default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startAddressEdit(address)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#ddd7cc] bg-white px-3 py-2 text-xs font-bold text-[#161412]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(address.id)}
                          className="rounded-full border border-[#efcdc7] bg-[#fff3f1] px-3 py-2 text-xs font-bold text-[#b34d3f]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddressSubmit} className="mt-8 rounded-[30px] bg-[#f8f6f1] p-5">
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-[#161412] p-3 text-white">
                  <Home className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight text-[#161412]">
                    {editingAddressId ? 'Edit address' : 'Add address'}
                  </p>
                  <p className="text-xs text-[#6b665f]">
                    City and state are filled from the pincode lookup.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InputField label="Full Name">
                  <input
                    value={addressForm.fullName}
                    onChange={(event) =>
                      setAddressForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                    className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                    required
                  />
                </InputField>

                <InputField label="Mobile Number">
                  <input
                    value={addressForm.phone}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        phone: event.target.value.replace(/\D/g, '').slice(0, 10),
                      }))
                    }
                    className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                    inputMode="numeric"
                    required
                  />
                </InputField>

                <InputField label="Address Line 1" className="sm:col-span-2">
                  <input
                    value={addressForm.addressLine1}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        addressLine1: event.target.value,
                      }))
                    }
                    className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                    required
                  />
                </InputField>

                <InputField label="Postal Code">
                  <input
                    value={addressForm.postalCode}
                    onChange={(event) =>
                      setAddressForm((current) => ({
                        ...current,
                        postalCode: event.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                    className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                    inputMode="numeric"
                    required
                  />
                  <p
                    className={cn(
                      'mt-2 text-xs',
                      postalLookup.status === 'error' || postalLookup.status === 'invalid'
                        ? 'text-[#b34d3f]'
                        : postalLookup.status === 'resolved'
                          ? 'text-[#2f5d46]'
                          : 'text-[#6b665f]'
                    )}
                  >
                    {postalLookup.status === 'loading'
                      ? 'Fetching postal details...'
                      : postalLookup.message}
                  </p>
                </InputField>

                <InputField label="Area / Locality">
                  {postalLookup.resolved ? (
                    <>
                      <select
                        value={isManualLocality ? postalLookup.otherValue : selectedLocality}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          if (nextValue === postalLookup.otherValue) {
                            setIsManualLocality(true);
                            setSelectedLocality(nextValue);
                            setAddressForm((current) => ({ ...current, addressLine2: '' }));
                            return;
                          }

                          setIsManualLocality(false);
                          setSelectedLocality(nextValue);
                          setManualLocality('');
                          setAddressForm((current) => ({ ...current, addressLine2: nextValue }));
                        }}
                        className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                        required
                      >
                        <option value="" disabled>
                          Select locality
                        </option>
                        {resolvedLocalityOptions.map((locality) => (
                          <option key={locality} value={locality}>
                            {locality === postalLookup.otherValue ? 'Other' : locality}
                          </option>
                        ))}
                      </select>
                      {isManualLocality && (
                        <input
                          value={manualLocality}
                          onChange={(event) => setManualLocality(event.target.value)}
                          className="mt-3 w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                          placeholder="Type your locality manually"
                          required
                        />
                      )}
                    </>
                  ) : (
                    <input
                      value={addressForm.addressLine2}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          addressLine2: event.target.value,
                        }))
                      }
                      className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                      placeholder="Enter a valid pincode first"
                      disabled
                    />
                  )}
                </InputField>

                <InputField label="City">
                  <input
                    value={addressForm.city}
                    readOnly
                    className="w-full rounded-[20px] border border-[#ddd7cc] bg-[#f3efe8] px-4 py-4 text-sm outline-none"
                  />
                </InputField>

                <InputField label="State">
                  <input
                    value={addressForm.state}
                    readOnly
                    className="w-full rounded-[20px] border border-[#ddd7cc] bg-[#f3efe8] px-4 py-4 text-sm outline-none"
                  />
                </InputField>

                <InputField label="Landmark" className="sm:col-span-2">
                  <input
                    value={addressForm.landmark}
                    onChange={(event) =>
                      setAddressForm((current) => ({ ...current, landmark: event.target.value }))
                    }
                    className="w-full rounded-[20px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
                    placeholder="Optional landmark"
                  />
                </InputField>
              </div>

              {addressError && <p className="mt-4 text-sm text-[#b34d3f]">{addressError}</p>}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="rounded-full bg-[#161412] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingAddress
                    ? 'Saving address...'
                    : editingAddressId
                      ? 'Update address'
                      : 'Save address'}
                </button>

                {(editingAddressId || addressForm.fullName || addressForm.postalCode) && (
                  <button
                    type="button"
                    onClick={resetAddressEditor}
                    className="rounded-full border border-[#ddd7cc] bg-white px-5 py-3 text-sm font-bold text-[#161412]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[34px] bg-[#161412] p-6 text-white shadow-[0_22px_60px_rgba(22,20,18,0.16)]">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8d1c5]">
              Order summary
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Checkout</h2>
            <div className="mt-6 rounded-[26px] bg-white/8 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8d1c5]">
                Deliver to
              </p>
              <p className="mt-3 text-sm leading-7 text-white">
                {selectedAddress?.formatted || 'Choose a saved address to continue.'}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {[
                {
                  value: 'COD',
                  label: 'Cash on Delivery',
                  description: 'Pay when your order arrives.',
                },
                {
                  value: 'PREPAID',
                  label: 'Prepaid with Razorpay',
                  description: 'Complete the payment securely online.',
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaymentMethod(option.value)}
                  className={cn(
                    'w-full rounded-[24px] border p-4 text-left transition',
                    paymentMethod === option.value
                      ? 'border-white bg-white text-[#161412]'
                      : 'border-white/15 bg-white/8 text-white'
                  )}
                >
                  <p className="font-black tracking-tight">{option.label}</p>
                  <p
                    className={cn(
                      'mt-2 text-xs leading-6',
                      paymentMethod === option.value ? 'text-[#6b665f]' : 'text-[#d8d1c5]'
                    )}
                  >
                    {option.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-8 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8d1c5]">
                  Subtotal
                </p>
                <p className="mt-2 text-sm text-[#d8d1c5]">{totals.itemCount} item(s)</p>
              </div>
              <p className="text-4xl font-black tracking-tight">
                {formatCurrency(totals.subtotal)}
              </p>
            </div>

            {checkoutError && <p className="mt-4 text-sm text-[#f4b4aa]">{checkoutError}</p>}

            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className={cn(
                'mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-bold transition',
                isProcessing
                  ? 'cursor-not-allowed bg-white/10 text-[#d8d1c5]'
                  : 'bg-white text-[#161412] hover:bg-[#f3ede3]'
              )}
            >
              {isProcessing
                ? 'Processing order...'
                : paymentMethod === 'PREPAID'
                  ? 'Pay and place order'
                  : 'Place secure order'}
              {!isProcessing && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function InputField({ label, className, children }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
