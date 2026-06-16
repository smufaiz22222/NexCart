import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import Razorpay from 'razorpay';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';

const toNumber = (value) => Number(value || 0);

const makeToken = (userId) =>
  jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET
  );

const createTag = (label) =>
  `returns-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getRazorpayApiPrototype = () =>
  Object.getPrototypeOf(new Razorpay({ key_id: 'x', key_secret: 'y' }).api);

const withMockedRazorpayPost = async (mockHandler, run) => {
  const apiPrototype = getRazorpayApiPrototype();
  const originalPost = apiPrototype.post;

  apiPrototype.post = function mockedPost(params, callback) {
    return mockHandler.call(this, params, callback, originalPost.bind(this));
  };

  try {
    return await run();
  } finally {
    apiPrototype.post = originalPost;
  }
};

const cleanupFixture = async (fixture) => {
  if (!fixture) return;

  const userIds = [fixture.buyerId, fixture.sellerUserId].filter(Boolean);
  const orderIds = fixture.orderIds || [];
  const productIds = fixture.productIds || [];

  if (orderIds.length) {
    await prisma.orderAdjustment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderIssue.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  if (fixture.wholesalerId) {
    await prisma.inventoryLog.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  }

  if (userIds.length) {
    await prisma.shippingAddress.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
};

const createOrderFixture = async ({
  tag,
  paymentMethod,
  orderStatus = 'DELIVERED',
  paymentStatus,
  quantity = 1,
  unitPrice = 300,
  currentStockAfterSale = 4,
}) => {
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
      name: `Return Product ${tag}`,
      price: unitPrice,
      costPrice: Math.max(0, unitPrice - 120),
      category: 'General',
      sizes: [],
      currentStock: currentStockAfterSale,
      minStock: 1,
    },
  });

  const totalAmount = unitPrice * quantity;

  const order = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      sellerId: wholesaler.id,
      status: orderStatus,
      paymentMethod,
      paymentStatus:
        paymentStatus ||
        (paymentMethod === 'PREPAID' ? 'PAID' : orderStatus === 'DELIVERED' ? 'PAID' : 'PENDING'),
      paymentCaptureStatus: paymentMethod === 'PREPAID' ? 'CAPTURED' : 'NOT_APPLICABLE',
      paymentProvider: paymentMethod === 'PREPAID' ? 'razorpay' : null,
      paymentReference: paymentMethod === 'PREPAID' ? `rzp_order_${tag}:pay_${tag}` : null,
      razorpayOrderId: paymentMethod === 'PREPAID' ? `rzp_order_${tag}` : null,
      razorpayPaymentId: paymentMethod === 'PREPAID' ? `pay_${tag}` : null,
      totalAmount,
      shippingAddress: `Buyer ${tag}, 9876543210, 221 Market Road`,
      items: {
        create: [
          {
            productId: product.id,
            quantity,
            price: unitPrice,
            unitPriceAtPurchase: unitPrice,
            subtotalAtPurchase: totalAmount,
            status: 'ACTIVE',
            returnEligibleUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
    include: {
      items: true,
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      wholesalerId: wholesaler.id,
      orderId: order.id,
      amount: totalAmount,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      wholesalerId: wholesaler.id,
      userId: buyer.id,
      orderId: order.id,
      amount: -totalAmount,
      description: `Marketplace Order ${order.id}`,
      referenceId: invoice.id,
      source: 'ORDER_CHARGE',
    },
  });

  if (paymentMethod === 'PREPAID') {
    await prisma.ledgerEntry.create({
      data: {
        wholesalerId: wholesaler.id,
        userId: buyer.id,
        orderId: order.id,
        amount: totalAmount,
        description: `Marketplace Prepaid Payment ${order.id}`,
        referenceId: invoice.id,
        source: 'ORDER_PREPAID_PAYMENT',
      },
    });
  }

  await prisma.inventoryLog.create({
    data: {
      wholesalerId: wholesaler.id,
      productId: product.id,
      changeAmount: -quantity,
      reason: 'SALE',
    },
  });

  return {
    buyerId: buyer.id,
    sellerUserId: sellerUser.id,
    wholesalerId: wholesaler.id,
    productIds: [product.id],
    productId: product.id,
    orderIds: [order.id],
    orderId: order.id,
    orderItemId: order.items[0].id,
    invoiceId: invoice.id,
  };
};

test('COD delivery auto-settles once and return receipt reverses stock and ledger once', async () => {
  const tag = createTag('cod');
  const fixture = await createOrderFixture({
    tag,
    paymentMethod: 'COD',
    orderStatus: 'PROCESSING',
    paymentStatus: 'PENDING',
    quantity: 1,
    unitPrice: 250,
    currentStockAfterSale: 4,
  });

  try {
    const buyerToken = makeToken(fixture.buyerId);
    const sellerToken = makeToken(fixture.sellerUserId);

    const deliveredResponse = await request(app)
      .put(`/api/orders/${fixture.orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'DELIVERED' });

    assert.equal(deliveredResponse.status, 200);
    assert.equal(deliveredResponse.body.order.paymentStatus, 'PAID');

    const afterDeliveryLedger = await prisma.ledgerEntry.findMany({
      where: { orderId: fixture.orderId },
      orderBy: { createdAt: 'asc' },
    });
    assert.equal(
      afterDeliveryLedger.filter((entry) => entry.source === 'ORDER_AUTO_PAYMENT').length,
      1
    );
    assert.equal(
      toNumber(afterDeliveryLedger.find((entry) => entry.source === 'ORDER_AUTO_PAYMENT')?.amount),
      250
    );

    const requestReturnResponse = await request(app)
      .post(`/api/orders/${fixture.orderId}/items/${fixture.orderItemId}/request-return`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        reason: 'DAMAGED',
        quantity: 1,
        notes: 'Seal was broken on arrival',
      });
    assert.equal(requestReturnResponse.status, 200);
    assert.equal(requestReturnResponse.body.item.returnStatus, 'REQUESTED');

    const approveResponse = await request(app)
      .post(`/api/orders/${fixture.orderId}/items/${fixture.orderItemId}/approve-return`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send();
    assert.equal(approveResponse.status, 200);
    assert.equal(approveResponse.body.item.returnStatus, 'APPROVED');

    const firstReceiveResponse = await request(app)
      .post(`/api/orders/${fixture.orderId}/items/${fixture.orderItemId}/receive-return`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send();
    assert.equal(firstReceiveResponse.status, 200);
    assert.equal(firstReceiveResponse.body.item.returnStatus, 'RETURN_COMPLETED');

    const secondReceiveResponse = await request(app)
      .post(`/api/orders/${fixture.orderId}/items/${fixture.orderItemId}/receive-return`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send();
    assert.equal(secondReceiveResponse.status, 200);

    const product = await prisma.product.findUnique({ where: { id: fixture.productId } });
    assert.equal(product.currentStock, 5);

    const inventoryLogs = await prisma.inventoryLog.findMany({
      where: { wholesalerId: fixture.wholesalerId },
      orderBy: { createdAt: 'asc' },
    });
    assert.equal(inventoryLogs.filter((entry) => entry.reason === 'CUSTOMER_RETURN').length, 1);

    const adjustments = await prisma.orderAdjustment.findMany({
      where: { orderId: fixture.orderId },
    });
    assert.equal(adjustments.length, 1);
    assert.equal(toNumber(adjustments[0].amount), 250);

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { orderId: fixture.orderId },
      orderBy: { createdAt: 'asc' },
    });
    assert.equal(ledgerEntries.filter((entry) => entry.source === 'CUSTOMER_RETURN').length, 1);
    assert.equal(ledgerEntries.filter((entry) => entry.source === 'RETURN_ADJUSTMENT').length, 1);
    assert.equal(
      toNumber(ledgerEntries.find((entry) => entry.source === 'CUSTOMER_RETURN')?.amount),
      250
    );
    assert.equal(
      toNumber(ledgerEntries.find((entry) => entry.source === 'RETURN_ADJUSTMENT')?.amount),
      -250
    );

    const order = await prisma.order.findUnique({
      where: { id: fixture.orderId },
      include: { items: true },
    });
    assert.equal(order.status, 'RETURN_COMPLETED');
    assert.equal(order.paymentStatus, 'PAID');
    assert.equal(order.items[0].inventoryRestored, true);
    assert.equal(order.items[0].returnStatus, 'RETURN_COMPLETED');
  } finally {
    await cleanupFixture(fixture);
  }
});

