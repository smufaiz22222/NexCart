import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const originalMethods = {
  userFindUnique: prisma.user.findUnique,
  shippingAddressCount: prisma.shippingAddress.count,
  shippingAddressFindMany: prisma.shippingAddress.findMany,
};

const originalFetch = global.fetch;

const getToken = () =>
  jwt.sign(
    {
      userId: 'user-1',
    },
    process.env.JWT_SECRET
  );

afterEach(() => {
  prisma.user.findUnique = originalMethods.userFindUnique;
  prisma.shippingAddress.count = originalMethods.shippingAddressCount;
  prisma.shippingAddress.findMany = originalMethods.shippingAddressFindMany;
  global.fetch = originalFetch;
});

test('POST /api/addresses rejects duplicate saved addresses after normalization', async () => {
  prisma.user.findUnique = async () => ({
    id: 'user-1',
    role: 'CUSTOMER',
    wholesalerProfile: null,
  });
  prisma.shippingAddress.count = async () => 1;
  prisma.shippingAddress.findMany = async () => [
    {
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
    },
  ];
  global.fetch = async () => ({
    ok: true,
    json: async () => [
      {
        Status: 'Success',
        Message: 'Number of post office(s) found',
        PostOffice: [
          {
            Name: 'Shivajinagar',
            District: 'Pune',
            State: 'Maharashtra',
          },
        ],
      },
    ],
  });

  const response = await request(app)
    .post('/api/addresses')
    .set('Authorization', `Bearer ${getToken()}`)
    .send({
      fullName: '  Asha Patel  ',
      phone: '98765 43210',
      addressLine1: '221   Market Road',
      addressLine2: 'Floor 2',
      landmark: 'Near Lake',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      country: 'India',
      locality: 'Shivajinagar',
    });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /already saved/i);
});
