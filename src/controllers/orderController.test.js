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

  const tx = {
    businessProfile: {
      findUnique: async () => null,
    },
  };
  const grouped = await buildOrdersBySeller(tx, cartItems, null);

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

test('buildOrdersBySeller calculates delivery fee below and above threshold', async () => {
  const tx = {};

  // Test case 1: Subtotal (400) < threshold (1000) -> delivery fee applied per-item (2 * 50 = 100)
  const cartItems1 = [
    {
      id: 'item-1',
      quantity: 2,
      selectedSize: null,
      product: {
        id: 'product-1',
        name: 'Item A',
        price: 200,
        currentStock: 10,
        wholesalerId: 'seller-1',
        deliveryFee: null,
        wholesaler: {
          deliveryFee: 50,
          freeDeliveryThreshold: 1000,
        },
      },
    },
  ];

  const grouped1 = await buildOrdersBySeller(tx, cartItems1, null);
  assert.equal(grouped1['seller-1'].subtotal, 400);
  assert.equal(grouped1['seller-1'].deliveryFee, 100);
  assert.equal(grouped1['seller-1'].totalAmount, 500);

  // Test case 2: Subtotal (1200) >= threshold (1000) -> free delivery (0)
  const cartItems2 = [
    {
      id: 'item-2',
      quantity: 6,
      selectedSize: null,
      product: {
        id: 'product-2',
        name: 'Item B',
        price: 200,
        currentStock: 10,
        wholesalerId: 'seller-1',
        deliveryFee: null,
        wholesaler: {
          deliveryFee: 50,
          freeDeliveryThreshold: 1000,
        },
      },
    },
  ];

  const grouped2 = await buildOrdersBySeller(tx, cartItems2, null);
  assert.equal(grouped2['seller-1'].subtotal, 1200);
  assert.equal(grouped2['seller-1'].deliveryFee, 0);
  assert.equal(grouped2['seller-1'].totalAmount, 1200);

  // Test case 3: Null threshold -> delivery fee always applied per-item (6 * 50 = 300)
  const cartItems3 = [
    {
      id: 'item-3',
      quantity: 6,
      selectedSize: null,
      product: {
        id: 'product-3',
        name: 'Item C',
        price: 200,
        currentStock: 10,
        wholesalerId: 'seller-1',
        deliveryFee: null,
        wholesaler: {
          deliveryFee: 50,
          freeDeliveryThreshold: null,
        },
      },
    },
  ];

  const grouped3 = await buildOrdersBySeller(tx, cartItems3, null);
  assert.equal(grouped3['seller-1'].subtotal, 1200);
  assert.equal(grouped3['seller-1'].deliveryFee, 300);
  assert.equal(grouped3['seller-1'].totalAmount, 1500);

  // Test case 4: Product-level delivery fee overrides and wholesaler fallbacks
  const cartItems4 = [
    {
      id: 'item-4a',
      quantity: 2,
      selectedSize: null,
      product: {
        id: 'product-4a',
        name: 'Item with Override',
        price: 200,
        currentStock: 10,
        wholesalerId: 'seller-1',
        deliveryFee: 15,
        wholesaler: {
          deliveryFee: 50,
          freeDeliveryThreshold: 1000,
        },
      },
    },
    {
      id: 'item-4b',
      quantity: 1,
      selectedSize: null,
      product: {
        id: 'product-4b',
        name: 'Item without Override',
        price: 200,
        currentStock: 10,
        wholesalerId: 'seller-1',
        deliveryFee: null,
        wholesaler: {
          deliveryFee: 50,
          freeDeliveryThreshold: 1000,
        },
      },
    },
  ];

  const grouped4 = await buildOrdersBySeller(tx, cartItems4, null);
  // Subtotal = (2 * 200) + (1 * 200) = 600
  // Delivery fee = (2 * 15) + (1 * 50) = 80
  assert.equal(grouped4['seller-1'].subtotal, 600);
  assert.equal(grouped4['seller-1'].deliveryFee, 80);
  assert.equal(grouped4['seller-1'].totalAmount, 680);
});
