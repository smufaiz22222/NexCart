import { prisma } from '../config/db.js';

export const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.blacklistedToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      console.log(
        `[TokenCleanup] Successfully deleted ${result.count} expired blacklisted token(s).`
      );
    }
    return result.count;
  } catch (error) {
    console.error('[TokenCleanup] Error cleaning up expired tokens:', error);
    return 0;
  }
};

export const startTokenCleanupInterval = (intervalMs = 24 * 60 * 60 * 1000) => {
  // Run once immediately on startup
  cleanupExpiredTokens();

  // Set up periodic interval execution
  const intervalId = setInterval(cleanupExpiredTokens, intervalMs);

  // Unref the interval so the process can exit cleanly during tests or shutdowns
  if (intervalId.unref) {
    intervalId.unref();
  }

  return intervalId;
};
