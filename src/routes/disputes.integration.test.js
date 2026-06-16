import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const makeToken = (userId) =>
  jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET
  );

const createTag = (label) =>
  `dispute-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cleanupFixture = async (fixture) => {
  if (!fixture) return;

  const orderIds = fixture.orderIds || [];
  const userIds = [fixture.buyerId, fixture.sellerUserId].filter(Boolean);

  if (orderIds.length) {
    const disputeIds = (
      await prisma.dispute.findMany({
        where: { orderId: { in: orderIds } },
        select: { id: true },
      })
    ).map((entry) => entry.id);

    if (disputeIds.length) {
      await prisma.disputeEvent.deleteMany({ where: { disputeId: { in: disputeIds } } });
      await prisma.disputeInternalNote.deleteMany({ where: { disputeId: { in: disputeIds } } });
      await prisma.disputeEvidence.deleteMany({ where: { disputeId: { in: disputeIds } } });
      await prisma.disputeResolution.deleteMany({ where: { disputeId: { in: disputeIds } } });
      await prisma.dispute.deleteMany({ where: { id: { in: disputeIds } } });
    }

    await prisma.orderIssue.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  if (fixture.wholesalerId) {
    await prisma.inventoryLog.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
    await prisma.product.deleteMany({ where: { id: { in: fixture.productIds || [] } } });
    await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  }

  if (userIds.length) {
    await prisma.shippingAddress.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
};

const createDeliveredOrderFixture = async (tag) => {
  const buyer = await prisma.user.create({
    data: {
      email: `${tag}-buyer@example.com`,
      password: 'password',
      name: `Buyer ${tag}`,
      role: 'CUSTOMER',
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `${tag}-seller@example.com`,
      password: 'password',
      name: `Seller ${tag}`,
      role: 'WHOLESALER',
    },
  });

  const wholesaler = await prisma.wholesaler.create({
    data: {
      userId: sellerUser.id,
      businessName: `Wholesale ${tag}`,
    },
  });

  const product = await prisma.product.create({
    data: {
      wholesalerId: wholesaler.id,
      name: `Dispute Product ${tag}`,
      price: 250,
      costPrice: 120,
      category: 'General',
      sizes: [],
      currentStock: 4,
      minStock: 1,
    },
  });

  const order = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      sellerId: wholesaler.id,
      status: 'DELIVERED',
      paymentMethod: 'COD',
      paymentStatus: 'PAID',
      totalAmount: 250,
      shippingAddress: `Buyer ${tag}, 9876543210, 221 Market Road`,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 1,
            price: 250,
            unitPriceAtPurchase: 250,
            subtotalAtPurchase: 250,
            status: 'ACTIVE',
            returnEligibleUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
    include: { items: true },
  });

  const invoice = await prisma.invoice.create({
    data: {
      wholesalerId: wholesaler.id,
      orderId: order.id,
      amount: 250,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      wholesalerId: wholesaler.id,
      userId: buyer.id,
      orderId: order.id,
      amount: -250,
      description: `Marketplace Order ${order.id}`,
      referenceId: invoice.id,
      source: 'ORDER_CHARGE',
    },
  });

  return {
    buyerId: buyer.id,
    sellerUserId: sellerUser.id,
    wholesalerId: wholesaler.id,
    productIds: [product.id],
    orderIds: [order.id],
    orderId: order.id,
    itemId: order.items[0].id,
  };
};

test('dispute endpoints support review, notes, resolution, and customer-safe serialization', async () => {
  const tag = createTag('flow');
  const fixture = await createDeliveredOrderFixture(tag);

  try {
    const buyerToken = makeToken(fixture.buyerId);
    const sellerToken = makeToken(fixture.sellerUserId);

    const createResponse = await request(app)
      .post(`/api/orders/${fixture.orderId}/items/${fixture.itemId}/disputes`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        reason: 'DAMAGED_ITEM',
        description: 'Outer packaging was crushed and the item body is cracked.',
        evidenceUrls: ['https://cdn.test/disputes/photo-1.jpg'],
      });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.dispute.status, 'OPEN');
    assert.equal(createResponse.body.dispute.timeline.length, 1);

    const reviewResponse = await request(app)
      .patch(
        `/api/orders/${fixture.orderId}/items/${fixture.itemId}/disputes/${createResponse.body.dispute.id}/status`
      )
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'UNDER_REVIEW',
        updatedAt: createResponse.body.dispute.updatedAt,
      });

    assert.equal(reviewResponse.status, 200);
    assert.equal(reviewResponse.body.dispute.status, 'UNDER_REVIEW');

    const noteResponse = await request(app)
      .post(
        `/api/orders/${fixture.orderId}/items/${fixture.itemId}/disputes/${createResponse.body.dispute.id}/internal-notes`
      )
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        note: 'Warehouse photos confirm impact damage before packing.',
        updatedAt: reviewResponse.body.dispute.updatedAt,
      });

    assert.equal(noteResponse.status, 201);
    assert.equal(noteResponse.body.dispute.internalNotes.length, 1);

    const resolveResponse = await request(app)
      .patch(
        `/api/orders/${fixture.orderId}/items/${fixture.itemId}/disputes/${createResponse.body.dispute.id}/resolve`
      )
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        resolutionType: 'REJECT',
        resolutionNotes: 'Damage does not match pre-shipment photos.',
        updatedAt: noteResponse.body.dispute.updatedAt,
      });

    assert.equal(resolveResponse.status, 200);
    assert.equal(resolveResponse.body.dispute.status, 'RESOLVED');
    assert.equal(resolveResponse.body.latestResolution.resolutionType, 'REJECT');

    const buyerOrdersResponse = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${buyerToken}`);
    assert.equal(buyerOrdersResponse.status, 200);
    assert.equal(buyerOrdersResponse.body.orders[0].disputes[0].internalNotes.length, 0);

    const sellerOrdersResponse = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert.equal(sellerOrdersResponse.status, 200);
    assert.equal(sellerOrdersResponse.body.orders[0].disputes[0].internalNotes.length, 1);
    assert.deepEqual(
      sellerOrdersResponse.body.orders[0].disputes[0].timeline.map((entry) => entry.type),
      ['OPENED', 'UNDER_REVIEW', 'NOTE_ADDED', 'RESOLUTION_CREATED', 'REJECTED']
    );
  } finally {
    await cleanupFixture(fixture);
  }
});
