import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const makeToken = (userId, role, wholesalerId) =>
  jwt.sign(
    {
      userId,
      role,
      wholesalerId,
    },
    process.env.JWT_SECRET
  );

const cleanupPricingFixture = async (fixture) => {
  if (!fixture) return;
  if (fixture.productIds?.length) {
    await prisma.product.deleteMany({ where: { id: { in: fixture.productIds } } });
  }
  if (fixture.wholesalerId) {
    await prisma.wholesaler.delete({ where: { id: fixture.wholesalerId } });
  }
  if (fixture.wholesalerUserId) {
    await prisma.user.delete({ where: { id: fixture.wholesalerUserId } });
  }
};

test('Product pricing validation and marketplace discount percentage logic', async () => {
  const sellerUser = await prisma.user.create({
    data: {
      email: `pricing-seller-${Date.now()}@example.com`,
      password: 'password',
      name: 'Pricing Test Wholesaler',
      role: 'WHOLESALER',
    },
  });

  const wholesaler = await prisma.wholesaler.create({
    data: {
      userId: sellerUser.id,
      businessName: 'Pricing Test Wholesale LLC',
    },
  });

  const fixture = {
    wholesalerUserId: sellerUser.id,
    wholesalerId: wholesaler.id,
    productIds: [],
  };

  const sellerToken = makeToken(sellerUser.id, 'WHOLESALER', wholesaler.id);

  try {
    // 1. Create a product with valid pricing: costPrice=100, actualPrice=250, price=180
    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Valid Pricing Product',
        sku: `SKU-${Date.now()}-1`,
        description: 'Test product for pricing validation',
        price: 180.0,
        costPrice: 100.0,
        actualPrice: 250.0,
        category: 'Electronics',
        currentStock: 10,
        minStock: 2,
      });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.product.costPrice, 100);
    assert.equal(createRes.body.product.actualPrice, 250);
    assert.equal(createRes.body.product.price, 180);
    fixture.productIds.push(createRes.body.product.id);

    // 2. Create a product with invalid pricing: actualPrice < price (Original price less than discounted price)
    const invalidRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Invalid Pricing Product',
        sku: `SKU-${Date.now()}-2`,
        price: 200.0,
        costPrice: 100.0,
        actualPrice: 150.0, // Invalid: original price is less than selling price
        currentStock: 10,
      });

    assert.equal(invalidRes.status, 400);
    assert.match(invalidRes.body.error, /Actual price.*must be greater than or equal to/i);

    // 3. Verify decoration on the marketplace/fetch endpoint
    const getRes = await request(app)
      .get(`/api/products/${createRes.body.product.id}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    assert.equal(getRes.status, 200);
    // Stored actualPrice should be used as originalPrice
    assert.equal(getRes.body.originalPrice, 250);
    assert.equal(getRes.body.price, 180);
    // Discount percentage should be round(((250 - 180) / 250) * 100) = 28%
    assert.equal(getRes.body.discountPercent, 28);
  } finally {
    await cleanupPricingFixture(fixture);
  }
});
