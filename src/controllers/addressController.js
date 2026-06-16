import { prisma } from '../config/db.js';
import { lookupIndianPincode } from '../services/pincodeLookupService.js';
import {
  areAddressesEqual,
  formatShippingAddress,
  validateIndianPhone,
  validateIndianPostalCode,
} from '../utils/addressUtils.js';

const MAX_SAVED_ADDRESSES = 10;
const OTHER_LOCALITY_VALUE = '__OTHER__';

const buildAddressError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const requireCustomer = (req) => {
  if (req.user.role !== 'CUSTOMER') {
    throw buildAddressError('Only customers can access saved addresses', 403);
  }
};

const sanitizeAddressPayload = (body) => ({
  fullName: body.fullName?.trim() || '',
  phone: (body.phone || '').replace(/\D/g, ''),
  addressLine1: body.addressLine1?.trim() || '',
  addressLine2: body.addressLine2?.trim() || '',
  landmark: body.landmark?.trim() || '',
  city: body.city?.trim() || '',
  state: body.state?.trim() || '',
  postalCode: `${body.postalCode || ''}`.trim(),
  country: body.country?.trim() || 'India',
});

const ensureAddressPayloadIsValid = (address) => {
  const requiredFields = [
    'fullName',
    'phone',
    'addressLine1',
    'city',
    'state',
    'postalCode',
    'country',
  ];
  for (const field of requiredFields) {
    if (!address[field]) {
      throw buildAddressError(`${field} is required`);
    }
  }

  if (!validateIndianPhone(address.phone)) {
    throw buildAddressError('Phone must be a valid Indian mobile number');
  }

  if (!validateIndianPostalCode(address.postalCode)) {
    throw buildAddressError('Postal code must be exactly 6 digits');
  }
};

const listUserAddresses = (userId) =>
  prisma.shippingAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

const ensureNoDuplicateAddress = async ({ userId, nextAddress, ignoreId = null }) => {
  const existingAddresses = await prisma.shippingAddress.findMany({
    where: {
      userId,
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
  });

  if (existingAddresses.some((address) => areAddressesEqual(address, nextAddress))) {
    throw buildAddressError('This address is already saved');
  }
};

const serializeAddress = (address) => ({
  ...address,
  formatted: formatShippingAddress(address),
});

const resolvePincodeGuard = async ({ postalCode, city, state, locality }) => {
  const lookup = await lookupIndianPincode(postalCode);

  if (!lookup.resolved) {
    throw buildAddressError(lookup.message || 'Postal code could not be resolved');
  }

  if (lookup.city !== city || lookup.state !== state) {
    throw buildAddressError('City or state does not match the postal code lookup');
  }

  const normalizedLocality = locality?.trim() || '';
  if (!normalizedLocality) {
    throw buildAddressError('Area / locality is required');
  }

  return lookup;
};

export const getAddresses = async (req, res) => {
  try {
    requireCustomer(req);
    const addresses = await listUserAddresses(req.user.userId);
    res.status(200).json({ addresses: addresses.map(serializeAddress) });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to load addresses' });
  }
};

export const createAddress = async (req, res) => {
  try {
    requireCustomer(req);
    const userId = req.user.userId;
    const nextAddress = sanitizeAddressPayload(req.body);
    ensureAddressPayloadIsValid(nextAddress);
    await resolvePincodeGuard({
      postalCode: nextAddress.postalCode,
      city: nextAddress.city,
      state: nextAddress.state,
      locality:
        req.body.locality ||
        nextAddress.addressLine2 ||
        nextAddress.landmark ||
        nextAddress.addressLine1,
    });

    const addressCount = await prisma.shippingAddress.count({ where: { userId } });
    if (addressCount >= MAX_SAVED_ADDRESSES) {
      throw buildAddressError('You can save up to 10 addresses only');
    }

    await ensureNoDuplicateAddress({ userId, nextAddress });

    const createdAddress = await prisma.$transaction(async (tx) => {
      const isFirstAddress = addressCount === 0;
      if (req.body.isDefault || isFirstAddress) {
        await tx.shippingAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.shippingAddress.create({
        data: {
          userId,
          ...nextAddress,
          isDefault: Boolean(req.body.isDefault || isFirstAddress),
        },
      });
    });

    res.status(201).json({ address: serializeAddress(createdAddress) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to save address' });
  }
};

export const updateAddress = async (req, res) => {
  try {
    requireCustomer(req);
    const { id } = req.params;
    const userId = req.user.userId;
    const existingAddress = await prisma.shippingAddress.findUnique({ where: { id } });

    if (!existingAddress || existingAddress.userId !== userId) {
      throw buildAddressError('Address not found', 404);
    }

    const nextAddress = sanitizeAddressPayload(req.body);
    ensureAddressPayloadIsValid(nextAddress);
    await resolvePincodeGuard({
      postalCode: nextAddress.postalCode,
      city: nextAddress.city,
      state: nextAddress.state,
      locality:
        req.body.locality ||
        nextAddress.addressLine2 ||
        nextAddress.landmark ||
        nextAddress.addressLine1,
    });
    await ensureNoDuplicateAddress({ userId, nextAddress, ignoreId: id });

    const updatedAddress = await prisma.$transaction(async (tx) => {
      if (req.body.isDefault) {
        await tx.shippingAddress.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.shippingAddress.update({
        where: { id },
        data: {
          ...nextAddress,
          isDefault: req.body.isDefault ? true : existingAddress.isDefault,
        },
      });
    });

    res.status(200).json({ address: serializeAddress(updatedAddress) });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to update address' });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    requireCustomer(req);
    const { id } = req.params;
    const userId = req.user.userId;
    const existingAddress = await prisma.shippingAddress.findUnique({ where: { id } });

    if (!existingAddress || existingAddress.userId !== userId) {
      throw buildAddressError('Address not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.shippingAddress.delete({ where: { id } });

      if (existingAddress.isDefault) {
        const replacement = await tx.shippingAddress.findFirst({
          where: { userId },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });

        if (replacement) {
          await tx.shippingAddress.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
    });

    res.status(200).json({ message: 'Address deleted successfully' });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to delete address' });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    requireCustomer(req);
    const { id } = req.params;
    const userId = req.user.userId;
    const existingAddress = await prisma.shippingAddress.findUnique({ where: { id } });

    if (!existingAddress || existingAddress.userId !== userId) {
      throw buildAddressError('Address not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.shippingAddress.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });

      await tx.shippingAddress.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    res.status(200).json({ message: 'Default address updated successfully' });
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to set default address' });
  }
};

export const lookupPincode = async (req, res) => {
  try {
    requireCustomer(req);
    const lookup = await lookupIndianPincode(req.params.postalCode);

    res.status(200).json({
      ...lookup,
      localities: [...lookup.localities, OTHER_LOCALITY_VALUE].filter(
        (value, index, array) => array.indexOf(value) === index
      ),
      otherValue: OTHER_LOCALITY_VALUE,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      postalCode: req.params.postalCode,
      resolved: false,
      message: error.message || 'Failed to lookup postal code',
      localities: [],
      city: '',
      district: '',
      state: '',
    });
  }
};
