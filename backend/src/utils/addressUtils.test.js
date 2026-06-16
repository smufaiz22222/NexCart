import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areAddressesEqual,
  formatShippingAddress,
  normalizeAddress,
  validateIndianPhone,
  validateIndianPostalCode,
} from './addressUtils.js';

test('validateIndianPhone accepts valid Indian mobile numbers', () => {
  assert.equal(validateIndianPhone('9876543210'), true);
  assert.equal(validateIndianPhone('6123456789'), true);
  assert.equal(validateIndianPhone('5876543210'), false);
  assert.equal(validateIndianPhone('98765'), false);
});

test('validateIndianPostalCode enforces exactly six digits', () => {
  assert.equal(validateIndianPostalCode('110001'), true);
  assert.equal(validateIndianPostalCode('400 001'), false);
  assert.equal(validateIndianPostalCode('5600012'), false);
  assert.equal(validateIndianPostalCode('ABC123'), false);
});

test('normalizeAddress canonicalizes whitespace, case, and phone digits', () => {
  const normalized = normalizeAddress({
    fullName: '  Ada   Lovelace ',
    phone: '+91 98765 43210',
    addressLine1: '  221B   Baker Street ',
    addressLine2: '  MG Road  ',
    landmark: ' Near   Metro ',
    city: '  Bengaluru ',
    state: ' KARNATAKA ',
    postalCode: '560001',
    country: ' india ',
  });

  assert.deepEqual(normalized, {
    fullName: 'ada lovelace',
    phone: '919876543210',
    addressLine1: '221b baker street',
    addressLine2: 'mg road',
    landmark: 'near metro',
    city: 'bengaluru',
    state: 'karnataka',
    postalCode: '560001',
    country: 'india',
  });
});

test('areAddressesEqual matches equivalent addresses after normalization', () => {
  const left = {
    fullName: 'Ada Lovelace',
    phone: '9876543210',
    addressLine1: '221B Baker Street',
    addressLine2: 'MG Road',
    landmark: 'Near Metro',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
  };

  const right = {
    fullName: ' ada   lovelace ',
    phone: '98765 43210',
    addressLine1: '221B   Baker Street',
    addressLine2: ' MG Road ',
    landmark: 'Near Metro',
    city: ' bengaluru ',
    state: 'karnataka',
    postalCode: '560001',
    country: ' india ',
  };

  assert.equal(areAddressesEqual(left, right), true);
});

test('formatShippingAddress builds a stable historical snapshot string', () => {
  const formatted = formatShippingAddress({
    fullName: 'Ada Lovelace',
    phone: '9876543210',
    addressLine1: '221B Baker Street',
    addressLine2: 'MG Road',
    landmark: 'Near Metro',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    country: 'India',
  });

  assert.equal(
    formatted,
    'Ada Lovelace, 9876543210, 221B Baker Street, MG Road, Near Metro, Bengaluru, Karnataka, 560001, India'
  );
});
