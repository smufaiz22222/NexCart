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

const createTag = (label) =>
  `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const cleanupFixture = async (fixture) => {
  if (!fixture) return;
  const userIds = [fixture.wholesalerUserId, fixture.adminUserId].filter(Boolean);
  
  if (fixture.couponId) {
    await prisma.coupon.deleteMany({ where: { id: fixture.couponId } });
  }
  if (fixture.wholesalerId) {
    await prisma.wholesalerSubscription.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
    await prisma.subscriptionPayment.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
    await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  }
  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
};

test('Coupon and Trial Activation Integration Test Flow', async (t) => {
  const tag = createTag('sub');
  
  // 1. Create a wholesaler user in APPLIED state (not operational yet)
  const wholesalerUser = await prisma.user.create({
    data: {
      email: `${tag}-merchant@example.com`,
      password: 'password',
      name: `Merchant ${tag}`,
      role: 'WHOLESALER',
      wholesalerProfile: {
        create: {
          businessName: `Merchant Store ${tag}`,
          onboardingStatus: 'APPLIED',
        },
      },
    },
    include: { wholesalerProfile: true },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: `${tag}-admin@example.com`,
      password: 'password',
      name: `Admin ${tag}`,
      role: 'SUPER_ADMIN',
    },
  });

  const wholesalerId = wholesalerUser.wholesalerProfile.id;
  const merchantToken = makeToken(wholesalerUser.id, 'WHOLESALER');
  const adminToken = makeToken(adminUser.id, 'SUPER_ADMIN');

  const fixture = {
    wholesalerUserId: wholesalerUser.id,
    adminUserId: adminUser.id,
    wholesalerId,
  };

  try {
    // 2. Verify that operational routes are locked initially
    const statsResponseBefore = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${merchantToken}`);
    assert.equal(statsResponseBefore.status, 403, 'Inventory should be locked for APPLIED wholesaler');
    assert.match(statsResponseBefore.body.error, /not operational/i);

    // 3. Start Free Trial
    const trialResponse = await request(app)
      .post('/api/subscriptions/trial/start')
      .set('Authorization', `Bearer ${merchantToken}`);
    
    assert.equal(trialResponse.status, 200);
    assert.equal(trialResponse.body.onboardingStatus, 'ACTIVE', 'Onboarding status should update to ACTIVE on trial start');
    assert.equal(trialResponse.body.subscription.purchaseMethod, 'TRIAL');

    // 4. Verify that inventory is now unlocked
    const statsResponseAfter = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${merchantToken}`);
    assert.equal(statsResponseAfter.status, 200, 'Inventory should be unlocked after trial start');

    // 5. Admin fetches plans to find Standard or Premium plan
    const plansResponse = await request(app)
      .get('/api/admin/subscriptions/plans')
      .set('Authorization', `Bearer ${adminToken}`);
    
    assert.equal(plansResponse.status, 200);
    const standardPlan = plansResponse.body.plans.find(p => p.code === 'STANDARD');
    assert.ok(standardPlan, 'Standard plan should exist');

    // 6. Admin creates a Coupon for Standard plan for 30 days
    const couponCode = `${tag}-SAVE30`.toUpperCase();
    const createCouponResponse = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: couponCode,
        planId: standardPlan.id,
        durationDays: 30,
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
    
    assert.equal(createCouponResponse.status, 201);
    assert.equal(createCouponResponse.body.coupon.code, couponCode);
    fixture.couponId = createCouponResponse.body.coupon.id;

    // 7. Wholesaler validates the Coupon
    const validateResponse = await request(app)
      .post('/api/subscriptions/coupons/validate')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ code: couponCode });
    
    assert.equal(validateResponse.status, 200);
    assert.equal(validateResponse.body.code, couponCode);
    assert.equal(validateResponse.body.durationDays, 30);
    assert.equal(validateResponse.body.plan.code, 'STANDARD');

    // 8. Wholesaler activates the coupon subscription
    const activateResponse = await request(app)
      .post('/api/subscriptions/coupons/activate')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ code: couponCode });
    
    assert.equal(activateResponse.status, 200);
    assert.equal(activateResponse.body.onboardingStatus, 'ACTIVE');
    assert.equal(activateResponse.body.subscription.plan.code, 'STANDARD');
    assert.equal(activateResponse.body.subscription.purchaseMethod, 'COUPON');

    // 9. Wholesaler validates the coupon again (should fail because it is used)
    const validateAgainResponse = await request(app)
      .post('/api/subscriptions/coupons/validate')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ code: couponCode });
    
    assert.equal(validateAgainResponse.status, 400);
    assert.match(validateAgainResponse.body.error, /already been used/i);

    // 10. Admin fetches all coupons and verifies isUsed is true and usedBy matches wholesalerId
    const getCouponsResponse = await request(app)
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`);
    
    assert.equal(getCouponsResponse.status, 200);
    const dbCoupon = getCouponsResponse.body.coupons.find(c => c.code === couponCode);
    assert.ok(dbCoupon);
    assert.equal(dbCoupon.isUsed, true);
    assert.equal(dbCoupon.usedBy.id, wholesalerId);

  } finally {
    await cleanupFixture(fixture);
  }
});
