import { performance } from 'node:perf_hooks';
import Razorpay from 'razorpay';
import { prisma } from '../src/config/db.js';
import { cancelOrderItemForCustomer } from '../src/services/orderCancellationService.js';

process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';

const BULK_CONCURRENCY = 100;
const CONTENTION_CONCURRENCY = 100;

const createTag = (label) =>
  `load-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getRazorpayApiPrototype = () =>
  Object.getPrototypeOf(new Razorpay({ key_id: 'x', key_secret: 'y' }).api);

const percentile = (values, targetPercentile) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((targetPercentile / 100) * sorted.length) - 1)
  );
  return Number(sorted[index].toFixed(2));
};

const cleanupFixture = async (fixture) => {
  if (!fixture) return;

  const userIds = fixture.userIds || [];
  const wholesalerIds = fixture.wholesalerIds || [];
  const productIds = fixture.productIds || [];
  const orderIds = fixture.orderIds || [];

  if (orderIds.length) {
    await prisma.orderIssue.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  if (wholesalerIds.length) {
    await prisma.inventoryLog.deleteMany({ where: { wholesalerId: { in: wholesalerIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { wholesalerId: { in: wholesalerIds } } });
  }

  if (productIds.length) {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }

  if (wholesalerIds.length) {
    await prisma.wholesaler.deleteMany({ where: { id: { in: wholesalerIds } } });
  }

  if (userIds.length) {
    await prisma.shippingAddress.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId: { in: userIds },
        },
      },
    });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.recommendationEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.recommendationInteraction.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.recommendationLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.prepaidCheckoutSession.deleteMany({ where: { buyerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
};

const createBulkFixture = async (tag, count) => {
  const userIds = [];
  const wholesalerIds = [];
  const productIds = [];
  const orderIds = [];
  const workItems = [];

  for (let index = 0; index < count; index += 1) {
    const buyer = await prisma.user.create({
      data: {
        email: `${tag}-buyer-${index}@example.com`,
        password: 'password',
        name: `Buyer ${index}`,
        role: 'CUSTOMER',
      },
    });

    const sellerUser = await prisma.user.create({
      data: {
        email: `${tag}-seller-${index}@example.com`,
        password: 'password',
        name: `Seller ${index}`,
        role: 'WHOLESALER',
      },
    });

    const wholesaler = await prisma.wholesaler.create({
      data: {
        userId: sellerUser.id,
        businessName: `Wholesale ${index}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        wholesalerId: wholesaler.id,
        name: `Load Product ${index}`,
        price: 250,
        costPrice: 150,
        category: 'LoadTest',
        sizes: [],
        currentStock: 4,
        minStock: 1,
      },
    });

    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: wholesaler.id,
        status: 'PENDING',
        paymentMethod: 'PREPAID',
        paymentStatus: 'PAID',
        paymentCaptureStatus: 'CAPTURED',
        paymentProvider: 'razorpay',
        paymentReference: `rzp_order_${tag}_${index}:pay_${tag}_${index}`,
        razorpayOrderId: `rzp_order_${tag}_${index}`,
        razorpayPaymentId: `pay_${tag}_${index}`,
        totalAmount: 250,
        shippingAddress: `Buyer ${index}, 9876543210, Market Road`,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            price: 250,
            unitPriceAtPurchase: 250,
            subtotalAtPurchase: 250,
            status: 'ACTIVE',
            refundStatus: 'NOT_APPLICABLE',
          },
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

    await prisma.ledgerEntry.createMany({
      data: [
        {
          wholesalerId: wholesaler.id,
          userId: buyer.id,
          amount: -250,
          description: `Marketplace Order ${order.id}`,
          referenceId: invoice.id,
        },
        {
          wholesalerId: wholesaler.id,
          userId: buyer.id,
          amount: 250,
          description: `Marketplace Prepaid Payment ${order.id}`,
          referenceId: invoice.id,
        },
      ],
    });

    await prisma.inventoryLog.create({
      data: {
        wholesalerId: wholesaler.id,
        productId: product.id,
        changeAmount: -1,
        reason: 'SALE',
      },
    });

    userIds.push(buyer.id, sellerUser.id);
    wholesalerIds.push(wholesaler.id);
    productIds.push(product.id);
    orderIds.push(order.id);
    workItems.push({
      buyerId: buyer.id,
      orderId: order.id,
      itemId: order.items[0].id,
      productId: product.id,
      wholesalerId: wholesaler.id,
      paymentId: `pay_${tag}_${index}`,
      refundId: `rfnd_${tag}_${index}`,
    });
  }

  return {
    userIds,
    wholesalerIds,
    productIds,
    orderIds,
    workItems,
  };
};

