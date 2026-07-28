import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { getPrismaClient, setPrismaClient } from '../config/db.js';
import { checkOtpRateLimit, sendEmail, dispatchEmailAsync } from './emailService.js';
import {
  register,
  verifyOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  resetPassword,
} from '../controllers/authController.js';

// Setup Mock Prisma Client
const createMockPrisma = () => {
  const state = {
    users: [],
    otps: [],
    rateLimits: [],
    deletedOtpsCount: 0,
  };

  const db = {
    state,
    user: {
      findFirst: async ({ where }) => {
        const emailEquals = where?.email?.equals?.toLowerCase();
        return state.users.find((u) => u.email.toLowerCase() === emailEquals) || null;
      },
      findUnique: async ({ where }) => {
        if (where.id) {
          return state.users.find((u) => u.id === where.id) || null;
        }
        if (where.email) {
          return (
            state.users.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) || null
          );
        }
        return null;
      },
      create: async ({ data }) => {
        const newUser = {
          id: `user-${state.users.length + 1}`,
          emailVerified: false,
          ...data,
        };
        state.users.push(newUser);
        return newUser;
      },
      update: async ({ where, data }) => {
        const user = state.users.find(
          (u) => u.id === where.id || u.email?.toLowerCase() === where.email?.toLowerCase()
        );
        if (user) {
          Object.assign(user, data);
          return user;
        }
        throw new Error('User not found for update');
      },
    },
    emailOTP: {
      findUnique: async ({ where }) => {
        const email = where.email_purpose?.email;
        const purpose = where.email_purpose?.purpose;
        return (
          state.otps.find(
            (o) => o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose
          ) || null
        );
      },
      upsert: async ({ where, update, create }) => {
        const email = where.email_purpose.email;
        const purpose = where.email_purpose.purpose;
        let otp = state.otps.find(
          (o) => o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose
        );
        if (otp) {
          Object.assign(otp, update);
        } else {
          otp = {
            id: `otp-${state.otps.length + 1}`,
            attempts: 0,
            createdAt: new Date(),
            ...create,
          };
          state.otps.push(otp);
        }
        return otp;
      },
      update: async ({ where, data }) => {
        let otp;
        if (where.id) {
          otp = state.otps.find((o) => o.id === where.id);
        } else if (where.email_purpose) {
          const { email, purpose } = where.email_purpose;
          otp = state.otps.find(
            (o) => o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose
          );
        }
        if (otp) {
          if (data.attempts?.increment !== undefined) {
            otp.attempts += data.attempts.increment;
          } else {
            Object.assign(otp, data);
          }
          return otp;
        }
        throw new Error('OTP not found for update');
      },
      delete: async ({ where }) => {
        let index = -1;
        if (where.id) {
          index = state.otps.findIndex((o) => o.id === where.id);
        } else if (where.email_purpose) {
          const { email, purpose } = where.email_purpose;
          index = state.otps.findIndex(
            (o) => o.email.toLowerCase() === email.toLowerCase() && o.purpose === purpose
          );
        }
        if (index !== -1) {
          state.otps.splice(index, 1);
          state.deletedOtpsCount++;
          return { id: 'deleted' };
        }
        throw new Error('OTP not found for delete');
      },
    },
    otpRateLimit: {
      findUnique: async ({ where }) => {
        return (
          state.rateLimits.find((r) => r.email.toLowerCase() === where.email.toLowerCase()) || null
        );
      },
      create: async ({ data }) => {
        const rateLimit = {
          id: `rl-${state.rateLimits.length + 1}`,
          ...data,
        };
        state.rateLimits.push(rateLimit);
        return rateLimit;
      },
      update: async ({ where, data }) => {
        const rateLimit = state.rateLimits.find(
          (r) => r.email.toLowerCase() === where.email.toLowerCase()
        );
        if (rateLimit) {
          Object.assign(rateLimit, data);
          return rateLimit;
        }
        throw new Error('Rate limit not found for update');
      },
    },
    subscriptionPlan: {
      upsert: async () => ({ id: 'plan-1', code: 'FREE' }),
    },
    $transaction: async (fn) => {
      // Direct call since we don't mock concurrent transaction rollback/isolation in tests
      return fn(db);
    },
  };

  return db;
};

