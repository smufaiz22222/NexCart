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

const cleanupFixture = async (fixture) => {
  if (!fixture) return;

  const userIds = [
    fixture.wholesalerUserId,
    fixture.adminUserId,
    fixture.extraWholesalerUserId,
  ].filter(Boolean);

  if (fixture.wholesalerId) {
    await prisma.wholesalerSubscription.deleteMany({
      where: { wholesalerId: fixture.wholesalerId },
    });
    await prisma.subscriptionPayment.deleteMany({ where: { wholesalerId: fixture.wholesalerId } });
    await prisma.wholesaler.deleteMany({ where: { id: fixture.wholesalerId } });
  }

  if (fixture.extraWholesalerId) {
    await prisma.wholesalerSubscription.deleteMany({
      where: { wholesalerId: fixture.extraWholesalerId },
    });
    await prisma.subscriptionPayment.deleteMany({
      where: { wholesalerId: fixture.extraWholesalerId },
    });
    await prisma.wholesaler.deleteMany({ where: { id: fixture.extraWholesalerId } });
  }

  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
};

test('Super Admin Stats Overview and Paginated Wholesalers Integration Flow', async () => {
  const tag = `admin-${Date.now()}`;

  // 1. Create a super admin user
  const adminUser = await prisma.user.create({
    data: {
      email: `${tag}-admin@example.com`,
      password: 'password',
      name: 'Super Admin Test',
      role: 'SUPER_ADMIN',
    },
  });

  // 2. Create a pending application wholesaler
  const wholesalerUser = await prisma.user.create({
    data: {
      email: `${tag}-merchant@example.com`,
      password: 'password',
      name: 'Merchant Test',
      role: 'WHOLESALER',
      wholesalerProfile: {
        create: {
          businessName: `${tag} Merchant Shop`,
          onboardingStatus: 'APPLIED',
          reviewSubmittedAt: new Date(),
        },
      },
    },
    include: { wholesalerProfile: true },
  });

  const adminToken = makeToken(adminUser.id, 'SUPER_ADMIN');
  const wholesalerId = wholesalerUser.wholesalerProfile.id;

  const fixture = {
    adminUserId: adminUser.id,
    wholesalerUserId: wholesalerUser.id,
    wholesalerId,
  };

  try {
    // A. Fetch stats initially
    const statsRes1 = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(statsRes1.status, 200);
    assert.ok(statsRes1.body.totals);
    assert.ok(statsRes1.body.charts);
    assert.ok(Array.isArray(statsRes1.body.wholesalers));
    assert.ok(Array.isArray(statsRes1.body.pendingApplications));
    assert.ok(statsRes1.body.totals.pendingApplications >= 1);

    // Verify stats has our pending application
    const hasPending = statsRes1.body.pendingApplications.some((app) => app.id === wholesalerId);
    assert.ok(hasPending, 'Pending application should be present in stats response');

    // B. Test Caching: Request stats again, it should return cached data
    const statsRes2 = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(statsRes2.status, 200);
    // Since it's cached, the exact object layout or counts should match
    assert.deepEqual(statsRes1.body.totals, statsRes2.body.totals);

    // C. Test Invalidation: Mutate wholesaler onboarding status (approve it)
    const approveRes = await request(app)
      .post(`/api/admin/wholesalers/${wholesalerId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(approveRes.status, 200);

    // Fetch stats again. It should be invalidated and show 0 pending applications (or decreased by 1)
    const statsRes3 = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(statsRes3.status, 200);
    const hasPendingAfter = statsRes3.body.pendingApplications.some(
      (app) => app.id === wholesalerId
    );
    assert.ok(
      !hasPendingAfter,
      'Approve action should invalidate cache and reflect updated status'
    );

    // D. Test Paginated Wholesalers
    // Let's create one more wholesaler so we have at least 2 wholesalers for pagination testing
    const extraWholesalerUser = await prisma.user.create({
      data: {
        email: `${tag}-extra@example.com`,
        password: 'password',
        name: 'Extra Merchant Test',
        role: 'WHOLESALER',
        wholesalerProfile: {
          create: {
            businessName: `${tag} Extra Shop`,
            onboardingStatus: 'ACTIVE',
          },
        },
      },
      include: { wholesalerProfile: true },
    });
    fixture.extraWholesalerUserId = extraWholesalerUser.id;
    fixture.extraWholesalerId = extraWholesalerUser.wholesalerProfile.id;

    // Fetch wholesalers with page=1, limit=1
    const listRes1 = await request(app)
      .get('/api/admin/wholesalers?page=1&limit=1')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listRes1.status, 200);
    assert.equal(listRes1.body.limit, 1);
    assert.equal(listRes1.body.page, 1);
    assert.ok(listRes1.body.count >= 2);
    assert.equal(listRes1.body.wholesalers.length, 1);

    // Fetch wholesalers with search parameter
    const listResSearch = await request(app)
      .get(`/api/admin/wholesalers?search=${tag}%20Extra`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listResSearch.status, 200);
    assert.equal(listResSearch.body.wholesalers.length, 1);
    assert.equal(listResSearch.body.wholesalers[0].businessName, `${tag} Extra Shop`);

    // Fetch wholesalers with invalid search
    const listResEmpty = await request(app)
      .get(`/api/admin/wholesalers?search=nonexistent-${tag}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listResEmpty.status, 200);
    assert.equal(listResEmpty.body.wholesalers.length, 0);
  } finally {
    await cleanupFixture(fixture);
  }
});
