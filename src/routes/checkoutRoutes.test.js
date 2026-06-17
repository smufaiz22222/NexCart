import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const originalMethods = {
  userFindUnique: prisma.user.findUnique,
  transaction: prisma.$transaction,
};

const getToken = () =>
  jwt.sign(
    {
      userId: 'user-1',
    },
    process.env.JWT_SECRET
  );

afterEach(() => {
  prisma.user.findUnique = originalMethods.userFindUnique;
  prisma.$transaction = originalMethods.transaction;
});

test('POST /api/orders/checkout creates snapshot-based orders from backend cart and clears the cart', async () => {
  let orderCreateData = null;
  let interactionCreateData = null;
  let eventCreateData = null;
  let cartDeletePayload = null;

  prisma.user.findUnique = async () => ({
    id: 'user-1',
    role: 'CUSTOMER',
    wholesalerProfile: null,
  });
  prisma.$transaction = async (callback) => {
    const tx = {
      businessProfile: {
        findUnique: async () => null,
      },
      shippingAddress: {
        findUnique: async () => ({
          id: 'addr-1',
          userId: 'user-1',
          fullName: 'Asha Patel',
          phone: '9876543210',
          addressLine1: '221 Market Road',
          addressLine2: 'Floor 2',
          landmark: 'Near Lake',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411001',
          country: 'India',
        }),
      },
      cart: {
        findUnique: async () => ({
          id: 'cart-1',
          items: [
            {
              id: 'cart-item-1',
              productId: 'prod-1',
              quantity: 2,
              selectedSize: null,
              recommendationId: 'rec-1',
              recommendationSource: 'similar_products',
              product: {
                id: 'prod-1',
                name: 'Beanie',
                price: 250,
                currentStock: 10,
                wholesalerId: 'seller-1',
                sizes: [],
              },
            },
          ],
        }),
      },
      order: {
        create: async ({ data }) => {
          orderCreateData = data;
          return {
            id: 'order-1',
            ...data,
            items: [],
            invoice: null,
          };
        },
      },
      recommendationLog: {
        findUnique: async () => ({
          id: 'rec-1',
          userId: 'user-1',
          productIds: ['prod-1'],
          isEvaluation: false,
          createdAt: new Date().toISOString(),
        }),
      },
      recommendationInteraction: {
        createMany: async ({ data }) => {
          interactionCreateData = data;
          return { count: data.length };
        },
      },
      recommendationEvent: {
        createMany: async ({ data }) => {
          eventCreateData = data;
          return { count: data.length };
        },
      },
      invoice: {
        create: async () => ({ id: 'invoice-1' }),
      },
      ledgerEntry: {
        create: async () => ({}),
      },
      product: {
        updateMany: async () => ({ count: 1 }),
        findUnique: async () => ({ name: 'Beanie' }),
      },
      inventoryLog: {
        create: async () => ({}),
      },
      cartItem: {
        deleteMany: async (payload) => {
          cartDeletePayload = payload;
          return { count: 1 };
        },
      },
    };

    return callback(tx);
  };

  const response = await request(app)
    .post('/api/orders/checkout')
    .set('Authorization', `Bearer ${getToken()}`)
    .send({
      addressId: 'addr-1',
      paymentMethod: 'COD',
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.orders.length, 1);
  assert.equal(
    orderCreateData.shippingAddress,
    'Asha Patel, 9876543210, 221 Market Road, Floor 2, Near Lake, Pune, Maharashtra, 411001, India'
  );
  assert.deepEqual(orderCreateData.items.create[0], {
    productId: 'prod-1',
    quantity: 2,
    price: 250,
    unitPriceAtPurchase: 250,
    subtotalAtPurchase: 500,
    selectedSize: null,
    recommendationId: 'rec-1',
  });
  assert.deepEqual(interactionCreateData, [
    {
      userId: 'user-1',
      productId: 'prod-1',
      action: 'purchase',
      quantity: 2,
      source: 'checkout',
      recommendationId: 'rec-1',
      metadata: {
        orderItemPrice: '250',
      },
    },
  ]);
  assert.deepEqual(eventCreateData, [
    {
      recommendationLogId: 'rec-1',
      productId: 'prod-1',
      userId: 'user-1',
      eventType: 'purchase',
    },
  ]);
  assert.deepEqual(cartDeletePayload, {
    where: {
      cartId: 'cart-1',
    },
  });
});
