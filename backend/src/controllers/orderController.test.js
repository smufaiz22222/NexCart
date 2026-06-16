import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrdersBySeller, validateSelectedSize } from './orderController.js';

test('validateSelectedSize returns null for products without sizes', () => {
  const product = { sizes: [] };
  assert.equal(validateSelectedSize(product, null), null);
});

test('buildOrdersBySeller groups cart items by seller and preserves purchase snapshots', async () => {
  const cartItems = [
    {
      id: 'cart-item-1',
      quantity: 2,
      selectedSize: null,
      recommendationId: 'rec-1',
      recommendationSource: 'similar_products',
      product: {
        id: 'product-1',
        name: 'Beanie',
        price: 250,
        currentStock: 12,
        wholesalerId: 'seller-1',
        sizes: [],
      },
    },
    {
      id: 'cart-item-2',
      quantity: 1,
      selectedSize: 'M',
      product: {
        id: 'product-2',
        name: 'T-Shirt',
        price: 499.5,
        currentStock: 5,
        wholesalerId: 'seller-1',
        sizes: ['S', 'M', 'L'],
      },
    },
  ];

  const grouped = await buildOrdersBySeller(cartItems);

  assert.deepEqual(Object.keys(grouped), ['seller-1']);
  assert.equal(grouped['seller-1'].orderItems.length, 2);
  assert.equal(grouped['seller-1'].totalAmount, 999.5);
  assert.equal(grouped['seller-1'].orderItems[0].selectedSize, null);
  assert.equal(grouped['seller-1'].orderItems[0].subtotalAtPurchase, 500);
  assert.equal(grouped['seller-1'].orderItems[0].recommendationId, 'rec-1');
  assert.equal(grouped['seller-1'].orderItems[0].recommendationSource, 'similar_products');
  assert.equal(grouped['seller-1'].orderItems[1].selectedSize, 'M');
  assert.equal(grouped['seller-1'].orderItems[1].subtotalAtPurchase, 499.5);
});
