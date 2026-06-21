import { useCallback, useEffect, useMemo, useState } from 'react';
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
import apiClient from '../api/axios';
import { cn } from '../utils/cn';
import { toast } from 'sonner';

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

const OTHER_LOCALITY_VALUE = '__OTHER__';

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
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [paymentReferenceNo, setPaymentReferenceNo] = useState('');
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(''); // 'BANK' | 'UPI'

  // Address creation states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(defaultAddressForm);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('');
  const [manualLocality, setManualLocality] = useState('');
  const [isManualLocality, setIsManualLocality] = useState(false);
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

  const isB2BApproved =
    user?.businessProfile?.verification === 'APPROVED' &&
    user?.businessProfile?.status === 'ACTIVE';

  useEffect(() => {
    if (isAuthenticated && isB2BApproved && !hasHydrated) {
      hydrateCart();
    }
  }, [isAuthenticated, isB2BApproved, hasHydrated, hydrateCart]);

  const fetchAddresses = useCallback(async (selectId = null) => {
    setIsAddressLoading(true);
    try {
      const response = await apiClient.get('/addresses');
      const list = response.data.addresses || [];
      setAddresses(list);
      if (selectId) {
        setSelectedAddressId(selectId);
      } else {
        const defaultAddr = list.find((a) => a.isDefault);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        else if (list.length) setSelectedAddressId(list[0].id);
      }
    } catch {
      setAddresses([]);
    } finally {
      setIsAddressLoading(false);
    }
  }, []);

  const uniqueSellers = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const w = item.wholesaler;
      if (w && !map.has(w.id)) map.set(w.id, w);
    });
    return [...map.values()];
  }, [items]);

  const seller = uniqueSellers[0];
  const hasBank = !seller ? false : !!(seller.bankAccountNo && seller.bankAccountNo.trim());
  const hasUpi = !seller ? false : !!(seller.upiId && seller.upiId.trim());

  useEffect(() => {
    if (seller) {
      if (hasBank && hasUpi) {
        if (selectedPaymentMode !== 'BANK' && selectedPaymentMode !== 'UPI') {
          setSelectedPaymentMode('BANK');
        }
      } else if (hasBank) {
        setSelectedPaymentMode('BANK');
      } else if (hasUpi) {
        setSelectedPaymentMode('UPI');
      } else {
        setSelectedPaymentMode('');
      }
    } else {
      setSelectedPaymentMode('');
    }
  }, [seller, hasBank, hasUpi, selectedPaymentMode]);

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
        message: 'Fetching details from postal code...',
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

      const response = await apiClient.post('/addresses', payload);
      const newAddress = response.data.address;
      toast.success('Address added successfully!');

      await fetchAddresses(newAddress?.id || null);

      // Reset address form
      setShowAddressForm(false);
      setAddressForm(defaultAddressForm);
    } catch (error) {
      setAddressError(error.response?.data?.error || 'Failed to save address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.error('Your B2B cart is empty');
      return;
    }
    fetchAddresses();
    setStep('checkout');
  };

  const handlePlaceOrder = async () => {
    setCheckoutError('');
    if (!selectedAddressId) {
      setCheckoutError('Please select a shipping address');
      return;
    }
    if (!paymentReferenceNo.trim()) {
      setCheckoutError('Transaction reference ID / UTR is required');
      return;
    }
    if (!paymentReceiptUrl.trim()) {
      setCheckoutError('Payment receipt screenshot URL is required');
      return;
    }

    const prefix = selectedPaymentMode ? `${selectedPaymentMode}:` : '';

    setIsProcessing(true);
    try {
      await checkout({
        addressId: selectedAddressId,
        paymentReferenceNo: prefix + paymentReferenceNo.trim(),
        paymentReceiptUrl: paymentReceiptUrl.trim(),
      });
      toast.success('B2B order placed! Awaiting wholesaler payment verification.');
      navigate('/store/dashboard/b2b/orders');
    } catch (error) {
      setCheckoutError(error.response?.data?.error || 'Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

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
      <div className="max-w-5xl mx-auto px-4 py-8 font-sans text-[#16171a]">
        <button
          onClick={() => setStep('cart')}
          className="flex items-center text-sm font-bold text-[#6C757D] hover:text-[#0047AB] transition-colors group mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to B2B Cart
        </button>

        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 mb-8">
          <Landmark className="w-6 h-6 text-[#0047AB]" />
          B2B Checkout — Bank Transfer
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left Column - Address + Bank Details + Payment Proof */}
          <div className="space-y-6">
            {/* Address Selection */}
            <div className="border border-[#EFEFEF] rounded-xl p-5 bg-white">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Shipping Address
                </h2>
                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressForm(true);
                      setAddressForm(defaultAddressForm);
                    }}
                    className="text-xs font-bold text-[#0047AB] hover:underline"
                  >
                    + Add New Address
                  </button>
                )}
              </div>

              {showAddressForm ? (
                <form
                  onSubmit={handleAddressSubmit}
                  className="space-y-4 border border-[#EFEFEF] rounded-lg p-4 bg-[#FBFBFB]"
                >
                  <p className="font-bold text-xs text-[#161412] pb-1 border-b border-[#EFEFEF]">
                    Add New Address
                  </p>

                  {addressError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                      {addressError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.fullName}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, fullName: e.target.value })
                        }
                        placeholder="e.g. John Doe"
                        className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.phone}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                          })
                        }
                        placeholder="10-digit number"
                        className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                        Address Line 1 *
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.addressLine1}
                        onChange={(e) =>
                          setAddressForm({ ...addressForm, addressLine1: e.target.value })
                        }
                        placeholder="Flat, House no., Building, Street"
                        className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.postalCode}
                        onChange={(e) =>
                          setAddressForm({
                            ...addressForm,
                            postalCode: e.target.value.replace(/\D/g, '').slice(0, 6),
                          })
                        }
                        placeholder="6-digit pincode"
                        className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
                      />
                      <p
                        className={cn(
                          'text-[10px] mt-1',
                          postalLookup.status === 'error' || postalLookup.status === 'invalid'
                            ? 'text-red-500'
                            : postalLookup.status === 'resolved'
                              ? 'text-emerald-600'
                              : 'text-[#6C757D]'
                        )}
                      >
                        {postalLookup.status === 'loading'
                          ? 'Checking pincode...'
                          : postalLookup.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                        Area / Locality *
                      </label>
                      {postalLookup.resolved ? (
                        <>
                          <select
                            value={isManualLocality ? postalLookup.otherValue : selectedLocality}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === postalLookup.otherValue) {
                                setIsManualLocality(true);
                                setSelectedLocality(val);
                                setAddressForm({ ...addressForm, addressLine2: '' });
                                return;
                              }
                              setIsManualLocality(false);
                              setSelectedLocality(val);
                              setManualLocality('');
                              setAddressForm({ ...addressForm, addressLine2: val });
                            }}
                            className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
                            required
                          >
                            <option value="" disabled>
                              Select locality
                            </option>
                            {resolvedLocalityOptions.map((loc) => (
                              <option key={loc} value={loc}>
                                {loc === postalLookup.otherValue ? 'Other' : loc}
                              </option>
                            ))}
                          </select>
                          {isManualLocality && (
                            <input
                              type="text"
                              required
                              value={manualLocality}
                              onChange={(e) => setManualLocality(e.target.value)}
                              placeholder="Enter locality manually"
                              className="mt-2 w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs focus:outline-none focus:border-[#0047AB] bg-white"
                            />
                          )}
                        </>
                      ) : (
                        <input
                          type="text"
                          disabled
                          placeholder="Enter a valid pincode first"
                          className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs bg-zinc-50 text-zinc-400"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                        City (Auto-filled)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={addressForm.city}
                        className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs bg-zinc-50 text-zinc-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                        State (Auto-filled)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={addressForm.state}
                        className="w-full px-3 py-2 border border-[#EFEFEF] rounded-lg text-xs bg-zinc-50 text-zinc-600 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressForm(false);
                        setAddressForm(defaultAddressForm);
                        setAddressError('');
                      }}
                      className="px-3 py-1.5 border border-[#EFEFEF] hover:bg-zinc-50 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAddress || !canSubmitAddress}
                      className={cn(
                        'px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-colors',
                        isSavingAddress || !canSubmitAddress
                          ? 'bg-[#C0C0C0] cursor-not-allowed'
                          : 'bg-[#0047AB] hover:bg-[#003B91]'
                      )}
                    >
                      {isSavingAddress ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                </form>
              ) : isAddressLoading ? (
                <p className="text-xs text-[#6C757D] animate-pulse">Loading addresses...</p>
              ) : addresses.length === 0 ? (
                <p className="text-xs text-[#6C757D]">
                  No saved addresses.{' '}
                  <button
                    onClick={() => {
                      setShowAddressForm(true);
                      setAddressForm(defaultAddressForm);
                    }}
                    className="text-[#0047AB] underline font-semibold"
                  >
                    Create one now to continue checkout.
                  </button>
                </p>
              ) : (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={cn(
                        'w-full text-left rounded-lg border p-3 transition text-xs',
                        selectedAddressId === addr.id
                          ? 'border-[#0047AB] bg-blue-50/50'
                          : 'border-[#EFEFEF] hover:border-[#C0C0C0]'
                      )}
                    >
                      <p className="font-bold">{addr.fullName}</p>
                      <p className="text-[#6C757D] mt-0.5">
                        {addr.addressLine1}
                        {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, {addr.city},{' '}
                        {addr.state} - {addr.postalCode}
                      </p>
                      {selectedAddressId === addr.id && (
                        <CheckCircle2 className="w-4 h-4 text-[#0047AB] mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wholesaler Bank & UPI Details */}
            <div className="border border-[#EFEFEF] rounded-xl p-5 bg-white">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] mb-4 flex items-center gap-2">
                <Landmark className="w-4 h-4" /> Wholesaler Settlement Credentials
              </h2>
              {seller ? (
                <div className="space-y-4">
                  {/* Selector UI (if both configured) */}
                  {hasBank && hasUpi && (
                    <div className="flex gap-2 p-1 bg-[#F5F5F7] rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMode('BANK')}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                          selectedPaymentMode === 'BANK'
                            ? 'bg-white text-[#0047AB] shadow-sm'
                            : 'text-[#6C757D] hover:text-[#16171a]'
                        )}
                      >
                        <Landmark className="w-3.5 h-3.5" />
                        Bank Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMode('UPI')}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                          selectedPaymentMode === 'UPI'
                            ? 'bg-white text-[#0047AB] shadow-sm'
                            : 'text-[#6C757D] hover:text-[#16171a]'
                        )}
                      >
                        <span className="font-sans font-black tracking-wider text-[10px]">UPI</span>
                        UPI Payment
                      </button>
                    </div>
                  )}

                  {/* Payment Details rendering */}
                  {selectedPaymentMode === 'BANK' && hasBank && (
                    <div className="border border-[#EFEFEF] rounded-lg p-3.5 text-xs space-y-2 bg-[#FBFBFB]">
                      <p className="font-bold text-[#161412] flex items-center gap-1.5 pb-1.5 border-b border-[#EFEFEF]">
                        <Landmark className="w-4 h-4 text-[#0047AB]" />
                        Bank Settlement Details ({seller.businessName})
                      </p>
                      <p>
                        <span className="text-[#6C757D] font-medium">Bank Name:</span>{' '}
                        {seller.bankName || 'N/A'}
                      </p>
                      <p>
                        <span className="text-[#6C757D] font-medium">Account Number:</span>{' '}
                        <strong className="text-zinc-900 font-mono select-all bg-zinc-200/50 px-1 py-0.5 rounded">
                          {seller.bankAccountNo}
                        </strong>
                      </p>
                      <p>
                        <span className="text-[#6C757D] font-medium">IFSC Code:</span>{' '}
                        <strong className="text-zinc-900 font-mono select-all bg-zinc-200/50 px-1 py-0.5 rounded">
                          {seller.bankIfsc || 'N/A'}
                        </strong>
                      </p>
                    </div>
                  )}

                  {selectedPaymentMode === 'UPI' && hasUpi && (
                    <div className="border border-[#EFEFEF] rounded-lg p-3.5 text-xs space-y-2 bg-[#FBFBFB]">
                      <p className="font-bold text-[#161412] flex items-center gap-1.5 pb-1.5 border-b border-[#EFEFEF]">
                        <span className="font-sans font-black tracking-wider text-[10px] text-[#0047AB]">
                          UPI
                        </span>
                        UPI Settlement Details ({seller.businessName})
                      </p>
                      <p>
                        <span className="text-[#6C757D] font-medium">UPI ID:</span>{' '}
                        <strong className="text-zinc-900 font-mono select-all bg-zinc-100 px-1.5 py-0.5 rounded">
                          {seller.upiId}
                        </strong>
                      </p>
                      {seller.qrCodeUrl && (
                        <div className="mt-3 flex flex-col items-center p-3 bg-white border border-[#EFEFEF] rounded-xl">
                          <img
                            src={seller.qrCodeUrl}
                            alt="UPI QR Code"
                            className="w-36 h-36 object-contain"
                          />
                          <p className="text-[10px] text-[#6C757D] mt-1.5 font-medium">
                            Scan to pay via UPI
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {!hasBank && !hasUpi && (
                    <p className="text-amber-600 font-medium text-xs bg-amber-50 border border-amber-100 p-3 rounded-lg">
                      Wholesaler has not configured direct settlement credentials yet.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#6C757D]">No seller details found.</p>
              )}
            </div>

            {/* Payment Proof */}
            <div className="border border-[#EFEFEF] rounded-xl p-5 bg-white">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#6C757D] mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4" /> Payment Confirmation
              </h2>
              <p className="text-xs text-[#6C757D] mb-4 leading-5">
                {selectedPaymentMode === 'UPI'
                  ? "Pay the total amount to the wholesaler's UPI ID above, then provide your transaction reference number and a receipt screenshot below."
                  : "Transfer the total amount to the wholesaler's bank account above, then provide your transaction reference ID (UTR) and a receipt screenshot below."}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                    {selectedPaymentMode === 'UPI'
                      ? 'UPI Transaction ID / Ref No'
                      : 'Transaction Reference ID / UTR'}
                  </label>
                  <input
                    type="text"
                    value={paymentReferenceNo}
                    onChange={(e) => setPaymentReferenceNo(e.target.value)}
                    placeholder={
                      selectedPaymentMode === 'UPI' ? 'e.g. txn_1234567890' : 'e.g. UTR1234567890'
                    }
                    className="w-full px-3 py-2.5 border border-[#EFEFEF] rounded-lg text-sm focus:outline-none focus:border-[#0047AB] transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider mb-1">
                    Payment Receipt Screenshot URL
                  </label>
                  <input
                    type="text"
                    value={paymentReceiptUrl}
                    onChange={(e) => setPaymentReceiptUrl(e.target.value)}
                    placeholder="Paste image link of payment receipt"
                    className="w-full px-3 py-2.5 border border-[#EFEFEF] rounded-lg text-sm focus:outline-none focus:border-[#0047AB] transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
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
        </div>
      </div>
    );
  }

  // ---------- CART STEP ----------
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans text-[#16171a]">
      {/* Back button */}
      <button
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
