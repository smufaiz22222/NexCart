import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const makeToken = (userId, role, wholesalerId = null) =>
  jwt.sign(
    {
      userId,
      role,
      wholesalerId,
    },
    process.env.JWT_SECRET
  );

const createTag = (label) =>
  `ledgertest-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cleanupLedgerFixture = async (fixture) => {
  if (!fixture) return;
  await prisma.ledgerEntry.deleteMany({ where: { id: { in: fixture.ledgerEntryIds || [] } } });
  await prisma.wholesalerCreditLimit.deleteMany({
    where: { id: { in: fixture.creditLimitIds || [] } },
  });
  await prisma.order.deleteMany({ where: { id: { in: fixture.orderIds || [] } } });
  await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          fixture.wholesalerUserId,
          fixture.buyerId,
          fixture.otherBuyerId,
          fixture.creditBuyerId,
          fixture.ledgerBuyerId,
        ].filter(Boolean),
      },
    },
  });
};

test('POST /api/ledger/payment rejects payment for unrelated buyers and allows linked buyer relationships', async () => {
  const tag = createTag('relation');

  const buyer = await prisma.user.create({
    data: {
      email: `${tag}-buyer@example.com`,
      password: 'password',
      name: `${tag} Buyer`,
      role: 'CUSTOMER',
    },
  });

  const otherBuyer = await prisma.user.create({
    data: {
      email: `${tag}-other-buyer@example.com`,
      password: 'password',
      name: `${tag} Other Buyer`,
      role: 'CUSTOMER',
    },
  });

  const creditBuyer = await prisma.user.create({
    data: {
      email: `${tag}-credit-buyer@example.com`,
      password: 'password',
      name: `${tag} Credit Buyer`,
      role: 'CUSTOMER',
    },
  });

  const ledgerBuyer = await prisma.user.create({
    data: {
      email: `${tag}-ledger-buyer@example.com`,
      password: 'password',
      name: `${tag} Ledger Buyer`,
      role: 'CUSTOMER',
    },
  });

  const wholesalerUser = await prisma.user.create({
    data: {
      email: `${tag}-wholesaler@example.com`,
      password: 'password',
      name: `${tag} Wholesaler`,
      role: 'WHOLESALER',
    },
  });

  const wholesaler = await prisma.wholesaler.create({
    data: {
      userId: wholesalerUser.id,
      businessName: `${tag} Wholesale`,
    },
  });

  const order = await prisma.order.create({
    data: {
      sellerId: wholesaler.id,
      buyerId: buyer.id,
      totalAmount: 100.0,
      deliveryFee: 0.0,
      status: 'PENDING',
    },
  });

  const existingLedgerEntry = await prisma.ledgerEntry.create({
    data: {
      wholesalerId: wholesaler.id,
      userId: ledgerBuyer.id,
      amount: 50.0,
      description: 'Initial ledger relationship',
    },
  });

  const creditLimit = await prisma.wholesalerCreditLimit.create({
    data: {
      wholesalerId: wholesaler.id,
      buyerId: creditBuyer.id,
      creditLimit: 50000.0,
      balance: 0.0,
    },
  });

  const fixture = {
    wholesalerId: wholesaler.id,
    wholesalerUserId: wholesalerUser.id,
    buyerId: buyer.id,
    otherBuyerId: otherBuyer.id,
    creditBuyerId: creditBuyer.id,
    ledgerBuyerId: ledgerBuyer.id,
    orderIds: [order.id],
    ledgerEntryIds: [existingLedgerEntry.id],
    creditLimitIds: [creditLimit.id],
  };

  try {
    const sellerToken = makeToken(wholesalerUser.id, 'WHOLESALER', wholesaler.id);

    const unrelatedResponse = await request(app)
      .post('/api/ledger/payment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        userId: otherBuyer.id,
        amount: 100,
        description: 'Unauthorized payment attempt',
      });

    assert.equal(unrelatedResponse.status, 403);
    assert.match(
      unrelatedResponse.body.error,
      /cannot be recorded for a user without an existing buyer relationship/i
    );

    const allowedResponse = await request(app)
      .post('/api/ledger/payment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        userId: buyer.id,
        amount: 100,
        description: 'Authorized payment',
      });

    assert.equal(allowedResponse.status, 201);
    assert.equal(allowedResponse.body.entry.wholesalerId, wholesaler.id);
    assert.equal(allowedResponse.body.entry.userId, buyer.id);
    fixture.ledgerEntryIds.push(allowedResponse.body.entry.id);

    const creditLimitResponse = await request(app)
      .post('/api/ledger/payment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        userId: creditBuyer.id,
        amount: 75,
        description: 'Credit-limit allowed payment',
      });

    assert.equal(creditLimitResponse.status, 201);
    assert.equal(creditLimitResponse.body.entry.wholesalerId, wholesaler.id);
    assert.equal(creditLimitResponse.body.entry.userId, creditBuyer.id);
    fixture.ledgerEntryIds.push(creditLimitResponse.body.entry.id);

    const ledgerRelationshipResponse = await request(app)
      .post('/api/ledger/payment')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        userId: ledgerBuyer.id,
        amount: 30,
        description: 'Ledger-entry relationship allowed payment',
      });

    assert.equal(ledgerRelationshipResponse.status, 201);
    assert.equal(ledgerRelationshipResponse.body.entry.wholesalerId, wholesaler.id);
    assert.equal(ledgerRelationshipResponse.body.entry.userId, ledgerBuyer.id);
    fixture.ledgerEntryIds.push(ledgerRelationshipResponse.body.entry.id);
  } finally {
    await cleanupLedgerFixture(fixture);
  }
});
