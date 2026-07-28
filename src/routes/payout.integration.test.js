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
  `payouttest-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cleanupPayoutFixture = async (fixture) => {
  if (!fixture) return;
  await prisma.wholesalerPayout.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: fixture.orderIds || [] } } });
  await prisma.order.deleteMany({ where: { id: { in: fixture.orderIds || [] } } });
  await prisma.product.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
  await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [fixture.wholesalerUserId, fixture.buyerId, fixture.adminUserId].filter(Boolean),
      },
    },
  });
};

test('Supplier Payout System integration flows', async () => {
  const tag = createTag('flow');

  // 1. Create Wholesaler, Buyer and Admin
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
      bankName: 'Test Bank',
      bankAccountNo: '123456789',
      bankIfsc: 'TEST0001234',
      upiId: 'test@upi',
    },
  });

  const buyer = await prisma.user.create({
    data: {
      email: `${tag}-buyer@example.com`,
      password: 'password',
      name: `${tag} Buyer`,
      role: 'CUSTOMER',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: `${tag}-admin@example.com`,
      password: 'password',
      name: `${tag} Admin`,
      role: 'SUPER_ADMIN',
    },
  });

  const product = await prisma.product.create({
    data: {
      wholesalerId: wholesaler.id,
      name: `${tag} Product`,
      price: 300.0,
      currentStock: 10,
    },
  });

  // 2. Create delivered order with return window EXPIRED (1 hour ago)
  const expiredOrder = await prisma.order.create({
    data: {
      sellerId: wholesaler.id,
      buyerId: buyer.id,
      totalAmount: 350.0,
      deliveryFee: 50.0,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
          price: 300.0,
          unitPriceAtPurchase: 300.0,
          subtotalAtPurchase: 300.0,
          status: 'ACTIVE',
          returnStatus: 'NONE',
          returnEligibleUntil: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        },
      },
    },
    include: {
      items: true,
    },
  });

  // 3. Create delivered order with return window ACTIVE (in future - 7 days)
  const activeOrder = await prisma.order.create({
    data: {
      sellerId: wholesaler.id,
      buyerId: buyer.id,
      totalAmount: 350.0,
      deliveryFee: 50.0,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      items: {
        create: {
          productId: product.id,
          quantity: 1,
          price: 300.0,
          unitPriceAtPurchase: 300.0,
          subtotalAtPurchase: 300.0,
          status: 'ACTIVE',
          returnStatus: 'NONE',
          returnEligibleUntil: new Date(Date.now() + 7 * 24 * 3600 * 1000), // 7 days from now
        },
      },
    },
  });

  const fixture = {
    wholesalerId: wholesaler.id,
    wholesalerUserId: wholesalerUser.id,
    buyerId: buyer.id,
    adminUserId: adminUser.id,
    orderIds: [expiredOrder.id, activeOrder.id],
  };

  const sellerToken = makeToken(wholesalerUser.id, 'WHOLESALER', wholesaler.id);
  const adminToken = makeToken(adminUser.id, 'SUPER_ADMIN');

  try {
    // 4. Test summary fetching (only expiredOrder should be credited -> ₹350)
    const summaryRes = await request(app)
      .get('/api/payouts/wholesaler/summary')
      .set('Authorization', `Bearer ${sellerToken}`);

    assert.equal(summaryRes.status, 200);
    assert.equal(summaryRes.body.totalCumulativeEarnings, 350);
    assert.equal(summaryRes.body.withdrawableBalance, 350);

    // 5. Submit valid payout request (₹200)
    const requestRes = await request(app)
      .post('/api/payouts/wholesaler/requests')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        amount: 200,
        supplierNotes: 'First withdrawal',
      });

    assert.equal(requestRes.status, 201);
    assert.equal(requestRes.body.payout.amount, '200');
    assert.equal(requestRes.body.payout.status, 'PENDING');
    assert.equal(requestRes.body.payout.bankAccountNo, '123456789');
    const payoutId = requestRes.body.payout.id;

    // 6. Balance checks after pending request (withdrawable balance should drop to ₹150)
    const summaryAfterReqRes = await request(app)
      .get('/api/payouts/wholesaler/summary')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert.equal(summaryAfterReqRes.body.withdrawableBalance, 150);
    assert.equal(summaryAfterReqRes.body.totalPendingPayouts, 200);

    // 7. Requesting over the withdrawable limit (₹200) should fail
    const overdrawRes = await request(app)
      .post('/api/payouts/wholesaler/requests')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        amount: 200,
      });
    assert.equal(overdrawRes.status, 400);
    assert.match(overdrawRes.body.error, /Insufficient balance/i);

    // 8. Admin retrieves payout requests
    const adminGetRes = await request(app)
      .get('/api/payouts/admin/requests')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminGetRes.status, 200);
    const foundPayout = adminGetRes.body.requests.find((r) => r.id === payoutId);
    assert.ok(foundPayout);
    assert.equal(foundPayout.wholesaler.businessName, `${tag} Wholesale`);

    // 9. Admin approves the request
    const approveRes = await request(app)
      .post(`/api/payouts/admin/requests/${payoutId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transactionRef: 'TXN-UTR-99988',
        adminNotes: 'Succeeded bank transfer',
      });
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.payout.status, 'APPROVED');
    assert.equal(approveRes.body.payout.transactionRef, 'TXN-UTR-99988');

    // 10. Balance checks after approval (withdrawable balance is ₹150, pending is ₹0, paid is ₹200)
    const summaryAfterApproveRes = await request(app)
      .get('/api/payouts/wholesaler/summary')
      .set('Authorization', `Bearer ${sellerToken}`);
    assert.equal(summaryAfterApproveRes.body.withdrawableBalance, 150);
    assert.equal(summaryAfterApproveRes.body.totalPaidPayouts, 200);
    assert.equal(summaryAfterApproveRes.body.totalPendingPayouts, 0);

    // 11. Test custom payout settings update
    const settingsUpdateRes = await request(app)
      .put('/api/payouts/wholesaler/payout-settings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        useSameAsB2B: false,
        payoutBankName: 'Custom Payout Bank',
        payoutBankAccountNo: '987654321',
        payoutBankIfsc: 'PYOUT000123',
        payoutUpiId: 'custom@upi',
      });
    assert.equal(settingsUpdateRes.status, 200);
    assert.equal(settingsUpdateRes.body.wholesaler.useSameAsB2B, false);
    assert.equal(settingsUpdateRes.body.wholesaler.payoutBankAccountNo, '987654321');

    // 12. Submit valid payout request under custom settings (withdrawable balance is ₹150, request ₹50)
    const customRequestRes = await request(app)
      .post('/api/payouts/wholesaler/requests')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        amount: 50,
        supplierNotes: 'Custom payout request',
      });
    assert.equal(customRequestRes.status, 201);
    assert.equal(customRequestRes.body.payout.amount, '50');
    assert.equal(customRequestRes.body.payout.bankAccountNo, '987654321');
    assert.equal(customRequestRes.body.payout.upiId, 'custom@upi');

    // 13. Revert settings to use B2B and verify requesting payout uses B2B account details
    const settingsRevertRes = await request(app)
      .put('/api/payouts/wholesaler/payout-settings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        useSameAsB2B: true,
      });
    assert.equal(settingsRevertRes.status, 200);
    assert.equal(settingsRevertRes.body.wholesaler.useSameAsB2B, true);

    const b2bRequestRes = await request(app)
      .post('/api/payouts/wholesaler/requests')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        amount: 50,
        supplierNotes: 'B2B target request',
      });
    assert.equal(b2bRequestRes.status, 201);
    assert.equal(b2bRequestRes.body.payout.amount, '50');
    assert.equal(b2bRequestRes.body.payout.bankAccountNo, '123456789');
    assert.equal(b2bRequestRes.body.payout.upiId, 'test@upi');
  } finally {
    await cleanupPayoutFixture(fixture);
  }
});
