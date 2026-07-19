import { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/axios';

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

export function useAddressManager(userId, shouldFetch) {
  const selectedAddressStorageKey = userId
    ? `nexcart:selectedAddressId:${userId}`
    : 'nexcart:selectedAddressId';

  const [addresses, setAddresses] = useState(() => (shouldFetch ? null : []));
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
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
  const isAddressLoading = shouldFetch && addresses === null;

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
    try {
      const response = await apiClient.get('/addresses');
      const nextAddresses = response.data.addresses || [];
      setAddresses(nextAddresses);
      syncSelectedAddress(nextAddresses);
    } catch (error) {
      setAddresses([]);
      setAddressError(error.response?.data?.error || 'Failed to load saved addresses');
    }
  }, [syncSelectedAddress]);

  useEffect(() => {
    let active = true;
    if (shouldFetch) {
      setAddresses(null);
      const run = async () => {
        try {
          const response = await apiClient.get('/addresses');
          if (!active) return;
          const nextAddresses = response.data.addresses || [];
          setAddresses(nextAddresses);
          syncSelectedAddress(nextAddresses);
        } catch (error) {
          if (!active) return;
          setAddresses([]);
          setAddressError(error.response?.data?.error || 'Failed to load saved addresses');
        }
      };
      void run();
    }
    return () => {
      active = false;
    };
  }, [shouldFetch, syncSelectedAddress]);

  useEffect(() => {
    if (!selectedAddressId) return;
    localStorage.setItem(selectedAddressStorageKey, selectedAddressId);
  }, [selectedAddressId, selectedAddressStorageKey]);

  const changePostalLookup = (val) => setPostalLookup(val);
  const changeSelectedLocality = (val) => setSelectedLocality(val);
  const changeManualLocality = (val) => setManualLocality(val);
  const changeIsManualLocality = (val) => setIsManualLocality(val);
  const changeAddressForm = (val) => setAddressForm(val);

  // Postal code lookup effect
  useEffect(() => {
    const postalCode = addressForm.postalCode.trim();

    if (!/^\d{6}$/.test(postalCode)) {
      changePostalLookup((current) => ({
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

      changeSelectedLocality('');
      changeManualLocality('');
      changeIsManualLocality(false);
      changeAddressForm((current) => ({ ...current, city: '', state: '' }));
      return undefined;
    }

    const timer = setTimeout(async () => {
      changePostalLookup((current) => ({
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

        changePostalLookup({
          ...lookup,
          status: lookup.resolved ? 'resolved' : 'error',
          message: lookup.message,
        });

        changeAddressForm((current) => ({
          ...current,
          postalCode,
          city: lookup.city || '',
          state: lookup.state || '',
          addressLine2: firstKnownLocality || '',
        }));
        changeSelectedLocality(firstKnownLocality || lookup.otherValue || OTHER_LOCALITY_VALUE);
        changeManualLocality('');
        changeIsManualLocality(false);
      } catch (error) {
        changePostalLookup({
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
        changeSelectedLocality('');
        changeManualLocality('');
        changeIsManualLocality(false);
        changeAddressForm((current) => ({ ...current, city: '', state: '', addressLine2: '' }));
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
    if (event) event.preventDefault();
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

  const activeAddresses = shouldFetch ? (addresses ?? []) : [];
  const activeSelectedAddressId = shouldFetch ? selectedAddressId : '';

  return {
    addresses: activeAddresses,
    selectedAddressId: activeSelectedAddressId,
    setSelectedAddressId,
    isAddressLoading,
    isSavingAddress,
    addressError,
    editingAddressId,
    addressForm,
    setAddressForm,
    postalLookup,
    setPostalLookup,
    selectedLocality,
    setSelectedLocality,
    manualLocality,
    setManualLocality,
    isManualLocality,
    setIsManualLocality,
    canSubmitAddress,
    startAddressEdit,
    resetAddressEditor,
    handleAddressSubmit,
    handleDeleteAddress,
    handleSetDefaultAddress,
  };
}