const createContentionFixture = async (tag) => {
  const buyer = await prisma.user.create({
    data: {
      email: `${tag}-buyer@example.com`,
      password: 'password',
      name: 'Contention Buyer',
      role: 'CUSTOMER',
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `${tag}-seller@example.com`,
      password: 'password',
      name: 'Contention Seller',
      role: 'WHOLESALER',
    },
  });

  const wholesaler = await prisma.wholesaler.create({
    data: {
      userId: sellerUser.id,
      businessName: 'Contention Wholesale',
    },
  });

  const product = await prisma.product.create({
    data: {
      wholesalerId: wholesaler.id,
      name: 'Contention Product',
      price: 400,
      costPrice: 240,
      category: 'LoadTest',
      sizes: [],
      currentStock: 2,
      minStock: 1,
    },
  });

  const order = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      sellerId: wholesaler.id,
      status: 'PENDING',
      paymentMethod: 'PREPAID',
      paymentStatus: 'PAID',
      paymentCaptureStatus: 'CAPTURED',
      paymentProvider: 'razorpay',
      paymentReference: `rzp_order_${tag}:pay_${tag}`,
      razorpayOrderId: `rzp_order_${tag}`,
      razorpayPaymentId: `pay_${tag}`,
      totalAmount: 400,
      shippingAddress: 'Buyer, 9876543210, Market Road',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
          price: 400,
          unitPriceAtPurchase: 400,
          subtotalAtPurchase: 400,
          status: 'ACTIVE',
          refundStatus: 'NOT_APPLICABLE',
        },
      },
    },
    include: { items: true },
  });

  const invoice = await prisma.invoice.create({
    data: {
      wholesalerId: wholesaler.id,
      orderId: order.id,
      amount: 400,
    },
  });

  await prisma.ledgerEntry.createMany({
    data: [
      {
        wholesalerId: wholesaler.id,
        userId: buyer.id,
        amount: -400,
        description: `Marketplace Order ${order.id}`,
        referenceId: invoice.id,
      },
      {
        wholesalerId: wholesaler.id,
        userId: buyer.id,
        amount: 400,
        description: `Marketplace Prepaid Payment ${order.id}`,
        referenceId: invoice.id,
      },
    ],
  });

  await prisma.inventoryLog.create({
    data: {
      wholesalerId: wholesaler.id,
      productId: product.id,
      changeAmount: -1,
      reason: 'SALE',
    },
  });

  return {
    userIds: [buyer.id, sellerUser.id],
    wholesalerIds: [wholesaler.id],
    productIds: [product.id],
    orderIds: [order.id],
    buyerId: buyer.id,
    orderId: order.id,
    itemId: order.items[0].id,
    wholesalerId: wholesaler.id,
    productId: product.id,
    paymentId: `pay_${tag}`,
    refundId: `rfnd_${tag}`,
  };
};

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

const measureCancellation = async (work) => {
  const startedAt = performance.now();
  try {
    const result = await cancelOrderItemForCustomer({
      buyerId: work.buyerId,
      orderId: work.orderId,
      itemId: work.itemId,
      reason: 'Load test cancellation',
      client: prisma,
    });

    return {
      ok: true,
      alreadyCancelled: Boolean(result.alreadyCancelled),
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      refundStatus: result.item?.refundStatus || null,
      refundReference: result.item?.refundReference || null,
    };
  } catch (error) {
    return {
      ok: false,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
      errorMessage: error.message,
      errorCode: error.code || error.statusCode || null,
    };
  }
};

const buildTimingSummary = (results) => {
  const durations = results.map((entry) => entry.durationMs);
  const average =
    durations.length > 0
      ? Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(2))
      : 0;

  return {
    minMs: durations.length ? Number(Math.min(...durations).toFixed(2)) : 0,
    maxMs: durations.length ? Number(Math.max(...durations).toFixed(2)) : 0,
    avgMs: average,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
  };
};