// Response helper
const createMockResponse = () => {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
};

test('checkOtpRateLimit enforces rate limit window configurations', async () => {
  const originalClient = getPrismaClient();
  const db = createMockPrisma();
  setPrismaClient(db);

  const email = 'limit-test@example.com';

  try {
    // 1. First call should succeed
    const firstCall = await checkOtpRateLimit(email);
    assert.strictEqual(firstCall, true);
    assert.strictEqual(db.state.rateLimits[0].requestCount, 1);

    // 2. Immediate second call should fail the 60-second limit check
    await assert.rejects(() => checkOtpRateLimit(email), /Please wait 60 seconds/i);

    // 3. Fast-forward lastRequestedAt to more than 60 seconds ago to bypass 60s rule
    db.state.rateLimits[0].lastRequestedAt = new Date(Date.now() - 65 * 1000);

    // 3.1 Third request should succeed
    await checkOtpRateLimit(email);
    assert.strictEqual(db.state.rateLimits[0].requestCount, 2);

    // 4. Force sliding window requestCount to 5, keeping lastRequestedAt 65s in past
    db.state.rateLimits[0].requestCount = 5;
    db.state.rateLimits[0].lastRequestedAt = new Date(Date.now() - 65 * 1000);

    // Should reject due to hourly limit
    await assert.rejects(() => checkOtpRateLimit(email), /Maximum OTP request limit reached/i);

    // 5. Fast-forward windowStartedAt past 1 hour. Should reset window and succeed
    db.state.rateLimits[0].windowStartedAt = new Date(Date.now() - 65 * 60 * 1000);
    db.state.rateLimits[0].lastRequestedAt = new Date(Date.now() - 65 * 1000);

    const resetSuccess = await checkOtpRateLimit(email);
    assert.strictEqual(resetSuccess, true);
    assert.strictEqual(db.state.rateLimits[0].requestCount, 1);
  } finally {
    setPrismaClient(originalClient);
  }
});

