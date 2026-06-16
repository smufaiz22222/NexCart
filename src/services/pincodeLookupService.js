import { validateIndianPostalCode } from '../utils/addressUtils.js';

const PINCODE_PROVIDER_BASE_URL = 'https://api.postalpincode.in/pincode';
const REQUEST_TIMEOUT_MS = 8000;

const buildLookupError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const withTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw buildLookupError('Pincode lookup timed out. Please try again.', 504);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const lookupIndianPincode = async (postalCode) => {
  const normalizedPostalCode = `${postalCode || ''}`.trim();
  if (!validateIndianPostalCode(normalizedPostalCode)) {
    throw buildLookupError('Postal code must be exactly 6 digits', 400);
  }

  const response = await withTimeout(`${PINCODE_PROVIDER_BASE_URL}/${normalizedPostalCode}`);
  if (!response.ok) {
    throw buildLookupError('Pincode provider is unavailable right now', 502);
  }

  const payload = await response.json();
  const providerResult = Array.isArray(payload) ? payload[0] : null;

  if (
    !providerResult ||
    providerResult.Status !== 'Success' ||
    !providerResult.PostOffice?.length
  ) {
    return {
      postalCode: normalizedPostalCode,
      resolved: false,
      message: providerResult?.Message || 'No location data found for this postal code',
      city: '',
      district: '',
      state: '',
      localities: [],
    };
  }

  const primaryOffice = providerResult.PostOffice[0];
  const state = primaryOffice.State?.trim() || '';
  const district = primaryOffice.District?.trim() || '';
  const city = district;
  const localities = [
    ...new Set(providerResult.PostOffice.map((office) => office.Name?.trim()).filter(Boolean)),
  ];

  if (!state || !city) {
    throw buildLookupError('Pincode lookup returned incomplete location data', 502);
  }

  return {
    postalCode: normalizedPostalCode,
    resolved: true,
    message: providerResult.Message || 'Pincode resolved successfully',
    city,
    district,
    state,
    localities,
  };
};
