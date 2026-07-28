import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Landmark } from 'lucide-react';
import apiClient from '../../api/axios';
import { toast } from 'sonner';
import B2BCartAddressSection from './B2BCartAddressSection';
import B2BCartSettlementSection from './B2BCartSettlementSection';
import B2BCartPaymentProofSection from './B2BCartPaymentProofSection';
import B2BCartOrderSummary from './B2BCartOrderSummary';

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
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

function usePincodeLookup({
  postalCodeValue,
  setPostalLookup,
  setAddressForm,
  setSelectedLocality,
  setManualLocality,
  setIsManualLocality,
}) {
  useEffect(() => {
    const postalCode = postalCodeValue.trim();

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
  }, [
    postalCodeValue,
    setPostalLookup,
    setAddressForm,
    setSelectedLocality,
    setManualLocality,
    setIsManualLocality,
  ]);
}

export default function B2BCartCheckoutStep({
  setStep,
  checkoutError,
  handlePlaceOrder,
  items = EMPTY_ARRAY,
  totals = EMPTY_OBJECT,
  formatCurrency,
  checkoutStatus = EMPTY_OBJECT,
}) {
  const { isProcessing = false, isMutating = false } = checkoutStatus;

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [paymentReferenceNo, setPaymentReferenceNo] = useState('');
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
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

  usePincodeLookup({
    postalCodeValue: addressForm.postalCode,
    setPostalLookup,
    setAddressForm,
    setSelectedLocality,
    setManualLocality,
    setIsManualLocality,
  });

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

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

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

  const paymentMode = useMemo(() => {
    if (!seller) return '';
    if (hasBank && hasUpi) {
      return selectedPaymentMode === 'UPI' ? 'UPI' : 'BANK';
    }
    if (hasBank) return 'BANK';
    if (hasUpi) return 'UPI';
    return '';
  }, [seller, hasBank, hasUpi, selectedPaymentMode]);

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

  const handleFormPlaceOrder = () => {
    if (!selectedAddressId) {
      toast.error('Please select a shipping address');
      return;
    }
    if (!paymentReferenceNo.trim()) {
      toast.error('Transaction reference ID / UTR is required');
      return;
    }
    if (!paymentReceiptUrl.trim()) {
      toast.error('Payment receipt screenshot URL is required');
      return;
    }

    const prefix = paymentMode ? `${paymentMode}:` : '';
    handlePlaceOrder({
      addressId: selectedAddressId,
      paymentReferenceNo: prefix + paymentReferenceNo.trim(),
      paymentReceiptUrl: paymentReceiptUrl.trim(),
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans text-[#16171a]">
      <button
        type="button"
        onClick={() => setStep('cart')}
        className="flex items-center text-sm font-bold text-[#6C757D] hover:text-[#0047AB] transition-colors group mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to B2B Cart
      </button>

      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 mb-8">
        <Landmark className="w-7 h-7 text-[#0047AB]" />
        B2B Wholesale Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          <B2BCartAddressSection
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            setSelectedAddressId={setSelectedAddressId}
            loading={isAddressLoading}
            showForm={showAddressForm}
            setShowForm={setShowAddressForm}
            form={addressForm}
            setForm={setAddressForm}
            defaultForm={defaultAddressForm}
            error={addressError}
            setError={setAddressError}
            saving={isSavingAddress}
            handleSubmit={handleAddressSubmit}
            canSubmit={canSubmitAddress}
            postalLookup={postalLookup}
            manualLocalityActive={isManualLocality}
            setManualLocalityActive={setIsManualLocality}
            selectedLocality={selectedLocality}
            setSelectedLocality={setSelectedLocality}
            manualLocality={manualLocality}
            setManualLocality={setManualLocality}
            resolvedLocalityOptions={resolvedLocalityOptions}
          />

          <B2BCartSettlementSection
            seller={seller}
            hasBank={hasBank}
            hasUpi={hasUpi}
            paymentMode={paymentMode}
            setSelectedPaymentMode={setSelectedPaymentMode}
          />

          <B2BCartPaymentProofSection
            paymentMode={paymentMode}
            paymentReferenceNo={paymentReferenceNo}
            setPaymentReferenceNo={setPaymentReferenceNo}
            paymentReceiptUrl={paymentReceiptUrl}
            setPaymentReceiptUrl={setPaymentReceiptUrl}
          />
        </div>

        {/* Right Column - Order Summary */}
        <B2BCartOrderSummary
          items={items}
          totals={totals}
          formatCurrency={formatCurrency}
          checkoutError={checkoutError}
          handlePlaceOrder={handleFormPlaceOrder}
          isProcessing={isProcessing}
          isMutating={isMutating}
        />
      </div>
    </div>
  );
}
