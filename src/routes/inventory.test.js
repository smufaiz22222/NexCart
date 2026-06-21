import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const originalMethods = {
  productFindFirst: prisma.product.findFirst,
  productUpdate: prisma.product.update,
  inventoryLogCreate: prisma.inventoryLog.create,
  userFindUnique: prisma.user.findUnique,
  transaction: prisma.$transaction,
};

const getToken = () =>
  jwt.sign(
    {
      userId: 'wholesaler-user-1',
      role: 'WHOLESALER',
      wholesalerId: 'wholesaler-1',
    },
    process.env.JWT_SECRET
  );

afterEach(() => {
  prisma.product.findFirst = originalMethods.productFindFirst;
  prisma.product.update = originalMethods.productUpdate;
  prisma.inventoryLog.create = originalMethods.inventoryLogCreate;
  prisma.user.findUnique = originalMethods.userFindUnique;
  prisma.$transaction = originalMethods.transaction;
});

test('POST /api/inventory rejects adjustment that results in negative stock', async () => {
  prisma.user.findUnique = async () => ({
    id: 'wholesaler-user-1',
    role: 'WHOLESALER',
    wholesalerProfile: {
      id: 'wholesaler-1',
      onboardingStatus: 'APPROVED',
    },
  });

  prisma.product.findFirst = async () => ({
    id: 'prod-1',
    wholesalerId: 'wholesaler-1',
    currentStock: 5,
    name: 'Test Product',
  });

  const response = await request(app)
    .post('/api/inventory')
    .set('Authorization', `Bearer ${getToken()}`)
    .send({
      productId: 'prod-1',
      changeAmount: -10,
      reason: 'manual adjustment',
    });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /result in negative stock/i);
});

test('POST /api/inventory allows adjustment that keeps stock >= 0', async () => {
  prisma.user.findUnique = async () => ({
    id: 'wholesaler-user-1',
    role: 'WHOLESALER',
    wholesalerProfile: {
      id: 'wholesaler-1',
      onboardingStatus: 'APPROVED',
    },
  });

  prisma.product.findFirst = async () => ({
    id: 'prod-1',
    wholesalerId: 'wholesaler-1',
    currentStock: 5,
    name: 'Test Product',
  });

  let productUpdated = false;
  let logCreated = false;

  prisma.$transaction = async (callback) => {
    const mockTx = {
      inventoryLog: {
        create: async (args) => {
          logCreated = true;
          return { id: 'log-1', ...args.data };
        },
      },
      product: {
        update: async (args) => {
          productUpdated = true;
          return { id: 'prod-1', currentStock: 2, ...args.data };
        },
      },
    };
    return callback(mockTx);
  };

  const response = await request(app)
    .post('/api/inventory')
    .set('Authorization', `Bearer ${getToken()}`)
    .send({
      productId: 'prod-1',
      changeAmount: -3,
      reason: 'manual adjustment',
    });

  assert.equal(response.status, 200);
  assert.equal(productUpdated, true);
  assert.equal(logCreated, true);
});
