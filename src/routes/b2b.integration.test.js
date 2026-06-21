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
  `b2btest-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cleanupB2BFixture = async (fixture) => {
  if (!fixture) return;

  const userIds = [fixture.buyerId, fixture.sellerUserId, fixture.adminId].filter(Boolean);
  const productIds = fixture.productId ? [fixture.productId] : [];
  const rfqIds = [fixture.rfqId, fixture.rfqId2].filter(Boolean);
  const profileIds = fixture.profileId ? [fixture.profileId] : [];
  const cartIds = fixture.cartId ? [fixture.cartId] : [];

  if (cartIds.length) {
    await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
    await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
  }

  if (rfqIds.length) {
    await prisma.rfq.deleteMany({ where: { id: { in: rfqIds } } });
  }

  if (profileIds.length) {
    await prisma.businessProfile.deleteMany({ where: { id: { in: profileIds } } });
  }

  if (productIds.length) {
    await prisma.inventoryLog.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }

  if (fixture.wholesalerId) {
    await prisma.wholesalerSubscription.deleteMany({
      where: { wholesalerId: fixture.wholesalerId },
    });
    await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  }

  if (userIds.length) {
    await prisma.b2BCartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } });
    await prisma.b2BCart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
};

test('B2B RFQ Flow: Stock Constraints, Proposing and Accepting Counter Proposals', async () => {
  const tag = createTag('rfq');

  // 1. Create Buyer and Wholesaler
  const buyer = await prisma.user.create({
    data: {
      email: `${tag}-buyer@example.com`,
      password: 'password',
      name: `Buyer B2B ${tag}`,
      role: 'CUSTOMER',
    },
  });

  const sellerUser = await prisma.user.create({
    data: {
      email: `${tag}-seller@example.com`,
      password: 'password',
      name: `Seller B2B ${tag}`,
      role: 'WHOLESALER',
    },
  });

  const wholesaler = await prisma.wholesaler.create({
    data: {
      userId: sellerUser.id,
      businessName: `Wholesale B2B ${tag}`,
    },
  });

  // Create an approved BusinessProfile for the buyer
  const profile = await prisma.businessProfile.create({
    data: {
      userId: buyer.id,
      companyName: `Buyer Corp ${tag}`,
      taxId: 'GST1234567890',
      businessAddress: '123 Business Street',
      verification: 'APPROVED',
      status: 'ACTIVE',
    },
  });

  // Create Product with initial stock of 10 and MOQ of 2
  const product = await prisma.product.create({
    data: {
      wholesalerId: wholesaler.id,
      name: `B2B Widget ${tag}`,
      price: 100,
      costPrice: 60,
      category: 'Electronics',
      sizes: [],
      currentStock: 10,
      minStock: 1,
      minOrderQty: 2,
    },
  });

  // Create Cart for Buyer
  const cart = await prisma.cart.create({
    data: {
      userId: buyer.id,
    },
  });

  const fixture = {
    buyerId: buyer.id,
    sellerUserId: sellerUser.id,
    wholesalerId: wholesaler.id,
    productId: product.id,
    profileId: profile.id,
    cartId: cart.id,
    rfqId: null,
    rfqId2: null,
  };

  try {
    const buyerToken = makeToken(buyer.id, 'CUSTOMER');
    const sellerToken = makeToken(sellerUser.id, 'WHOLESALER', wholesaler.id);

    // --- TEST FLOW A: Buyer Acceptance stock checks ---
    // 2. Buyer requests quote for 8 units
    const createRfqResponse = await request(app)
      .post('/api/b2b/rfq')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId: product.id,
        quantity: 8,
        targetPrice: 80,
        notes: 'Bulk discount request',
      });

    assert.equal(createRfqResponse.status, 201);
    const rfqId = createRfqResponse.body.rfq.id;
    fixture.rfqId = rfqId;

    // 3. Wholesaler counter offers 12 units (exceeding stock 10) at price 90 -> should fail
    const respondRfqFailResponse = await request(app)
      .patch(`/api/b2b/rfq/${rfqId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'COUNTER_OFFERED',
        counterPrice: 90,
        counterQuantity: 12,
        sellerNotes: 'Can do 90 per unit if you order 12 units',
      });

    assert.equal(respondRfqFailResponse.status, 400);
    assert.match(respondRfqFailResponse.body.error, /Insufficient inventory stock/i);

    // 4. Wholesaler updates stock to 15 inline
    const updateStockResponse = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        productId: product.id,
        changeAmount: 5, // 10 + 5 = 15
        reason: 'MANUAL_ADJUSTMENT',
      });

    assert.equal(updateStockResponse.status, 200);

    // 5. Wholesaler counter offers 12 units (now stock 15 >= 12) -> should succeed
    const respondRfqSuccessResponse = await request(app)
      .patch(`/api/b2b/rfq/${rfqId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'COUNTER_OFFERED',
        counterPrice: 90,
        counterQuantity: 12,
        sellerNotes: 'Can do 90 per unit if you order 12 units',
      });

    assert.equal(respondRfqSuccessResponse.status, 200);

    // 6. Wholesaler drops stock to 10 inline (stock 10 < 12)
    const updateStockDownResponse = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        productId: product.id,
        changeAmount: -5, // 15 - 5 = 10
        reason: 'MANUAL_ADJUSTMENT',
      });

    assert.equal(updateStockDownResponse.status, 200);

    // 7. Buyer attempts to accept counter offer (should fail since stock 10 < 12)
    const acceptFailResponse = await request(app)
      .post(`/api/b2b/rfq/${rfqId}/accept`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send();

    assert.equal(acceptFailResponse.status, 400);
    assert.match(acceptFailResponse.body.error, /Insufficient inventory stock/i);

    // 8. Wholesaler updates stock back to 15 inline
    const updateStockUpResponse = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        productId: product.id,
        changeAmount: 5, // 10 + 5 = 15
        reason: 'MANUAL_ADJUSTMENT',
      });

    assert.equal(updateStockUpResponse.status, 200);

    // 9. Buyer accepts the counter offer now (should succeed since stock 15 >= 12)
    const acceptSuccessResponse = await request(app)
      .post(`/api/b2b/rfq/${rfqId}/accept`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send();

    assert.equal(acceptSuccessResponse.status, 200);
    assert.equal(acceptSuccessResponse.body.rfq.status, 'ACCEPTED');

    // 10. Add accepted RFQ item to B2B Cart
    const addCartResponse = await request(app)
      .post('/api/b2b-cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId: product.id,
        rfqId: rfqId,
        quantity: 12,
        unitPrice: 90,
      });

    assert.equal(addCartResponse.status, 200);
    const cartItem = addCartResponse.body.items.find((item) => item.rfqId === rfqId);
    assert.ok(cartItem);
    const cartItemId = cartItem.id;

    // 11. Attempt to update the quantity of this RFQ item in B2B Cart (should fail)
    const updateCartQtyResponse = await request(app)
      .patch(`/api/b2b-cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        quantity: 15,
      });

    assert.equal(updateCartQtyResponse.status, 400);
    assert.match(
      updateCartQtyResponse.body.error,
      /Quantity of negotiated RFQ items cannot be modified/i
    );

    // --- TEST FLOW B: Wholesaler Direct Acceptance stock validation ---
    // 7. Buyer requests another quote for 15 units (exceeding stock 15 now)
    const createRfqResponse2 = await request(app)
      .post('/api/b2b/rfq')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        productId: product.id,
        quantity: 18, // exceeding stock 15
        targetPrice: 75,
        notes: 'Second request',
      });

    assert.equal(createRfqResponse2.status, 201);
    const rfqId2 = createRfqResponse2.body.rfq.id;
    fixture.rfqId2 = rfqId2;

    // 8. Wholesaler tries to accept the bid directly (should fail due to insufficient stock: 15 < 18)
    const sellerAcceptFail = await request(app)
      .patch(`/api/b2b/rfq/${rfqId2}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'ACCEPTED',
        sellerNotes: 'I accept your offer directly',
      });

    assert.equal(sellerAcceptFail.status, 400);
    assert.match(sellerAcceptFail.body.error, /Insufficient inventory stock/i);
  } finally {
    await cleanupB2BFixture(fixture);
  }
});

test('B2B buyer routes block non-CUSTOMER roles', async () => {
  const tag = createTag('b2b-guard');

  const sellerUser = await prisma.user.create({
    data: {
      email: `${tag}-seller@example.com`,
      password: 'password',
      name: `Seller B2B Guard ${tag}`,
      role: 'WHOLESALER',
    },
  });

  const wholesaler = await prisma.wholesaler.create({
    data: {
      userId: sellerUser.id,
      businessName: `Wholesale Guard ${tag}`,
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      email: `${tag}-admin@example.com`,
      password: 'password',
      name: `SuperAdmin Guard ${tag}`,
      role: 'SUPER_ADMIN',
    },
  });

  const sellerToken = makeToken(sellerUser.id, 'WHOLESALER', wholesaler.id);
  const adminToken = makeToken(superAdmin.id, 'SUPER_ADMIN');

  // Create a CUSTOMER token and a credit limit record for testing successful buyer credit check
  const buyerUser = await prisma.user.create({
    data: {
      email: `${tag}-buyer@example.com`,
      password: 'password',
      name: `Buyer Guard ${tag}`,
      role: 'CUSTOMER',
    },
  });
  const buyerToken = makeToken(buyerUser.id, 'CUSTOMER');

  const creditLimitRecord = await prisma.wholesalerCreditLimit.create({
    data: {
      wholesalerId: wholesaler.id,
      buyerId: buyerUser.id,
      creditLimit: 75000.0,
      balance: 1000.0,
    },
  });

  const fixture = {
    sellerUserId: sellerUser.id,
    wholesalerId: wholesaler.id,
    adminId: superAdmin.id,
    buyerId: buyerUser.id,
  };

  try {
    const unauthorizedPaths = [
      {
        method: 'post',
        path: '/api/b2b/rfq',
        body: { productId: 'invalid-id', quantity: 1, targetPrice: 100 },
      },
      { method: 'post', path: '/api/b2b/rfq/fake-id/accept', body: {} },
      { method: 'post', path: '/api/b2b/rfq/fake-id/buyer-respond', body: { status: 'REJECTED' } },
      { method: 'get', path: '/api/b2b/buyer/credit-limits', body: {} },
    ];

    for (const { method, path, body } of unauthorizedPaths) {
      const sellerResponse = await request(app)
        [method](path)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(body);

      assert.equal(sellerResponse.status, 403);
      assert.match(sellerResponse.body.error, /Access denied/i);

      const adminResponse = await request(app)
        [method](path)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);

      assert.equal(adminResponse.status, 403);
      assert.match(adminResponse.body.error, /Access denied/i);
    }

    // Verify CUSTOMER can access their credit limits successfully
    const buyerResponse = await request(app)
      .get('/api/b2b/buyer/credit-limits')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send();

    assert.equal(buyerResponse.status, 200);
    assert.ok(Array.isArray(buyerResponse.body.creditLimits));
    const matchedRecord = buyerResponse.body.creditLimits.find(
      (r) => r.id === creditLimitRecord.id
    );
    assert.ok(matchedRecord);
    assert.equal(matchedRecord.creditLimit, 75000);
    assert.equal(matchedRecord.balance, '1000.00');
    assert.equal(matchedRecord.businessName, `Wholesale Guard ${tag}`);
  } finally {
    // Delete the credit limit record we created
    await prisma.wholesalerCreditLimit.deleteMany({
      where: { id: creditLimitRecord.id },
    });
    await cleanupB2BFixture(fixture);
  }
});