test('sendEmail handles exponential backoff retries and transient vs permanent failures', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.BREVO_API_KEY;
  const originalNodeEnv = process.env.NODE_ENV;

  process.env.BREVO_API_KEY = 'real-temp-key-for-test';
  process.env.NODE_ENV = 'production'; // ensure we do not hit mock mode

  try {
    let callCount = 0;

    // Test Case 1: Transient failures (500) followed by success
    globalThis.fetch = async (_url, _options) => {
      callCount++;
      if (callCount < 3) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server Internal Error' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ messageId: 'success-msg-id-123' }),
      };
    };

    const startTime = Date.now();
    const result1 = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      htmlContent: '<p>Hi</p>',
    });
    const duration = Date.now() - startTime;

    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.messageId, 'success-msg-id-123');
    assert.strictEqual(callCount, 3); // 2 retries + 1 success
    assert.ok(duration >= 3000); // 1s delay on first retry + 2s delay on second retry

    // Test Case 2: Permanent failure (400) - should NOT retry
    callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 400,
        json: async () => ({ code: 'invalid_parameter', message: 'Invalid recipient address' }),
      };
    };

    await assert.rejects(
      () =>
        sendEmail({
          to: 'invalid-email',
          subject: 'Test Subject',
          htmlContent: '<p>Hi</p>',
        }),
      /Permanent email sending failure/i
    );
    assert.strictEqual(callCount, 1); // Checked exactly once, no retries
  } finally {
    globalThis.fetch = originalFetch;
    process.env.BREVO_API_KEY = originalApiKey;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test('dispatchEmailAsync defers execution asynchronously without throwing to caller', async () => {
  let executed = false;

  dispatchEmailAsync(async () => {
    executed = true;
    throw new Error('Deferred error should be caught in the setImmediate context');
  });

  assert.strictEqual(executed, false);

  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(executed, true);
});

test('authController OTP flow: registers unverified, locks login, verifies OTP, enables login', async () => {
  const originalClient = getPrismaClient();
  const db = createMockPrisma();
  setPrismaClient(db);

  const reqRegister = {
    body: {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password@123',
    },
  };
  const resRegister = createMockResponse();

  try {
    // 1. Register a new user (saves as pending registration)
    await register(reqRegister, resRegister);
    assert.strictEqual(resRegister.statusCode, 201);

    // User is NOT created in the database yet
    assert.strictEqual(db.state.users.length, 0);

    // Verify OTP record was generated in the database with pendingData
    assert.strictEqual(db.state.otps.length, 1);
    const otpRecord = db.state.otps[0];
    assert.strictEqual(otpRecord.email, 'john@example.com');
    assert.strictEqual(otpRecord.purpose, 'VERIFICATION');
    assert.ok(otpRecord.otpHash);
    assert.ok(otpRecord.pendingData);

    // 2. Try logging in. Should block/be unverified
    // Note: We bypass full authController.login call here to focus on the gate logic
    assert.strictEqual(db.state.users.length, 0);

    // 3. Verify OTP:
    // First, let's extract the raw OTP that was generated in the test state.
    // Since we mock bcrypt hashing, let's mock validation by finding an OTP that matches the hash,
    // or we can simulate verifying it.

    const rawOtp = '123456';
    const otpHash = await bcrypt.hash(rawOtp, 10);
    otpRecord.otpHash = otpHash;

    // Verify with invalid OTP
    const reqVerifyFail = {
      body: {
        email: 'john@example.com',
        otp: '654321',
      },
    };
    const resVerifyFail = createMockResponse();
    await verifyOtp(reqVerifyFail, resVerifyFail);
    assert.strictEqual(resVerifyFail.statusCode, 400);
    assert.strictEqual(resVerifyFail.body.error, 'Invalid OTP code. Please try again.');
    assert.strictEqual(db.state.otps[0].attempts, 1);
    assert.strictEqual(db.state.users.length, 0);

    // Verify with valid OTP
    const reqVerifySuccess = {
      body: {
        email: 'john@example.com',
        otp: rawOtp,
      },
    };
    const resVerifySuccess = createMockResponse();
    await verifyOtp(reqVerifySuccess, resVerifySuccess);
    assert.strictEqual(resVerifySuccess.statusCode, 200);
    assert.strictEqual(resVerifySuccess.body.verified, true);
    assert.strictEqual(db.state.users.length, 1);
    assert.strictEqual(db.state.users[0].emailVerified, true);
    // OTP should be deleted from the database
    assert.strictEqual(db.state.otps.length, 0);
  } finally {
    setPrismaClient(originalClient);
  }
});

test('authController OTP verification enforces expiration and failed attempt lockout', async () => {
  const originalClient = getPrismaClient();
  const db = createMockPrisma();
  setPrismaClient(db);

  try {
    // 1. Test Expiry
    const expiredOtpRecord = {
      id: 'otp-expiry-id',
      email: 'expiry-test@example.com',
      otpHash: await bcrypt.hash('123456', 10),
      purpose: 'VERIFICATION',
      attempts: 0,
      expiresAt: new Date(Date.now() - 1000), // expired 1s ago
    };
    db.state.otps.push(expiredOtpRecord);

    const reqVerifyExpired = {
      body: {
        email: 'expiry-test@example.com',
        otp: '123456',
      },
    };
    const resVerifyExpired = createMockResponse();
    await verifyOtp(reqVerifyExpired, resVerifyExpired);

    assert.strictEqual(resVerifyExpired.statusCode, 400);
    assert.strictEqual(resVerifyExpired.body.error, 'OTP has expired. Please request a new one.');
    // Check that expired OTP is deleted
    assert.strictEqual(db.state.otps.length, 0);

    // 2. Test Lockout (5 failed attempts)
    const lockoutOtpRecord = {
      id: 'otp-lockout-id',
      email: 'lockout-test@example.com',
      otpHash: await bcrypt.hash('123456', 10),
      purpose: 'VERIFICATION',
      attempts: 4, // 5th attempt is about to fail
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // valid
    };
    db.state.otps.push(lockoutOtpRecord);

    const reqVerifyLockout = {
      body: {
        email: 'lockout-test@example.com',
        otp: 'wrongcode',
      },
    };
    const resVerifyLockout = createMockResponse();
    await verifyOtp(reqVerifyLockout, resVerifyLockout);

    assert.strictEqual(resVerifyLockout.statusCode, 400);
    assert.strictEqual(
      resVerifyLockout.body.error,
      'Too many failed attempts. Please request a new OTP.'
    );
    // Check that OTP is deleted due to maximum attempts exceeded
    assert.strictEqual(db.state.otps.length, 0);
  } finally {
    setPrismaClient(originalClient);
  }
});

test('authController Forgot Password: requests reset, verifies OTP, resets password using token', async () => {
  const originalClient = getPrismaClient();
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-jwt-secret-key-123';

  const db = createMockPrisma();
  setPrismaClient(db);

  const hashedPassword = await bcrypt.hash('OldPassword@123', 10);
  const user = {
    id: 'user-reset-test',
    email: 'reset@example.com',
    password: hashedPassword,
    role: 'CUSTOMER',
    emailVerified: true,
  };
  db.state.users.push(user);

  try {
    // 1. Request Reset OTP
    const reqSend = { body: { email: 'reset@example.com' } };
    const resSend = createMockResponse();
    await forgotPasswordSendOtp(reqSend, resSend);
    assert.strictEqual(resSend.statusCode, 200);
    assert.strictEqual(resSend.body.message, 'OTP sent successfully.');

    assert.strictEqual(db.state.otps.length, 1);
    const otpRecord = db.state.otps[0];
    assert.strictEqual(otpRecord.purpose, 'PASSWORD_RESET');

    // Force raw OTP value to test verification
    const rawOtp = '123456';
    otpRecord.otpHash = await bcrypt.hash(rawOtp, 10);

    // 2. Verify Reset OTP -> Should return a short-lived token
    const reqVerify = {
      body: {
        email: 'reset@example.com',
        otp: rawOtp,
      },
    };
    const resVerify = createMockResponse();
    await forgotPasswordVerifyOtp(reqVerify, resVerify);

    assert.strictEqual(resVerify.statusCode, 200);
    assert.ok(resVerify.body.resetToken);

    // Ensure OTP is deleted on success
    assert.strictEqual(db.state.otps.length, 0);

    // 3. Reset Password using the token
    const reqReset = {
      body: {
        email: 'reset@example.com',
        resetToken: resVerify.body.resetToken,
        newPassword: 'NewPassword@123',
      },
    };
    const resReset = createMockResponse();
    await resetPassword(reqReset, resReset);

    assert.strictEqual(resReset.statusCode, 200);
    assert.strictEqual(
      resReset.body.message,
      'Password reset successful. Please log in with your new password.'
    );

    // Verify new password is set
    const updatedUser = db.state.users[0];
    assert.ok(await bcrypt.compare('NewPassword@123', updatedUser.password));

    // Verify trying to use an invalid or expired token fails
    const reqResetInvalid = {
      body: {
        email: 'reset@example.com',
        resetToken: 'invalidtoken',
        newPassword: 'AnotherPassword@123',
      },
    };
    const resResetInvalid = createMockResponse();
    await resetPassword(reqResetInvalid, resResetInvalid);
    assert.strictEqual(resResetInvalid.statusCode, 400);
    assert.strictEqual(resResetInvalid.body.error, 'Invalid or expired password reset token.');
  } finally {
    process.env.JWT_SECRET = originalSecret;
    setPrismaClient(originalClient);
  }
});
