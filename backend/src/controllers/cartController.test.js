import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuantity, validateSelectedSize } from './cartController.js';

test('validateQuantity accepts only positive integers', () => {
  assert.equal(validateQuantity(1), 1);
  assert.equal(validateQuantity('3'), 3);
  assert.throws(() => validateQuantity(0), /positive integer/);
  assert.throws(() => validateQuantity(-1), /positive integer/);
  assert.throws(() => validateQuantity(1.5), /positive integer/);
});

test('validateSelectedSize returns null for products without sizes', () => {
  const product = { sizes: [] };
  assert.equal(validateSelectedSize(product, null), null);
  assert.equal(validateSelectedSize(product, ''), null);
});

test('validateSelectedSize enforces an available size when sizes exist', () => {
  const product = { name: 'T-Shirt', sizes: ['S', 'M', 'L'] };
  assert.equal(validateSelectedSize(product, 'M'), 'M');
  assert.throws(() => validateSelectedSize(product, null), /valid size/);
  assert.throws(() => validateSelectedSize(product, 'XL'), /not available/);
});
