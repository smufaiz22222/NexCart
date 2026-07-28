import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const makeToken = (userId, role) =>
  jwt.sign(
    {
      userId,
      role,
    },
    process.env.JWT_SECRET
  );

const cleanupProductReviewFixture = async (fixture) => {
  if (!fixture) return;

  await prisma.review.deleteMany({ where: { id: { in: fixture.reviewIds || [] } } });
  await prisma.product.deleteMany({ where: { id: fixture.productId } });
  await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [fixture.wholesalerUserId, fixture.customerUserId].filter(Boolean),
      },
    },
  });
};

test('POST /api/products/:id/reviews prevents duplicate reviews by the same user', async () => {
  const wholesalerUser = await prisma.user.create({
    data: {
      email: `reviewtest-seller-${Date.now()}@example.com`,
      password: 'password',
      name: 'Review Test Seller',
      role: 'WHOLESALER',
    },
  });

  const wholesaler = await prisma.wholesaler.create({
    data: {
      userId: wholesalerUser.id,
      businessName: 'Review Test Wholesale',
    },
  });

  const product = await prisma.product.create({
    data: {
      wholesalerId: wholesaler.id,
      name: 'Duplicate Review Test Product',
      price: 10.0,
      costPrice: 5.0,
      currentStock: 10,
      minStock: 1,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: `reviewtest-buyer-${Date.now()}@example.com`,
      password: 'password',
      name: 'Review Test Buyer',
      role: 'CUSTOMER',
    },
  });

  const fixture = {
    wholesalerUserId: wholesalerUser.id,
    wholesalerId: wholesaler.id,
    productId: product.id,
    customerUserId: customerUser.id,
    reviewIds: [],
  };

  try {
    const customerToken = makeToken(customerUser.id, 'CUSTOMER');

    const firstResponse = await request(app)
      .post(`/api/products/${product.id}/reviews`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 5, comment: 'First review' });

    assert.equal(firstResponse.status, 201);
    assert.equal(firstResponse.body.message, 'Review added successfully!');
    assert.equal(firstResponse.body.review.productId, product.id);
    assert.equal(firstResponse.body.review.userId, customerUser.id);
    fixture.reviewIds.push(firstResponse.body.review.id);

    const secondResponse = await request(app)
      .post(`/api/products/${product.id}/reviews`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4, comment: 'Duplicate review attempt' });

    assert.equal(secondResponse.status, 409);
    assert.match(secondResponse.body.error, /already submitted a review for this product/i);
  } finally {
    await cleanupProductReviewFixture(fixture);
  }
});
