import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import Razorpay from 'razorpay';
import { app } from '../app.js';
import { prisma } from '../config/db.js';
import {
  cancelOrderItemForCustomer,
  retryOrderItemRefundForCustomer,
} from '../services/orderCancellationService.js';
import { handleRazorpayWebhook } from '../services/razorpayWebhookService.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_secret';

const toNumber = (value) => Number(value);

const makeToken = (userId) =>
  jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET
  );

const signPayment = ({ razorpayOrderId, razorpayPaymentId }) =>
  crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

const signWebhook = (payload) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');

const createTag = (label) =>
  `itest-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  const productIds = fixture.productIds || [];
  const orderIds = fixture.orderIds || [];
  const cartIds = fixture.cartId ? [fixture.cartId] : [];

  if (userIds.length) {
    await prisma.recommendationEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.recommendationInteraction.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.recommendationLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.prepaidCheckoutSession.deleteMany({ where: { buyerId: fixture.buyerId } });
    await prisma.orderIssue.deleteMany({ where: { requesterId: { in: userIds } } });
    await prisma.shippingAddress.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
    await prisma.cart.deleteMany({ where: { userId: fixture.buyerId } });
  }

  if (orderIds.length) {
    await prisma.orderIssue.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  if (fixture.wholesalerId) {
    await prisma.wholesalerSubscription.deleteMany({
      where: { wholesalerId: fixture.wholesalerId },
    });
    await prisma.inventoryLog.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
    await prisma.ledgerEntry.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  }

  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
};

const createCheckoutFixture = async (tag) => {
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

  const plan =
    (await prisma.subscriptionPlan.findFirst({
      where: { code: 'PREMIUM' },
    })) ||
    (await prisma.subscriptionPlan.create({
      data: {
        code: 'PREMIUM',
        name: 'Premium',
        price: 2999,
        features: {
          analytics: true,
          recommendations: true,
          advisor: true,
          khatta: true,
        },
      },
    }));

  await prisma.wholesalerSubscription.create({
    data: {
      wholesalerId: wholesaler.id,
      planId: plan.id,
      status: 'ACTIVE',
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      purchaseMethod: 'TRIAL',
    },
  });

  const [productA, productB] = await Promise.all([
    prisma.product.create({
      data: {
        wholesalerId: wholesaler.id,
        name: `Alpha ${tag}`,
        price: 150,
        costPrice: 90,
        category: 'Apparel',
        sizes: [],
        currentStock: 10,
        minStock: 1,
      },
    }),
    prisma.product.create({
      data: {
        wholesalerId: wholesaler.id,
        name: `Bravo ${tag}`,
        price: 450,
        costPrice: 250,
        category: 'Apparel',
        sizes: [],
        currentStock: 6,
        minStock: 1,
      },
    }),
  ]);

  const address = await prisma.shippingAddress.create({
    data: {
      userId: buyer.id,
      fullName: `Buyer ${tag}`,
      phone: '9876543210',
      addressLine1: '221 Market Road',
      addressLine2: 'Floor 2',
      landmark: 'Near Lake',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      country: 'India',
      isDefault: true,
    },
  });

  const cart = await prisma.cart.create({
    data: {
      userId: buyer.id,
    },
  });

  await prisma.cartItem.createMany({
    data: [
      {
        cartId: cart.id,
        productId: productA.id,
        quantity: 2,
        recommendationId: `${tag}-rec-a`,
        recommendationSource: 'test-suite',
      },
      {
        cartId: cart.id,
        productId: productB.id,
        quantity: 2,
        recommendationId: `${tag}-rec-b`,
        recommendationSource: 'test-suite',
      },
    ],
  });

  return {
    buyerId: buyer.id,
    sellerUserId: sellerUser.id,
    wholesalerId: wholesaler.id,
    productIds: [productA.id, productB.id],
    productAId: productA.id,
    productBId: productB.id,
    addressId: address.id,
    cartId: cart.id,
    orderIds: [],
  };
};

const createPrepaidOrderFixture = async (
  tag,
  { items, orderStatus = 'PENDING', paymentStatus = 'PAID' } = {}
) => {
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

  const createdProducts = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await prisma.product.create({
      data: {
        wholesalerId: wholesaler.id,
        name: item.name,
        price: item.unitPrice,
        costPrice: item.costPrice ?? Math.max(0, item.unitPrice - 50),
        category: item.category || 'General',
        sizes: [],
        currentStock: item.currentStockAfterSale,
        minStock: 1,
      },
    });
    createdProducts.push(product);
    totalAmount += item.unitPrice * item.quantity;
  }

  const order = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      sellerId: wholesaler.id,
      status: orderStatus,
      paymentMethod: 'PREPAID',
      paymentStatus,
      paymentCaptureStatus: 'CAPTURED',
      paymentProvider: 'razorpay',
      paymentReference: `rzp_order_${tag}:pay_${tag}`,
      razorpayOrderId: `rzp_order_${tag}`,
      razorpayPaymentId: `pay_${tag}`,
      totalAmount,
      shippingAddress: `Buyer ${tag}, 9876543210, 221 Market Road`,
      items: {
        create: items.map((item, index) => ({
          productId: createdProducts[index].id,
          quantity: item.quantity,
          price: item.unitPrice,
          unitPriceAtPurchase: item.unitPrice,
          subtotalAtPurchase: item.unitPrice * item.quantity,
          recommendationId: item.recommendationId || null,
          status: item.status || 'ACTIVE',
          refundStatus:
            item.refundStatus || (item.status === 'CANCELLED' ? 'PROCESSING' : 'NOT_APPLICABLE'),
          refundReference: item.refundReference || null,
          refundFailureReason: item.refundFailureReason || null,
          refundRequestedAt: item.refundRequestedAt || null,
          cancelledAt: item.cancelledAt || null,
          cancelledByRole: item.cancelledByRole || null,
          cancellationReason: item.cancellationReason || null,
        })),
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
      amount: order.totalAmount,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      wholesalerId: wholesaler.id,
      userId: buyer.id,
      amount: -totalAmount,
      description: `Marketplace Order ${order.id}`,
      referenceId: invoice.id,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      wholesalerId: wholesaler.id,
      userId: buyer.id,
      amount: totalAmount,
      description: `Marketplace Prepaid Payment ${order.id}`,
      referenceId: invoice.id,
    },
  });

  await prisma.inventoryLog.createMany({
    data: items.map((item, index) => ({
      wholesalerId: wholesaler.id,
      productId: createdProducts[index].id,
      changeAmount: -item.quantity,
      reason: 'SALE',
    })),
  });

  return {
    buyerId: buyer.id,
    sellerUserId: sellerUser.id,
    wholesalerId: wholesaler.id,
    productIds: createdProducts.map((product) => product.id),
    orderIds: [order.id],
    orderId: order.id,
    itemIds: order.items.map((item) => item.id),
    invoiceId: invoice.id,
  };
};

test('prepaid checkout to item cancellation updates database, seller stats, and recommendation analytics', async () => {
  const tag = createTag('e2e');
  const fixture = await createCheckoutFixture(tag);

  await withMockedRazorpayPost(
    async ({ url, data }) => {
      if (url === '/orders') {
        return {
          id: `rzp_order_${tag}`,
          amount: data.amount,
          currency: data.currency,
        };
      }

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
      try {
        const buyerToken = makeToken(fixture.buyerId);
        const sellerToken = makeToken(fixture.sellerUserId);

        const createResponse = await request(app)
          .post('/api/orders/prepaid/create')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            addressId: fixture.addressId,
            paymentMethod: 'PREPAID',
          });

        assert.equal(createResponse.status, 201);
        assert.equal(createResponse.body.razorpayOrderId, `rzp_order_${tag}`);

        const verifyResponse = await request(app)
          .post('/api/orders/prepaid/verify')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            razorpayOrderId: createResponse.body.razorpayOrderId,
            razorpayPaymentId: `pay_${tag}`,
            razorpaySignature: signPayment({
              razorpayOrderId: createResponse.body.razorpayOrderId,
              razorpayPaymentId: `pay_${tag}`,
            }),
          });

        assert.equal(verifyResponse.status, 201);
        assert.equal(verifyResponse.body.orders.length, 1);

        const createdOrder = verifyResponse.body.orders[0];
        fixture.orderIds = [createdOrder.id];

        const itemToCancel = createdOrder.items.find(
          (item) => item.productId === fixture.productAId
        );
        assert.ok(itemToCancel);

        const beforeStatsResponse = await request(app)
          .get('/api/stats/advanced-summary?timeframe=monthly')
          .set('Authorization', `Bearer ${sellerToken}`);
        assert.equal(beforeStatsResponse.status, 200);
        const beforeRevenue = beforeStatsResponse.body.chartData.reduce(
          (sum, entry) => sum + Number(entry.revenue || 0),
          0
        );
        assert.equal(beforeRevenue, 1200);

        const beforeRecommendationResponse = await request(app)
          .get('/api/recommendations/analytics')
          .set('Authorization', `Bearer ${sellerToken}`);
        assert.equal(beforeRecommendationResponse.status, 200);
        assert.equal(beforeRecommendationResponse.body.eventCounts.purchase, 4);

        const cancelResponse = await request(app)
          .post(`/api/orders/${createdOrder.id}/items/${itemToCancel.id}/cancel`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({ reason: 'Need only one product from this order' });

        assert.equal(cancelResponse.status, 200);
        assert.equal(cancelResponse.body.item.status, 'CANCELLED');
        assert.equal(cancelResponse.body.item.refundStatus, 'REFUNDED');
        assert.equal(Number(cancelResponse.body.order.totalAmount), 900);
        assert.equal(cancelResponse.body.refundReference, `rfnd_${tag}`);

        const orderInDb = await prisma.order.findUnique({
          where: { id: createdOrder.id },
          include: {
            items: true,
            invoice: true,
          },
        });

        const cancelledItem = orderInDb.items.find((item) => item.id === itemToCancel.id);
        const activeItem = orderInDb.items.find((item) => item.id !== itemToCancel.id);
        assert.equal(orderInDb.status, 'PENDING');
        assert.equal(toNumber(orderInDb.totalAmount), 900);
        assert.equal(orderInDb.paymentStatus, 'PAID');
        assert.equal(orderInDb.invoice && toNumber(orderInDb.invoice.amount), 900);

        assert.equal(cancelledItem.status, 'CANCELLED');
        assert.equal(cancelledItem.cancellationReason, 'Need only one product from this order');
        assert.equal(cancelledItem.cancelledByRole, 'CUSTOMER');
        assert.equal(cancelledItem.refundStatus, 'REFUNDED');
        assert.equal(cancelledItem.refundReference, `rfnd_${tag}`);
        assert.equal(toNumber(cancelledItem.refundedAmount), 300);
        assert.ok(cancelledItem.cancelledAt);
        assert.ok(cancelledItem.refundRequestedAt);
        assert.ok(cancelledItem.refundCompletedAt);

        assert.equal(activeItem.status, 'ACTIVE');

        const [productA, productB] = await Promise.all([
          prisma.product.findUnique({ where: { id: fixture.productAId } }),
          prisma.product.findUnique({ where: { id: fixture.productBId } }),
        ]);
        assert.equal(productA.currentStock, 10);
        assert.equal(productB.currentStock, 4);

        const inventoryLogs = await prisma.inventoryLog.findMany({
          where: { wholesalerId: fixture.wholesalerId },
          orderBy: { createdAt: 'asc' },
        });
        assert.equal(inventoryLogs.length, 3);
        assert.equal(
          inventoryLogs.filter(
            (entry) => entry.reason === 'CANCELLATION' && entry.productId === fixture.productAId
          ).length,
          1
        );

        const ledgerEntries = await prisma.ledgerEntry.findMany({
          where: { wholesalerId: fixture.wholesalerId },
          orderBy: { createdAt: 'asc' },
        });
        assert.equal(ledgerEntries.length, 3);
        assert.equal(
          ledgerEntries.filter((entry) =>
            entry.description.includes(
              `Marketplace Order Item Cancellation ${createdOrder.id}:${itemToCancel.id}`
            )
          ).length,
          1
        );
        assert.equal(
          toNumber(
            ledgerEntries.find((entry) =>
              entry.description.includes(
                `Marketplace Order Item Cancellation ${createdOrder.id}:${itemToCancel.id}`
              )
            ).amount
          ),
          300
        );

        const afterStatsResponse = await request(app)
          .get('/api/stats/advanced-summary?timeframe=monthly')
          .set('Authorization', `Bearer ${sellerToken}`);
        assert.equal(afterStatsResponse.status, 200);
        const afterRevenue = afterStatsResponse.body.chartData.reduce(
          (sum, entry) => sum + Number(entry.revenue || 0),
          0
        );
        assert.equal(afterRevenue, 900);
        assert.equal(afterStatsResponse.body.topProducts[0].sold, 2);

        const afterRecommendationResponse = await request(app)
          .get('/api/recommendations/analytics')
          .set('Authorization', `Bearer ${sellerToken}`);
        assert.equal(afterRecommendationResponse.status, 200);
        assert.equal(afterRecommendationResponse.body.eventCounts.purchase, 2);
      } finally {
        await cleanupFixture(fixture);
      }
    }
  );
});

test('concurrent cancellation requests restore stock and ledger exactly once', async () => {
  const tag = createTag('concurrency');
  const fixture = await createPrepaidOrderFixture(tag, {
    items: [
      {
        name: `Single ${tag}`,
        unitPrice: 300,
        quantity: 1,
        currentStockAfterSale: 4,
      },
    ],
  });

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
      try {
        const [first, second] = await Promise.all([
          cancelOrderItemForCustomer({
            buyerId: fixture.buyerId,
            orderId: fixture.orderId,
            itemId: fixture.itemIds[0],
            reason: 'Concurrent test one',
            client: prisma,
          }),
          cancelOrderItemForCustomer({
            buyerId: fixture.buyerId,
            orderId: fixture.orderId,
            itemId: fixture.itemIds[0],
            reason: 'Concurrent test two',
            client: prisma,
          }),
        ]);

        assert.equal([first.alreadyCancelled, second.alreadyCancelled].filter(Boolean).length, 1);

        const order = await prisma.order.findUnique({
          where: { id: fixture.orderId },
          include: { items: true },
        });
        const product = await prisma.product.findUnique({ where: { id: fixture.productIds[0] } });
        const cancellationLogs = await prisma.inventoryLog.findMany({
          where: { wholesalerId: fixture.wholesalerId, reason: 'CANCELLATION' },
        });
        const reversalEntries = await prisma.ledgerEntry.findMany({
          where: {
            wholesalerId: fixture.wholesalerId,
          },
        });

        assert.equal(order.status, 'CANCELLED');
        assert.equal(order.items[0].status, 'CANCELLED');
        assert.equal(order.items[0].refundStatus, 'REFUNDED');
        assert.equal(order.items[0].refundReference, `rfnd_${tag}`);
        assert.equal(product.currentStock, 5);
        assert.equal(cancellationLogs.length, 1);
        assert.equal(
          reversalEntries.filter((entry) =>
            entry.description.includes(
              `Marketplace Order Item Cancellation ${fixture.orderId}:${fixture.itemIds[0]}`
            )
          ).length,
          1
        );
      } finally {
        await cleanupFixture(fixture);
      }
    }
  );
});

test('retrying a failed refund only changes refund metadata', async () => {
  const tag = createTag('retry');
  const fixture = await createPrepaidOrderFixture(tag, {
    items: [
      {
        name: `Retry ${tag}`,
        unitPrice: 300,
        quantity: 1,
        currentStockAfterSale: 4,
      },
    ],
  });

  try {
    await withMockedRazorpayPost(
      async ({ url }) => {
        if (url === `/payments/pay_${tag}/refund`) {
          const error = new Error('Refund rejected');
          error.statusCode = 400;
          throw error;
        }

        throw new Error(`Unexpected Razorpay POST: ${url}`);
      },
      async () => {
        await cancelOrderItemForCustomer({
          buyerId: fixture.buyerId,
          orderId: fixture.orderId,
          itemId: fixture.itemIds[0],
          reason: 'Trigger retry path',
          client: prisma,
        });
      }
    );

    const countsBeforeRetry = {
      inventory: await prisma.inventoryLog.count({ where: { wholesalerId: fixture.wholesalerId } }),
      ledger: await prisma.ledgerEntry.count({ where: { wholesalerId: fixture.wholesalerId } }),
      stock: (await prisma.product.findUnique({ where: { id: fixture.productIds[0] } }))
        .currentStock,
    };

    const itemAfterFailure = await prisma.orderItem.findUnique({
      where: { id: fixture.itemIds[0] },
    });
    assert.equal(itemAfterFailure.refundStatus, 'FAILED');

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
        const result = await retryOrderItemRefundForCustomer({
          buyerId: fixture.buyerId,
          orderId: fixture.orderId,
          itemId: fixture.itemIds[0],
          client: prisma,
        });

        assert.equal(result.item.refundStatus, 'REFUNDED');
        assert.equal(result.item.refundReference, `rfnd_${tag}`);
      }
    );

    const countsAfterRetry = {
      inventory: await prisma.inventoryLog.count({ where: { wholesalerId: fixture.wholesalerId } }),
      ledger: await prisma.ledgerEntry.count({ where: { wholesalerId: fixture.wholesalerId } }),
      stock: (await prisma.product.findUnique({ where: { id: fixture.productIds[0] } }))
        .currentStock,
    };

    assert.deepEqual(countsAfterRetry, countsBeforeRetry);

    const itemAfterRetry = await prisma.orderItem.findUnique({
      where: { id: fixture.itemIds[0] },
    });
    assert.equal(itemAfterRetry.refundStatus, 'REFUNDED');
    assert.equal(itemAfterRetry.refundReference, `rfnd_${tag}`);
    assert.equal(toNumber(itemAfterRetry.refundedAmount), 300);
  } finally {
    await cleanupFixture(fixture);
  }
});

test('replayed refund.processed webhooks stay idempotent and avoid duplicate business side effects', async () => {
  const tag = createTag('webhook');
  const fixture = await createPrepaidOrderFixture(tag, {
    items: [
      {
        name: `Webhook ${tag}`,
        unitPrice: 300,
        quantity: 1,
        currentStockAfterSale: 6,
        status: 'CANCELLED',
        refundStatus: 'PROCESSING',
        cancelledAt: new Date(),
        cancelledByRole: 'CUSTOMER',
        cancellationReason: 'Awaiting webhook',
        refundRequestedAt: new Date(),
      },
    ],
    orderStatus: 'CANCELLED',
    paymentStatus: 'REFUND_PENDING',
  });

  try {
    await prisma.order.update({
      where: { id: fixture.orderId },
      data: { totalAmount: 0 },
    });
    await prisma.invoice.update({
      where: { orderId: fixture.orderId },
      data: { amount: 0 },
    });
    await prisma.ledgerEntry.create({
      data: {
        wholesalerId: fixture.wholesalerId,
        userId: fixture.buyerId,
        amount: 300,
        description: `Marketplace Order Item Cancellation ${fixture.orderId}:${fixture.itemIds[0]}`,
        referenceId: fixture.invoiceId,
      },
    });
    await prisma.inventoryLog.create({
      data: {
        wholesalerId: fixture.wholesalerId,
        productId: fixture.productIds[0],
        changeAmount: 1,
        reason: 'CANCELLATION',
      },
    });

    const inventoryBefore = await prisma.inventoryLog.count({
      where: { wholesalerId: fixture.wholesalerId },
    });
    const ledgerBefore = await prisma.ledgerEntry.count({
      where: { wholesalerId: fixture.wholesalerId },
    });

    const payload = JSON.stringify({
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: `rfnd_${tag}`,
            payment_id: `pay_${tag}`,
            amount: 30000,
            status: 'processed',
            created_at: 1718500000,
            processed_at: 1718500100,
            notes: {
              orderId: fixture.orderId,
              orderItemId: fixture.itemIds[0],
            },
          },
        },
      },
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await handleRazorpayWebhook({
        rawBody: Buffer.from(payload, 'utf8'),
        signature: signWebhook(payload),
        client: prisma,
      });
      assert.equal(result.handled, true);
      assert.equal(result.refundStatus, 'REFUNDED');
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: fixture.itemIds[0] },
    });
    const order = await prisma.order.findUnique({
      where: { id: fixture.orderId },
    });
    const inventoryAfter = await prisma.inventoryLog.count({
      where: { wholesalerId: fixture.wholesalerId },
    });
    const ledgerAfter = await prisma.ledgerEntry.count({
      where: { wholesalerId: fixture.wholesalerId },
    });

    assert.equal(item.refundStatus, 'REFUNDED');
    assert.equal(item.refundReference, `rfnd_${tag}`);
    assert.equal(toNumber(item.refundedAmount), 300);
    assert.equal(order.paymentStatus, 'REFUNDED');
    assert.equal(inventoryAfter, inventoryBefore);
    assert.equal(ledgerAfter, ledgerBefore);
  } finally {
    await cleanupFixture(fixture);
  }
});