const runBulkScenario = async () => {
  const tag = createTag('bulk');
  const fixture = await createBulkFixture(tag, BULK_CONCURRENCY);

  try {
    const startedAt = performance.now();
    const results = await withMockedRazorpayPost(
      async ({ url, data }) => {
        if (url.startsWith('/payments/pay_') && url.endsWith('/refund')) {
          const paymentId = url.split('/')[2];
          return {
            id: paymentId.replace(/^pay_/, 'rfnd_'),
            amount: data.amount,
            status: 'processed',
            created_at: 1718500000,
            processed_at: 1718500100,
          };
        }

        throw new Error(`Unexpected Razorpay POST during bulk scenario: ${url}`);
      },
      async () => Promise.all(fixture.workItems.map((work) => measureCancellation(work)))
    );
    const totalDurationMs = Number((performance.now() - startedAt).toFixed(2));

    const productStates = await prisma.product.findMany({
      where: { id: { in: fixture.productIds } },
      select: { id: true, currentStock: true },
    });
    const itemStates = await prisma.orderItem.findMany({
      where: { orderId: { in: fixture.orderIds } },
      select: { id: true, status: true, refundStatus: true, refundReference: true },
    });
    const cancellationLogs = await prisma.inventoryLog.count({
      where: {
        wholesalerId: { in: fixture.wholesalerIds },
        reason: 'CANCELLATION',
      },
    });
    const reversalEntries = await prisma.ledgerEntry.count({
      where: {
        wholesalerId: { in: fixture.wholesalerIds },
        description: { startsWith: 'Marketplace Order Item Cancellation ' },
      },
    });

    const okCount = results.filter((entry) => entry.ok).length;
    const errorMessages = results.filter((entry) => !entry.ok).map((entry) => entry.errorMessage);
    const duplicateRefundReferences =
      new Set(itemStates.filter((item) => item.refundReference).map((item) => item.refundReference))
        .size !== itemStates.filter((item) => item.refundReference).length;

    return {
      scenario: 'bulk-100-unique-items',
      totalRequests: BULK_CONCURRENCY,
      totalDurationMs,
      successCount: okCount,
      failureCount: results.length - okCount,
      deadlockErrors: errorMessages.filter(
        (message) =>
          typeof message === 'string' &&
          (message.toLowerCase().includes('deadlock') || message.toLowerCase().includes('timeout'))
      ).length,
      timing: buildTimingSummary(results),
      verification: {
        allItemsCancelled: itemStates.every((item) => item.status === 'CANCELLED'),
        allRefunded: itemStates.every((item) => item.refundStatus === 'REFUNDED'),
        stockRestoredForAll: productStates.every((product) => product.currentStock === 5),
        cancellationLogCount: cancellationLogs,
        expectedCancellationLogCount: BULK_CONCURRENCY,
        reversalEntryCount: reversalEntries,
        expectedReversalEntryCount: BULK_CONCURRENCY,
        duplicateRefundReferences,
      },
    };
  } finally {
    await cleanupFixture(fixture);
  }
};

const runContentionScenario = async () => {
  const tag = createTag('contention');
  const fixture = await createContentionFixture(tag);

  try {
    const startedAt = performance.now();
    const results = await withMockedRazorpayPost(
      async ({ url, data }) => {
        if (url === `/payments/${fixture.paymentId}/refund`) {
          return {
            id: fixture.refundId,
            amount: data.amount,
            status: 'processed',
            created_at: 1718500000,
            processed_at: 1718500100,
          };
        }

        throw new Error(`Unexpected Razorpay POST during contention scenario: ${url}`);
      },
      async () =>
        Promise.all(
          Array.from({ length: CONTENTION_CONCURRENCY }, () =>
            measureCancellation({
              buyerId: fixture.buyerId,
              orderId: fixture.orderId,
              itemId: fixture.itemId,
            })
          )
        )
    );
    const totalDurationMs = Number((performance.now() - startedAt).toFixed(2));

    const item = await prisma.orderItem.findUnique({
      where: { id: fixture.itemId },
    });
    const product = await prisma.product.findUnique({
      where: { id: fixture.productId },
    });
    const cancellationLogs = await prisma.inventoryLog.count({
      where: {
        wholesalerId: fixture.wholesalerId,
        reason: 'CANCELLATION',
      },
    });
    const reversalEntries = await prisma.ledgerEntry.count({
      where: {
        wholesalerId: fixture.wholesalerId,
        description: { startsWith: 'Marketplace Order Item Cancellation ' },
      },
    });

    return {
      scenario: 'contention-100-same-item',
      totalRequests: CONTENTION_CONCURRENCY,
      totalDurationMs,
      successCount: results.filter((entry) => entry.ok).length,
      failureCount: results.filter((entry) => !entry.ok).length,
      alreadyCancelledCount: results.filter((entry) => entry.alreadyCancelled).length,
      firstTimeCancellationCount: results.filter((entry) => entry.ok && !entry.alreadyCancelled)
        .length,
      deadlockErrors: results.filter(
        (entry) =>
          !entry.ok &&
          typeof entry.errorMessage === 'string' &&
          entry.errorMessage.toLowerCase().includes('deadlock')
      ).length,
      timing: buildTimingSummary(results),
      verification: {
        finalItemStatus: item?.status || null,
        finalRefundStatus: item?.refundStatus || null,
        finalRefundReference: item?.refundReference || null,
        stockRestoredOnce: product?.currentStock === 3,
        cancellationLogCount: cancellationLogs,
        reversalEntryCount: reversalEntries,
      },
    };
  } finally {
    await cleanupFixture(fixture);
  }
};

const main = async () => {
  const overallStartedAt = performance.now();

  try {
    const [bulk, contention] = await Promise.all([runBulkScenario(), runContentionScenario()]);
    const summary = {
      executedAt: new Date().toISOString(),
      overallDurationMs: Number((performance.now() - overallStartedAt).toFixed(2)),
      scenarios: [bulk, contention],
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
};

await main();
