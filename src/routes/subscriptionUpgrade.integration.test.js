import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../config/db.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test-secret';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'test-key-id';

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
    await prisma.wholesalerSubscription.deleteMany({
      where: { wholesalerId: fixture.wholesalerId },
    });
    await prisma.subscriptionPayment.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
    await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  }
  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
};

test('Subscription Upgrade and Upgrade Promocode Integration Test Flow', async () => {
  const tag = createTag('upgrade');

  // Create Wholesaler
  const wholesalerUser = await prisma.user.create({
    data: {
      email: `${tag}-merchant@example.com`,
      password: 'password',
      name: `Merchant ${tag}`,
      role: 'WHOLESALER',
      wholesalerProfile: {
        create: {
          businessName: `Merchant Store ${tag}`,
          onboardingStatus: 'ACTIVE',
        },
      },
    },
    include: { wholesalerProfile: true },
  });

  // Create Admin
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
    // 1. Get Subscription Plans
    const plansResponse = await request(app)
      .get('/api/admin/subscriptions/plans')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(plansResponse.status, 200);
    const standardPlan = plansResponse.body.plans.find((p) => p.code === 'STANDARD');
    const premiumPlan = plansResponse.body.plans.find((p) => p.code === 'PREMIUM');

    assert.ok(standardPlan, 'Standard plan should exist');
    assert.ok(premiumPlan, 'Premium plan should exist');

    // 2. Query upgrade details before standard subscription is active (should return not eligible)
    const initUpgradeResponse = await request(app)
      .get('/api/subscriptions/upgrade-details')
      .set('Authorization', `Bearer ${merchantToken}`);
    assert.equal(initUpgradeResponse.status, 200);
    assert.equal(initUpgradeResponse.body.isEligible, false);

    // 3. Manually create Standard subscription in the DB for the user starting 30 days ago and ending in 30 days
    const now = new Date();
    const periodStart = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const periodEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now

    const standardSub = await prisma.wholesalerSubscription.create({
      data: {
        wholesalerId,
        planId: standardPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        durationMonths: 3,
        purchaseMethod: 'RAZORPAY',
        startedAt: periodStart,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    // Create payment matching standard subscription
    await prisma.subscriptionPayment.create({
      data: {
        wholesalerId,
        subscriptionId: standardSub.id,
        planId: standardPlan.id,
        purchaseMethod: 'RAZORPAY',
        status: 'PAID',
        durationMonths: 3,
        baseAmount: standardPlan.price * 3,
        discountPercent: 5,
        finalAmount: standardPlan.price * 3 * 0.95,
        paidAt: periodStart,
        validUntil: periodEnd,
      },
    });

    // 4. Query upgrade details now (should be eligible)
    const upgradeDetailsResponse = await request(app)
      .get('/api/subscriptions/upgrade-details')
      .set('Authorization', `Bearer ${merchantToken}`);

    assert.equal(upgradeDetailsResponse.status, 200);
    assert.equal(upgradeDetailsResponse.body.isEligible, true);
    assert.equal(upgradeDetailsResponse.body.currentPlan.code, 'STANDARD');
    assert.equal(upgradeDetailsResponse.body.targetPlan.code, 'PREMIUM');
    assert.ok(upgradeDetailsResponse.body.remainingDays > 0);
    assert.ok(upgradeDetailsResponse.body.diffAmount > 0);

    // 5. Checkout for subscription upgrade
    const checkoutResponse = await request(app)
      .post('/api/subscriptions/checkout')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        planId: premiumPlan.id,
        isUpgrade: true,
      });

    assert.equal(checkoutResponse.status, 200);
    assert.ok(checkoutResponse.body.razorpayOrderId);
    assert.equal(
      checkoutResponse.body.amount,
      Math.round(upgradeDetailsResponse.body.diffAmount * 100)
    );

    // 6. Verify checkout upgrade payment
    const rpOrderId = checkoutResponse.body.razorpayOrderId;
    const rpPaymentId = 'pay_upgrade_test';
    const body = `${rpOrderId}|${rpPaymentId}`;
    const sig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const verifyResponse = await request(app)
      .post('/api/subscriptions/verify')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        razorpayOrderId: rpOrderId,
        razorpayPaymentId: rpPaymentId,
        razorpaySignature: sig,
      });

    assert.equal(verifyResponse.status, 200);
    assert.equal(verifyResponse.body.onboardingStatus, 'ACTIVE');
    assert.equal(verifyResponse.body.subscription.plan.code, 'PREMIUM');

    // Verify DB values
    const premiumSub = await prisma.wholesalerSubscription.findFirst({
      where: { wholesalerId, status: 'ACTIVE' },
      include: { plan: true },
    });
    assert.equal(premiumSub.plan.code, 'PREMIUM');
    assert.equal(premiumSub.isUpgrade, true);

    const oldSub = await prisma.wholesalerSubscription.findUnique({
      where: { id: standardSub.id },
    });
    assert.equal(oldSub.status, 'EXPIRED');

    // 7. Test upgrade coupon
    // Revert subscription back to standard in the DB
    await prisma.wholesalerSubscription.deleteMany({ where: { wholesalerId } });
    await prisma.subscriptionPayment.deleteMany({ where: { wholesalerId } });

    await prisma.wholesalerSubscription.create({
      data: {
        wholesalerId,
        planId: standardPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        durationMonths: 1,
        purchaseMethod: 'RAZORPAY',
        startedAt: periodStart,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    // Create upgrade coupon
    const couponCode = `${tag}-UPGRADE-PROMO`.toUpperCase();
    const createCouponResponse = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: couponCode,
        planId: premiumPlan.id,
        durationDays: 30,
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        isUpgrade: true,
      });

    assert.equal(createCouponResponse.status, 201);
    fixture.couponId = createCouponResponse.body.coupon.id;

    // Validate upgrade coupon
    const validateCouponResponse = await request(app)
      .post('/api/subscriptions/coupons/validate')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ code: couponCode });

    assert.equal(validateCouponResponse.status, 200);
    assert.equal(validateCouponResponse.body.isUpgrade, true);
    assert.equal(validateCouponResponse.body.plan.code, 'PREMIUM');

    // Activate upgrade coupon
    const activateCouponResponse = await request(app)
      .post('/api/subscriptions/coupons/activate')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ code: couponCode });

    assert.equal(activateCouponResponse.status, 200);
    assert.equal(activateCouponResponse.body.subscription.plan.code, 'PREMIUM');

    const dbPremiumSub = await prisma.wholesalerSubscription.findFirst({
      where: { wholesalerId, status: 'ACTIVE' },
      include: { plan: true },
    });
    assert.equal(dbPremiumSub.plan.code, 'PREMIUM');
    assert.equal(dbPremiumSub.isUpgrade, true);
  } finally {
    await cleanupFixture(fixture);
  }
});
