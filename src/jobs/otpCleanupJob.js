import { prisma } from '../config/db.js';

export const cleanupExpiredOtps = async () => {
  try {
    const result = await prisma.emailOTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      console.log(`[OtpCleanup] Successfully deleted ${result.count} expired OTP record(s).`);
    }
    return result.count;
  } catch (error) {
    console.error('[OtpCleanup] Error cleaning up expired OTPs:', error);
    return 0;
  }
};

export const startOtpCleanupInterval = (intervalMs = 60 * 60 * 1000) => {
  // Run once immediately on startup
  cleanupExpiredOtps();

  // Set up periodic interval execution (default every 1 hour)
  const intervalId = setInterval(cleanupExpiredOtps, intervalMs);

  // Unref the interval so the process can exit cleanly during tests or shutdowns
  if (intervalId.unref) {
    intervalId.unref();
  }

  return intervalId;
};
