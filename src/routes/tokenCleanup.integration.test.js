import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import { cleanupExpiredTokens } from '../jobs/tokenCleanupJob.js';

test('BlacklistedToken Expiry Cleanup Job Integration Flow', async () => {
  const tag = `test-token-${Date.now()}`;
  const activeTokenStr = `${tag}-active`;
  const expiredTokenStr = `${tag}-expired`;

  // 1. Seed tokens
  await prisma.blacklistedToken.create({
    data: {
      token: activeTokenStr,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in the future
    },
  });

  await prisma.blacklistedToken.create({
    data: {
      token: expiredTokenStr,
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour in the past
    },
  });

  try {
    // 2. Assert both exist in DB initially
    const activeBefore = await prisma.blacklistedToken.findUnique({
      where: { token: activeTokenStr },
    });
    const expiredBefore = await prisma.blacklistedToken.findUnique({
      where: { token: expiredTokenStr },
    });

    assert.ok(activeBefore, 'Active token should exist in database before cleanup');
    assert.ok(expiredBefore, 'Expired token should exist in database before cleanup');

    // 3. Run cleanup job
    const deletedCount = await cleanupExpiredTokens();
    assert.ok(deletedCount >= 1, 'Cleanup job should report deleting at least one token');

    // 4. Assert expired is deleted, and active is preserved
    const activeAfter = await prisma.blacklistedToken.findUnique({
      where: { token: activeTokenStr },
    });
    const expiredAfter = await prisma.blacklistedToken.findUnique({
      where: { token: expiredTokenStr },
    });

    assert.ok(activeAfter, 'Active token should be preserved after cleanup');
    assert.ok(!expiredAfter, 'Expired token should be deleted after cleanup');
  } finally {
    // 5. Cleanup test data
    await prisma.blacklistedToken.deleteMany({
      where: {
        token: {
          in: [activeTokenStr, expiredTokenStr],
        },
      },
    });
  }
});
