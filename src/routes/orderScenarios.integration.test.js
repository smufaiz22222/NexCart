import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
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
  `scenarios-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getRazorpayApiPrototype = () =>
  Object.getPrototypeOf(new Razorpay({ key_id: 'x', key_secret: 'y' }).api);

const withMockedRazorpayPost = async (mockHandler, run) => {
  const apiPrototype = getRazorpayApiPrototype();
  const originalPost = apiPrototype.post;
  const originalGet = apiPrototype.get;

  apiPrototype.post = function mockedPost(params, callback) {
    return mockHandler.call(this, params, callback, originalPost.bind(this));
  };

  apiPrototype.get = function mockedGet(params, callback) {
    const url = params.url || '';
    let responsePromise;
    if (url.includes('/payments/')) {
      const paymentId = url.split('/').pop();
      responsePromise = Promise.resolve({
        id: paymentId,
        status: 'captured',
        refund_status: null,
      });
    } else {
      responsePromise = Promise.resolve({
        items: [],
      });
    }

    if (typeof callback === 'function') {
      responsePromise.then(
        (res) => callback(null, res),
        (err) => callback(err)
      );
    }
    return responsePromise;
  };

  try {
    return await run();
  } finally {
    apiPrototype.post = originalPost;
    apiPrototype.get = originalGet;
  }
};

const cleanupFixture = async (fixture) => {
  if (!fixture) return;

  const userIds = [fixture.buyerId, ...(fixture.wholesalerUserIds || [])].filter(Boolean);
  const orderIds = fixture.orderIds || [];
  const productIds = fixture.productIds || [];
  const wholesalerIds = fixture.wholesalerIds || [];
  const cartIds = fixture.cartId ? [fixture.cartId] : [];
  const prepaidSessionIds = fixture.prepaidSessionIds || [];

  if (userIds.length) {
    await prisma.recommendationEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.recommendationInteraction.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.recommendationLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.prepaidCheckoutSession.deleteMany({ where: { id: { in: prepaidSessionIds } } });
    await prisma.prepaidCheckoutSession.deleteMany({ where: { buyerId: { in: userIds } } });
    await prisma.orderIssue.deleteMany({ where: { requesterId: { in: userIds } } });
    await prisma.shippingAddress.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
  }

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

    await prisma.orderAdjustment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderIssue.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  if (wholesalerIds.length) {
    await prisma.accountingEntry.deleteMany({ where: { wholesalerId: { in: wholesalerIds } } });
    await prisma.accountingAccount.deleteMany({ where: { wholesalerId: { in: wholesalerIds } } });
    await prisma.businessParty.deleteMany({ where: { wholesalerId: { in: wholesalerIds } } });
    await prisma.wholesalerSubscription.deleteMany({
      where: { wholesalerId: { in: wholesalerIds } },
    });
    await prisma.inventoryLog.deleteMany({ where: { wholesalerId: { in: wholesalerIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.wholesaler.deleteMany({ where: { id: { in: wholesalerIds } } });
  }

  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
};

const createMultiSellerFixture = async (tag) => {
  const buyer = await prisma.user.create({
    data: {
      email: `${tag}-buyer@example.com`,
      password: 'password',
      name: `Buyer ${tag}`,
      role: 'CUSTOMER',
    },
  });

  const wholesalers = [];
  const wholesalerUserIds = [];
  const wholesalerIds = [];
  const productIds = [];

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

  for (let i = 1; i <= 2; i++) {
    const sellerUser = await prisma.user.create({
      data: {
        email: `${tag}-seller${i}@example.com`,
        password: 'password',
        name: `Seller ${i} ${tag}`,
        role: 'WHOLESALER',
      },
    });
    wholesalerUserIds.push(sellerUser.id);

    const wholesaler = await prisma.wholesaler.create({
      data: {
        userId: sellerUser.id,
        businessName: `Wholesale ${i} ${tag}`,
      },
    });
    wholesalerIds.push(wholesaler.id);

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

    const product = await prisma.product.create({
      data: {
        wholesalerId: wholesaler.id,
        name: `Product ${i} ${tag}`,
        price: 150 * i, // Product 1: 150, Product 2: 300
        costPrice: 90 * i,
        category: 'General',
        sizes: [],
        currentStock: 10,
        minStock: 1,
      },
    });
    productIds.push(product.id);

    wholesalers.push({
      userId: sellerUser.id,
      wholesalerId: wholesaler.id,
      productId: product.id,
      productPrice: product.price,
    });
  }

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
        productId: wholesalers[0].productId,
        quantity: 2,
      },
      {
        cartId: cart.id,
        productId: wholesalers[1].productId,
        quantity: 1,
      },
    ],
  });

  return {
    buyerId: buyer.id,
    wholesalerUserIds,
    wholesalerIds,
    productIds,
    addressId: address.id,
    cartId: cart.id,
    wholesalers,
    orderIds: [],
    prepaidSessionIds: [],
  };
};

const signPayment = ({ razorpayOrderId, razorpayPaymentId }) =>
  crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

test('Scenario 1: Prepaid multi-seller checkout and full/partial cancellation', async () => {
  const tag = createTag('prepaid-scenarios');
  const fixture = await createMultiSellerFixture(tag);

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
          created_at: Math.floor(Date.now() / 1000),
          processed_at: Math.floor(Date.now() / 1000),
        };
      }
      throw new Error(`Unexpected Razorpay mock POST: ${url}`);
    },
    async () => {
      try {
        const buyerToken = makeToken(fixture.buyerId);

        // 1. Create Prepaid checkout session
        const createSessionResponse = await request(app)
          .post('/api/orders/prepaid/create')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            addressId: fixture.addressId,
            paymentMethod: 'PREPAID',
          });

        assert.equal(createSessionResponse.status, 201);
        assert.equal(createSessionResponse.body.razorpayOrderId, `rzp_order_${tag}`);
        assert.equal(toNumber(createSessionResponse.body.amount), 60000); // 600 INR in paise

        // 2. Verify Prepaid Order
        const verifyResponse = await request(app)
          .post('/api/orders/prepaid/verify')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            razorpayOrderId: createSessionResponse.body.razorpayOrderId,
            razorpayPaymentId: `pay_${tag}`,
            razorpaySignature: signPayment({
              razorpayOrderId: createSessionResponse.body.razorpayOrderId,
              razorpayPaymentId: `pay_${tag}`,
            }),
          });

        assert.equal(verifyResponse.status, 201);
        assert.equal(verifyResponse.body.orders.length, 2);

        const orders = verifyResponse.body.orders;
        const order1 = orders.find((o) => o.sellerId === fixture.wholesalerIds[0]);
        const order2 = orders.find((o) => o.sellerId === fixture.wholesalerIds[1]);
        assert.ok(order1);
        assert.ok(order2);
        fixture.orderIds = [order1.id, order2.id];

        // 3. Verify double-entry ledger records for creation of both orders
        for (const o of orders) {
          const accountingEntries = await prisma.accountingEntry.findMany({
            where: { wholesalerId: o.sellerId, referenceId: o.id },
            include: { account: true },
          });
          const salesEntry = accountingEntries.find((e) => e.account.code === 'SALES');
          const bankEntry = accountingEntries.find((e) => e.account.code === 'BANK');
          assert.ok(salesEntry);
          assert.ok(bankEntry);
          assert.equal(toNumber(salesEntry.amount), toNumber(o.totalAmount));
          assert.equal(toNumber(bankEntry.amount), toNumber(o.totalAmount));
        }

        // 4. Cancellation on Wholesaler 1's Order 1 (entire order becomes cancelled as it has 1 item row with quantity 2)
        const itemToCancel = order1.items[0];
        assert.equal(itemToCancel.quantity, 2);

        const cancelResponse = await request(app)
          .post(`/api/orders/${order1.id}/items/${itemToCancel.id}/cancel`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({ reason: 'Partial order cancellation' });

        assert.equal(cancelResponse.status, 200);
        assert.equal(cancelResponse.body.item.status, 'CANCELLED');
        assert.equal(cancelResponse.body.item.refundStatus, 'REFUNDED');
        assert.equal(cancelResponse.body.refundReference, `rfnd_${tag}`);

        // Verify stock is restored
        const product1 = await prisma.product.findUnique({
          where: { id: fixture.productIds[0] },
        });
        assert.equal(product1.currentStock, 10); // Sold 2 (became 8), restored 2 (back to 10)

        // Verify order 1 amount is now 0 (since it was fully cancelled)
        const updatedOrder1 = await prisma.order.findUnique({
          where: { id: order1.id },
        });
        assert.equal(toNumber(updatedOrder1.totalAmount), 0);
        assert.equal(updatedOrder1.status, 'CANCELLED');

        // Verify cancellation accounting entries (reversal)
        const cancellationEntries = await prisma.accountingEntry.findMany({
          where: {
            wholesalerId: order1.sellerId,
            description: { contains: `Cancellation` },
          },
          include: { account: true },
        });
        const reversedSales = cancellationEntries.find((e) => e.account.code === 'SALES');
        const reversedBank = cancellationEntries.find((e) => e.account.code === 'BANK');
        assert.ok(reversedSales);
        assert.ok(reversedBank);
        assert.equal(toNumber(reversedSales.amount), -300);
        assert.equal(toNumber(reversedBank.amount), -300);
      } finally {
        await cleanupFixture(fixture);
      }
    }
  );
});

test('Scenario 2: COD multi-seller checkout and return/refund manual settlement', async () => {
  const tag = createTag('cod-scenarios');
  const fixture = await createMultiSellerFixture(tag);

  try {
    const buyerToken = makeToken(fixture.buyerId);

    // 1. Checkout COD
    const checkoutResponse = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        addressId: fixture.addressId,
        paymentMethod: 'COD',
      });

    assert.equal(checkoutResponse.status, 201);
    assert.equal(checkoutResponse.body.orders.length, 2);

    const orders = checkoutResponse.body.orders;
    const order1 = orders.find((o) => o.sellerId === fixture.wholesalerIds[0]);
    const order2 = orders.find((o) => o.sellerId === fixture.wholesalerIds[1]);
    assert.ok(order1);
    assert.ok(order2);
    fixture.orderIds = [order1.id, order2.id];

    // Verify initial accounting records: charge recorded (UNRECONCILED_DEPOSITS debited, SALES credited)
    for (const o of orders) {
      const initialEntries = await prisma.accountingEntry.findMany({
        where: { wholesalerId: o.sellerId, referenceId: o.id },
        include: { account: true },
      });
      const salesCharge = initialEntries.find((e) => e.account.code === 'SALES');
      const receivableCharge = initialEntries.find(
        (e) => e.account.code === 'UNRECONCILED_DEPOSITS'
      );
      assert.ok(salesCharge);
      assert.ok(receivableCharge);
      assert.equal(toNumber(salesCharge.amount), toNumber(o.totalAmount));
      assert.equal(toNumber(receivableCharge.amount), toNumber(o.totalAmount));
    }

    // 2. Cancel Product A partially before delivery (cancel order1 completely since it's one item)
    const cancelResponse = await request(app)
      .post(`/api/orders/${order1.id}/items/${order1.items[0].id}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ reason: 'Changed mind before delivery' });

    assert.equal(cancelResponse.status, 200);
    assert.equal(cancelResponse.body.item.status, 'CANCELLED');
    assert.equal(cancelResponse.body.item.refundStatus, 'NOT_APPLICABLE');

    // Verify stock is restored
    const product1 = await prisma.product.findUnique({
      where: { id: fixture.productIds[0] },
    });
    assert.equal(product1.currentStock, 10);

    // Verify cancellation accounting entry recorded reversal
    const cancellationEntries = await prisma.accountingEntry.findMany({
      where: {
        wholesalerId: order1.sellerId,
        description: { contains: 'Cancellation' },
      },
      include: { account: true },
    });
    const reversedSales = cancellationEntries.find((e) => e.account.code === 'SALES');
    const reversedDeposits = cancellationEntries.find(
      (e) => e.account.code === 'UNRECONCILED_DEPOSITS'
    );
    assert.ok(reversedSales);
    assert.ok(reversedDeposits);
    assert.equal(toNumber(reversedSales.amount), -300);
    assert.equal(toNumber(reversedDeposits.amount), -300);

    // 3. Deliver Order 2 (Wholesaler 2)
    const deliverResponse = await request(app)
      .put(`/api/orders/${order2.id}/status`)
      .set('Authorization', `Bearer ${makeToken(fixture.wholesalerUserIds[1])}`)
      .send({ status: 'DELIVERED' });

    assert.equal(deliverResponse.status, 200);
    assert.equal(deliverResponse.body.order.paymentStatus, 'PAID');

    // Verify accounting record: Cash received (CASH debited, UNRECONCILED_DEPOSITS credited)
    const deliveryEntries = await prisma.accountingEntry.findMany({
      where: {
        wholesalerId: order2.sellerId,
        referenceId: order2.id,
      },
      include: { account: true },
    });
    const cashEntry = deliveryEntries.find(
      (e) => e.account.code === 'CASH' && toNumber(e.amount) === 300
    );
    const clearedDeposit = deliveryEntries.find(
      (e) => e.account.code === 'UNRECONCILED_DEPOSITS' && toNumber(e.amount) === -300
    );
    assert.ok(cashEntry);
    assert.ok(clearedDeposit);
    assert.equal(toNumber(cashEntry.amount), 300);
    assert.equal(toNumber(clearedDeposit.amount), -300);

    // 4. Request return on Order 2, providing bank details (for manual settlement)
    const requestReturnResponse = await request(app)
      .post(`/api/orders/${order2.id}/items/${order2.items[0].id}/request-return`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        reason: 'DAMAGED',
        quantity: 1,
        notes: 'Outer package was fine but inner container leaked.',
        bankAccountNumber: '1234567890',
        bankIfsc: 'HDFC0000123',
        bankAccountName: 'Buyer Account',
      });

    assert.equal(requestReturnResponse.status, 200);
    assert.equal(requestReturnResponse.body.item.returnStatus, 'REQUESTED');
    assert.equal(requestReturnResponse.body.item.bankAccountNumber, '1234567890');
    assert.equal(requestReturnResponse.body.item.bankIfsc, 'HDFC0000123');
    assert.equal(requestReturnResponse.body.item.bankAccountName, 'Buyer Account');

    // 5. Approve return (as wholesaler)
    const approveResponse = await request(app)
      .post(`/api/orders/${order2.id}/items/${order2.items[0].id}/approve-return`)
      .set('Authorization', `Bearer ${makeToken(fixture.wholesalerUserIds[1])}`)
      .send();

    assert.equal(approveResponse.status, 200);
    assert.equal(approveResponse.body.item.returnStatus, 'APPROVED');

    // 6. Receive return
    const receiveResponse = await request(app)
      .post(`/api/orders/${order2.id}/items/${order2.items[0].id}/receive-return`)
      .set('Authorization', `Bearer ${makeToken(fixture.wholesalerUserIds[1])}`)
      .send();

    assert.equal(receiveResponse.status, 200);
    assert.equal(receiveResponse.body.item.returnStatus, 'RECEIVED');
    assert.equal(receiveResponse.body.item.returnRefundStatus, 'PENDING');

    // 7. Settle return refund offline using BANK_TRANSFER
    const settleResponse = await request(app)
      .post(`/api/orders/${order2.id}/items/${order2.items[0].id}/settle-refund`)
      .set('Authorization', `Bearer ${makeToken(fixture.wholesalerUserIds[1])}`)
      .send({ refundMethod: 'BANK_TRANSFER' });

    assert.equal(settleResponse.status, 200);
    assert.equal(settleResponse.body.item.returnStatus, 'RETURN_COMPLETED');
    assert.equal(settleResponse.body.item.returnRefundStatus, 'SUCCESS');
    assert.equal(settleResponse.body.item.refundPaymentMethod, 'BANK_TRANSFER');
    assert.equal(toNumber(settleResponse.body.item.refundedAmount), 300);

    // Verify stock incremented
    const product2 = await prisma.product.findUnique({
      where: { id: fixture.productIds[1] },
    });
    assert.equal(product2.currentStock, 10); // Sold 1, returned 1, back to 10

    // Verify ledger entry for customer
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { orderId: order2.id },
    });
    assert.equal(ledgerEntries.length, 1);
    assert.equal(ledgerEntries[0].source, 'RETURN_REFUND');
    assert.equal(toNumber(ledgerEntries[0].amount), 300);

    // Verify double-entry manual return refund payout (maps to CASH due to original order being COD)
    const returnPayoutEntries = await prisma.accountingEntry.findMany({
      where: {
        wholesalerId: order2.sellerId,
        referenceId: order2.id,
        description: { contains: 'manual refund' },
      },
      include: { account: true },
    });
    const cashPayout = returnPayoutEntries.find((e) => e.account.code === 'CASH');
    const depositAdjustment = returnPayoutEntries.find(
      (e) => e.account.code === 'UNRECONCILED_DEPOSITS'
    );
    assert.ok(cashPayout);
    assert.ok(depositAdjustment);
    assert.equal(toNumber(cashPayout.amount), -300); // Outflow from CASH
    assert.equal(toNumber(depositAdjustment.amount), 300); // Cleared adjustment
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Scenario 3: Prepaid return refund retry and dispute lifecycle role-based check', async () => {
  const tag = createTag('prepaid-scenarios-3');
  const fixture = await createMultiSellerFixture(tag);

  const mockRazorpay = {
    shouldFail: false,
  };

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
        if (mockRazorpay.shouldFail) {
          const error = new Error('Gateway unavailable');
          error.statusCode = 500;
          throw error;
        }
        return {
          id: `rfnd_${tag}`,
          amount: data.amount,
          status: 'processed',
          created_at: Math.floor(Date.now() / 1000),
          processed_at: Math.floor(Date.now() / 1000),
        };
      }
      throw new Error(`Unexpected Razorpay mock POST: ${url}`);
    },
    async () => {
      try {
        const buyerToken = makeToken(fixture.buyerId);
        const seller1Token = makeToken(fixture.wholesalerUserIds[0]);
        const seller2Token = makeToken(fixture.wholesalerUserIds[1]);

        // 1. Create Prepaid checkout session
        const createSessionResponse = await request(app)
          .post('/api/orders/prepaid/create')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            addressId: fixture.addressId,
            paymentMethod: 'PREPAID',
          });

        assert.equal(createSessionResponse.status, 201);

        // 2. Verify Prepaid Order
        const verifyResponse = await request(app)
          .post('/api/orders/prepaid/verify')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            razorpayOrderId: createSessionResponse.body.razorpayOrderId,
            razorpayPaymentId: `pay_${tag}`,
            razorpaySignature: signPayment({
              razorpayOrderId: createSessionResponse.body.razorpayOrderId,
              razorpayPaymentId: `pay_${tag}`,
            }),
          });

        assert.equal(verifyResponse.status, 201);
        const orders = verifyResponse.body.orders;
        const order1 = orders.find((o) => o.sellerId === fixture.wholesalerIds[0]);
        const order2 = orders.find((o) => o.sellerId === fixture.wholesalerIds[1]);
        assert.ok(order1);
        assert.ok(order2);
        fixture.orderIds = [order1.id, order2.id];

        // Mark both as DELIVERED so we can request return / open disputes
        const deliver1Response = await request(app)
          .put(`/api/orders/${order1.id}/status`)
          .set('Authorization', `Bearer ${seller1Token}`)
          .send({ status: 'DELIVERED' });
        assert.equal(deliver1Response.status, 200);

        const deliver2Response = await request(app)
          .put(`/api/orders/${order2.id}/status`)
          .set('Authorization', `Bearer ${seller2Token}`)
          .send({ status: 'DELIVERED' });
        assert.equal(deliver2Response.status, 200);

        // A. PREPAID RETURN REFUND RETRY WORKFLOW on Order 2
        // Request return
        const returnReqResponse = await request(app)
          .post(`/api/orders/${order2.id}/items/${order2.items[0].id}/request-return`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({ reason: 'DEFECTIVE', quantity: 1, notes: 'Defective item' });
        assert.equal(returnReqResponse.status, 200);

        // Approve return
        const returnApproveResponse = await request(app)
          .post(`/api/orders/${order2.id}/items/${order2.items[0].id}/approve-return`)
          .set('Authorization', `Bearer ${seller2Token}`)
          .send();
        assert.equal(returnApproveResponse.status, 200);

        // Receive return with simulated failure
        mockRazorpay.shouldFail = true;
        const returnReceiveFailResponse = await request(app)
          .post(`/api/orders/${order2.id}/items/${order2.items[0].id}/receive-return`)
          .set('Authorization', `Bearer ${seller2Token}`)
          .send();
        assert.equal(returnReceiveFailResponse.status, 200);
        assert.equal(returnReceiveFailResponse.body.item.returnStatus, 'RECEIVED');
        assert.equal(returnReceiveFailResponse.body.item.returnRefundStatus, 'PENDING');

        // Retry refund with success
        mockRazorpay.shouldFail = false;
        const retryRefundResponse = await request(app)
          .post(`/api/orders/${order2.id}/items/${order2.items[0].id}/retry-return-refund`)
          .set('Authorization', `Bearer ${seller2Token}`)
          .send();

        assert.equal(retryRefundResponse.status, 200);
        assert.equal(retryRefundResponse.body.item.returnStatus, 'RETURN_COMPLETED');
        assert.equal(retryRefundResponse.body.item.returnRefundStatus, 'SUCCESS');
        assert.equal(retryRefundResponse.body.item.gatewayRefundId, `rfnd_${tag}`);

        // B. DISPUTE WORKFLOW on Order 1
        // Create dispute
        const createDisputeResponse = await request(app)
          .post(`/api/orders/${order1.id}/items/${order1.items[0].id}/disputes`)
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            reason: 'DAMAGED_ITEM',
            description: 'Item cracked inside packaging.',
            evidenceUrls: ['https://cdn.test/evidence-1.jpg'],
          });

        assert.equal(createDisputeResponse.status, 201);
        const dispute = createDisputeResponse.body.dispute;
        assert.equal(dispute.status, 'OPEN');

        // Wholesaler moves dispute to UNDER_REVIEW
        const reviewResponse = await request(app)
          .patch(
            `/api/orders/${order1.id}/items/${order1.items[0].id}/disputes/${dispute.id}/status`
          )
          .set('Authorization', `Bearer ${seller1Token}`)
          .send({ status: 'UNDER_REVIEW', updatedAt: dispute.updatedAt });
        assert.equal(reviewResponse.status, 200);
        assert.equal(reviewResponse.body.dispute.status, 'UNDER_REVIEW');

        // Wholesaler adds internal notes
        const noteResponse = await request(app)
          .post(
            `/api/orders/${order1.id}/items/${order1.items[0].id}/disputes/${dispute.id}/internal-notes`
          )
          .set('Authorization', `Bearer ${seller1Token}`)
          .send({
            note: 'Pre-shipment verification checklist looks clear.',
            updatedAt: reviewResponse.body.dispute.updatedAt,
          });
        assert.equal(noteResponse.status, 201);
        assert.equal(noteResponse.body.dispute.internalNotes.length, 1);

        // Wholesaler resolves dispute
        const resolveResponse = await request(app)
          .patch(
            `/api/orders/${order1.id}/items/${order1.items[0].id}/disputes/${dispute.id}/resolve`
          )
          .set('Authorization', `Bearer ${seller1Token}`)
          .send({
            resolutionType: 'APPROVE', // Full refund
            resolutionNotes: 'Approving return refund dispute',
            updatedAt: noteResponse.body.dispute.updatedAt,
          });
        assert.equal(resolveResponse.status, 200);
        assert.equal(resolveResponse.body.dispute.status, 'RESOLVED');

        // Verify role-based serialization: customer must NOT see internalNotes, wholesaler must see them
        const getOrdersAsBuyer = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${buyerToken}`);
        const buyerOrder1 = getOrdersAsBuyer.body.orders.find((o) => o.id === order1.id);
        assert.ok(buyerOrder1);
        const buyerDispute = buyerOrder1.disputes.find((d) => d.id === dispute.id);
        assert.ok(buyerDispute);
        assert.equal(buyerDispute.internalNotes.length, 0); // Excluded for customer role

        const getOrdersAsWholesaler = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${seller1Token}`);
        const sellerOrder1 = getOrdersAsWholesaler.body.orders.find((o) => o.id === order1.id);
        assert.ok(sellerOrder1);
        const sellerDispute = sellerOrder1.disputes.find((d) => d.id === dispute.id);
        assert.ok(sellerDispute);
        assert.equal(sellerDispute.internalNotes.length, 1); // Included for wholesaler role
        assert.equal(
          sellerDispute.internalNotes[0].note,
          'Pre-shipment verification checklist looks clear.'
        );
      } finally {
        await cleanupFixture(fixture);
      }
    }
  );
});
