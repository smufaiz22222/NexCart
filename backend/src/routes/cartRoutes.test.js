import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const originalMethods = {
  userFindUnique: prisma.user.findUnique,
  productFindUnique: prisma.product.findUnique,
  cartUpsert: prisma.cart.upsert,
  cartFindUnique: prisma.cart.findUnique,
  cartItemFindFirst: prisma.cartItem.findFirst,
  cartItemCreate: prisma.cartItem.create,
  cartItemUpdate: prisma.cartItem.update,
  recommendationLogFindUnique: prisma.recommendationLog.findUnique,
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
  prisma.product.findUnique = originalMethods.productFindUnique;
  prisma.cart.upsert = originalMethods.cartUpsert;
  prisma.cart.findUnique = originalMethods.cartFindUnique;
  prisma.cartItem.findFirst = originalMethods.cartItemFindFirst;
  prisma.cartItem.create = originalMethods.cartItemCreate;
  prisma.cartItem.update = originalMethods.cartItemUpdate;
  prisma.recommendationLog.findUnique = originalMethods.recommendationLogFindUnique;
});

test('POST /api/cart/items merges duplicate items and persists recommendation attribution', async () => {
  let updatedPayload = null;

  prisma.user.findUnique = async () => ({
    id: 'user-1',
    role: 'CUSTOMER',
    wholesalerProfile: null,
  });
  prisma.product.findUnique = async () => ({
    id: 'prod-1',
    name: 'Graphic Tee',
    price: 499,
    currentStock: 5,
    sizes: ['M', 'L'],
  });
  prisma.recommendationLog.findUnique = async () => ({
    id: 'rec-1',
    userId: 'user-1',
    productIds: ['prod-1'],
    isEvaluation: false,
    createdAt: new Date().toISOString(),
  });
  prisma.cart.upsert = async () => ({ id: 'cart-1', userId: 'user-1' });
  prisma.cartItem.findFirst = async () => ({
    id: 'item-1',
    quantity: 1,
    recommendationId: null,
    recommendationSource: null,
  });
  prisma.cartItem.update = async ({ data }) => {
    updatedPayload = data;
    return { id: 'item-1', ...data };
  };
  prisma.cart.findUnique = async () => ({
    id: 'cart-1',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        selectedSize: 'M',
        quantity: 2,
        product: {
          id: 'prod-1',
          name: 'Graphic Tee',
          imageUrl: 'https://example.com/tee.png',
          category: 'Apparel',
          price: 499,
          currentStock: 5,
          wholesaler: {
            businessName: 'North Shop',
          },
        },
      },
    ],
  });

  const response = await request(app)
    .post('/api/cart/items')
    .set('Authorization', `Bearer ${getToken()}`)
    .send({
      productId: 'prod-1',
      selectedSize: 'M',
      quantity: 1,
      recommendationId: 'rec-1',
      recommendationSource: 'similar_products',
    });

  assert.equal(response.status, 200);
  assert.deepEqual(updatedPayload, {
    quantity: 2,
    recommendationId: 'rec-1',
    recommendationSource: 'similar_products',
  });
  assert.equal(response.body.totals.itemCount, 2);
  assert.equal(response.body.items[0].productSnapshot.name, 'Graphic Tee');
});