test('prepaid return refund retry does not duplicate inventory or accounting side effects', async () => {
  const tag = createTag('prepaid');
  const fixture = await createOrderFixture({
    tag,
    paymentMethod: 'PREPAID',
    orderStatus: 'DELIVERED',
    paymentStatus: 'PAID',
    quantity: 1,
    unitPrice: 300,
    currentStockAfterSale: 4,
  });

  try {
    const buyerToken = makeToken(fixture.buyerId);
    const sellerToken = makeToken(fixture.sellerUserId);

    const requestReturnResponse = await request(app)
      .post(`/api/orders/${fixture.orderId}/items/${fixture.orderItemId}/request-return`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        reason: 'DEFECTIVE',
        quantity: 1,
        notes: 'Stopped working on day one',
      });
    assert.equal(requestReturnResponse.status, 200);

    const approveResponse = await request(app)
      .post(`/api/orders/${fixture.orderId}/items/${fixture.orderItemId}/approve-return`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send();
    assert.equal(approveResponse.status, 200);
    assert.equal(approveResponse.body.item.returnRefundStatus, 'PENDING');

    await withMockedRazorpayPost(
      async ({ url }) => {
        if (url === `/payments/pay_${tag}/refund`) {
          const error = new Error('Gateway unavailable');
          error.statusCode = 500;
          throw error;
        }

        throw new Error(`Unexpected Razorpay POST: ${url}`);
      },
      async () => {
        const receiveResponse = await request(app)
          .post(`/api/orders/${fixture.orderId}/items/${fixture.orderItemId}/receive-return`)
          .set('Authorization', `Bearer ${sellerToken}`)
          .send();

        assert.equal(receiveResponse.status, 200);
      }
    );

    const countsBeforeRetry = {
      inventory: await prisma.inventoryLog.count({ where: { wholesalerId: fixture.wholesalerId } }),
      ledger: await prisma.ledgerEntry.count({ where: { orderId: fixture.orderId } }),
      adjustments: await prisma.orderAdjustment.count({ where: { orderId: fixture.orderId } }),
      stock: (await prisma.product.findUnique({ where: { id: fixture.productId } })).currentStock,
    };

    const itemAfterFailure = await prisma.orderItem.findUnique({
      where: { id: fixture.orderItemId },
    });
    assert.equal(itemAfterFailure.returnStatus, 'RECEIVED');
    assert.equal(itemAfterFailure.returnRefundStatus, 'PENDING');

    await withMockedRazorpayPost(
      async ({ url, data }) => {
        if (url === `/payments/pay_${tag}/refund`) {
          return {
            id: `rfnd_${tag}`,
            amount: data.amount,
            status: 'processed',
            created_at: 1718500000,
            processed_at: 1718500100,
          };
        }

        throw new Error(`Unexpected Razorpay POST: ${url}`);
      },
      async () => {
        const retryResponse = await request(app)
          .post(`/api/orders/${fixture.orderId}/items/${fixture.orderItemId}/retry-return-refund`)
          .set('Authorization', `Bearer ${sellerToken}`)
          .send();

        assert.equal(retryResponse.status, 200);
        assert.equal(retryResponse.body.item.returnStatus, 'RETURN_COMPLETED');
        assert.equal(retryResponse.body.item.returnRefundStatus, 'SUCCESS');
      }
    );

    const countsAfterRetry = {
      inventory: await prisma.inventoryLog.count({ where: { wholesalerId: fixture.wholesalerId } }),
      ledger: await prisma.ledgerEntry.count({ where: { orderId: fixture.orderId } }),
      adjustments: await prisma.orderAdjustment.count({ where: { orderId: fixture.orderId } }),
      stock: (await prisma.product.findUnique({ where: { id: fixture.productId } })).currentStock,
    };

    assert.deepEqual(countsAfterRetry, countsBeforeRetry);

    const order = await prisma.order.findUnique({
      where: { id: fixture.orderId },
      include: { items: true },
    });
    assert.equal(order.status, 'RETURN_COMPLETED');
    assert.equal(order.paymentStatus, 'REFUNDED');
    assert.equal(order.items[0].gatewayRefundId, `rfnd_${tag}`);

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { orderId: fixture.orderId },
      orderBy: { createdAt: 'asc' },
    });
    assert.equal(ledgerEntries.filter((entry) => entry.source === 'CUSTOMER_RETURN').length, 1);
    assert.equal(ledgerEntries.filter((entry) => entry.source === 'RETURN_REFUND').length, 1);
  } finally {
    await cleanupFixture(fixture);
  }
});
