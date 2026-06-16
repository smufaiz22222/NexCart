const normalizeValue = (value) => value?.trim().replace(/\s+/g, ' ') || '';

export const validateIndianPhone = (phone) => /^[6-9]\d{9}$/.test((phone || '').trim());

export const validateIndianPostalCode = (postalCode) => /^\d{6}$/.test((postalCode || '').trim());

export const normalizeAddress = (address) => ({
  fullName: normalizeValue(address.fullName).toLowerCase(),
  phone: (address.phone || '').replace(/\D/g, ''),
  addressLine1: normalizeValue(address.addressLine1).toLowerCase(),
  addressLine2: normalizeValue(address.addressLine2).toLowerCase(),
  landmark: normalizeValue(address.landmark).toLowerCase(),
  city: normalizeValue(address.city).toLowerCase(),
  state: normalizeValue(address.state).toLowerCase(),
  postalCode: (address.postalCode || '').trim(),
  country: normalizeValue(address.country || 'India').toLowerCase(),
});

export const areAddressesEqual = (left, right) => {
  const normalizedLeft = normalizeAddress(left);
  const normalizedRight = normalizeAddress(right);

  return Object.keys(normalizedLeft).every((key) => normalizedLeft[key] === normalizedRight[key]);
};

export const formatShippingAddress = (address) => {
  const parts = [
    normalizeValue(address.fullName),
    normalizeValue(address.phone),
    normalizeValue(address.addressLine1),
    normalizeValue(address.addressLine2),
    normalizeValue(address.landmark),
    [
      normalizeValue(address.city),
      normalizeValue(address.state),
      normalizeValue(address.postalCode),
    ]
      .filter(Boolean)
      .join(', '),
    normalizeValue(address.country || 'India'),
  ].filter(Boolean);

  return parts.join(', ');
};
