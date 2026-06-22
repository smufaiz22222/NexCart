import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import {
  sendWelcomeEmail,
  sendVerificationOtp,
  sendPasswordResetOtp,
  checkOtpRateLimit,
  logSecurityAudit,
  dispatchEmailAsync,
} from '../services/emailService.js';
import {
  normalizeEmail,
  validateRegistrationPayload,
  validateEmail,
  validatePassword,
} from '../utils/authValidation.js';
import {
  buildWholesalerAccessSummary,
  ensureDefaultSubscriptionPlans,
  checkAndExpireSubscription,
} from '../services/subscriptionService.js';

const isUniqueEmailConstraintError = (error) => error?.code === 'P2002';

export const register = async (req, res) => {
  try {
    const validation = validateRegistrationPayload(req.body || {});
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const { name, email, password, role, businessName, businessPhone, taxId, businessAddress } =
      validation.value;

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const pendingRegistration = {
      name,
      email,
      password: hashedPassword,
      role,
      businessName,
      businessPhone,
      taxId: taxId || null,
      businessAddress,
    };

    const otp = await generateAndSaveOtp(email, 'VERIFICATION', pendingRegistration);
    dispatchEmailAsync(() => sendVerificationOtp(email, otp));

    if (role === 'WHOLESALER') {
      return res.status(201).json({
        message:
          'Application submitted. Please verify your email using the OTP sent to your inbox.',
        applicationSubmitted: true,
        email,
      });
    }

    res.status(201).json({
      message: 'Verification code sent. Please verify your email to complete registration.',
      email,
    });
  } catch (error) {
    if (isUniqueEmailConstraintError(error)) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    console.error('REGISTER ERROR:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

export const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};

    if (!email || !password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: {
        wholesalerProfile: {
          include: {
            subscriptions: {
              include: { plan: true },
              orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
            },
          },
        },
        businessProfile: true,
      },
    });

    if (!user) {
      // Check if there is a pending registration
      const pendingOtp = await prisma.emailOTP.findUnique({
        where: {
          email_purpose: { email, purpose: 'VERIFICATION' },
        },
      });
      if (pendingOtp && pendingOtp.pendingData) {
        const reg = JSON.parse(pendingOtp.pendingData);
        const isMatch = await bcrypt.compare(password, reg.password);
        if (isMatch) {
          logSecurityAudit('LOGIN_BLOCKED_UNVERIFIED', { email });
          return res
            .status(403)
            .json({ error: 'Please verify your email address before logging in.' });
        }
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
      logSecurityAudit('LOGIN_BLOCKED_UNVERIFIED', { email });
      return res.status(403).json({ error: 'Please verify your email address before logging in.' });
    }

    let wholesalerProfile = user.wholesalerProfile;
    if (user.role === 'WHOLESALER' && wholesalerProfile) {
      wholesalerProfile = await checkAndExpireSubscription(prisma, wholesalerProfile);
      user.wholesalerProfile = wholesalerProfile;
    }

    const wholesalerSummary =
      user.role === 'WHOLESALER' && user.wholesalerProfile
        ? buildWholesalerAccessSummary(user.wholesalerProfile)
        : null;

    const payload = {
      userId: user.id,
      role: user.role,
      ...(user.role === 'WHOLESALER' && user.wholesalerProfile
        ? { wholesalerId: user.wholesalerProfile.id }
        : {}),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        businessName: user.wholesalerProfile?.businessName || null,
        subscription: wholesalerSummary?.subscription || null,
        featureAccess: wholesalerSummary?.featureAccess || null,
        wholesalerProfile: user.wholesalerProfile
          ? {
              id: user.wholesalerProfile.id,
              businessName: user.wholesalerProfile.businessName,
              businessPhone: user.wholesalerProfile.businessPhone,
              taxId: user.wholesalerProfile.taxId,
              businessAddress: user.wholesalerProfile.businessAddress,
              onboardingStatus: wholesalerSummary?.onboardingStatus,
              rejectionReason: wholesalerSummary?.rejectionReason || null,
              trialStartedAt: wholesalerSummary?.trialState?.startedAt || null,
              trialEndsAt: wholesalerSummary?.trialState?.endsAt || null,
              trialUsedAt: wholesalerSummary?.trialState?.usedAt || null,
              bankName: user.wholesalerProfile.bankName || null,
              bankAccountNo: user.wholesalerProfile.bankAccountNo || null,
              bankIfsc: user.wholesalerProfile.bankIfsc || null,
              upiId: user.wholesalerProfile.upiId || null,
              payoutBankName: user.wholesalerProfile.payoutBankName || null,
              payoutBankAccountNo: user.wholesalerProfile.payoutBankAccountNo || null,
              payoutBankIfsc: user.wholesalerProfile.payoutBankIfsc || null,
              payoutUpiId: user.wholesalerProfile.payoutUpiId || null,
              useSameAsB2B: user.wholesalerProfile.useSameAsB2B ?? true,
            }
          : null,
        businessProfile: user.businessProfile || null,
      },
      onboardingStatus: wholesalerSummary?.onboardingStatus || null,
      featureAccess: wholesalerSummary?.featureAccess || null,
      subscription: wholesalerSummary?.subscription || null,
      trialState: wholesalerSummary?.trialState || null,
      supportContact: wholesalerSummary?.supportContact || null,
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wholesalerProfile: {
          include: {
            subscriptions: {
              include: { plan: true },
              orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
            },
          },
        },
        businessProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let wholesalerProfile = user.wholesalerProfile;
    if (user.role === 'WHOLESALER' && wholesalerProfile) {
      wholesalerProfile = await checkAndExpireSubscription(prisma, wholesalerProfile);
      user.wholesalerProfile = wholesalerProfile;
    }

    const wholesalerSummary =
      user.role === 'WHOLESALER' && user.wholesalerProfile
        ? buildWholesalerAccessSummary(user.wholesalerProfile)
        : null;

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        businessName: user.wholesalerProfile?.businessName || null,
        subscription: wholesalerSummary?.subscription || null,
        featureAccess: wholesalerSummary?.featureAccess || null,
        wholesalerProfile: user.wholesalerProfile
          ? {
              id: user.wholesalerProfile.id,
              businessName: user.wholesalerProfile.businessName,
              businessPhone: user.wholesalerProfile.businessPhone,
              taxId: user.wholesalerProfile.taxId,
              businessAddress: user.wholesalerProfile.businessAddress,
              onboardingStatus: wholesalerSummary?.onboardingStatus,
              rejectionReason: wholesalerSummary?.rejectionReason || null,
              trialStartedAt: wholesalerSummary?.trialState?.startedAt || null,
              trialEndsAt: wholesalerSummary?.trialState?.endsAt || null,
              trialUsedAt: wholesalerSummary?.trialState?.usedAt || null,
              bankName: user.wholesalerProfile.bankName || null,
              bankAccountNo: user.wholesalerProfile.bankAccountNo || null,
              bankIfsc: user.wholesalerProfile.bankIfsc || null,
              upiId: user.wholesalerProfile.upiId || null,
              payoutBankName: user.wholesalerProfile.payoutBankName || null,
              payoutBankAccountNo: user.wholesalerProfile.payoutBankAccountNo || null,
              payoutBankIfsc: user.wholesalerProfile.payoutBankIfsc || null,
              payoutUpiId: user.wholesalerProfile.payoutUpiId || null,
              useSameAsB2B: user.wholesalerProfile.useSameAsB2B ?? true,
            }
          : null,
        businessProfile: user.businessProfile || null,
      },
    });
  } catch (error) {
    console.error('GET PROFILE ERROR:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 60 * 60 * 1000);

    await prisma.blacklistedToken.upsert({
      where: { token },
      update: {},
      create: {
        token,
        expiresAt,
      },
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('LOGOUT ERROR:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, currentPassword, newPassword } = req.body || {};

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wholesalerProfile: {
          include: {
            subscriptions: {
              include: { plan: true },
              orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
            },
          },
        },
        businessProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updateData.name = trimmedName;
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ error: 'Email cannot be empty' });
      }
      if (!validateEmail(normalizedEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      if (normalizedEmail !== user.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existingEmail) {
          return res.status(400).json({ error: 'Email is already in use by another account' });
        }
        updateData.email = normalizedEmail;
      }
    }

    if (newPassword !== undefined && newPassword !== '') {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedNewPassword;
    }

    if (Object.keys(updateData).length > 0) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          wholesalerProfile: {
            include: {
              subscriptions: {
                include: { plan: true },
                orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
              },
            },
          },
          businessProfile: true,
        },
      });

      let wholesalerProfile = updatedUser.wholesalerProfile;
      if (updatedUser.role === 'WHOLESALER' && wholesalerProfile) {
        wholesalerProfile = await checkAndExpireSubscription(prisma, wholesalerProfile);
        updatedUser.wholesalerProfile = wholesalerProfile;
      }

      const wholesalerSummary =
        updatedUser.role === 'WHOLESALER' && updatedUser.wholesalerProfile
          ? buildWholesalerAccessSummary(updatedUser.wholesalerProfile)
          : null;

      return res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          createdAt: updatedUser.createdAt,
          businessName: updatedUser.wholesalerProfile?.businessName || null,
          subscription: wholesalerSummary?.subscription || null,
          featureAccess: wholesalerSummary?.featureAccess || null,
          wholesalerProfile: updatedUser.wholesalerProfile
            ? {
                id: updatedUser.wholesalerProfile.id,
                businessName: updatedUser.wholesalerProfile.businessName,
                businessPhone: updatedUser.wholesalerProfile.businessPhone,
                taxId: updatedUser.wholesalerProfile.taxId,
                businessAddress: updatedUser.wholesalerProfile.businessAddress,
                onboardingStatus: wholesalerSummary?.onboardingStatus,
                rejectionReason: wholesalerSummary?.rejectionReason || null,
                trialStartedAt: wholesalerSummary?.trialState?.startedAt || null,
                trialEndsAt: wholesalerSummary?.trialState?.endsAt || null,
                trialUsedAt: wholesalerSummary?.trialState?.usedAt || null,
                bankName: updatedUser.wholesalerProfile.bankName || null,
                bankAccountNo: updatedUser.wholesalerProfile.bankAccountNo || null,
                bankIfsc: updatedUser.wholesalerProfile.bankIfsc || null,
                upiId: updatedUser.wholesalerProfile.upiId || null,
                payoutBankName: updatedUser.wholesalerProfile.payoutBankName || null,
                payoutBankAccountNo: updatedUser.wholesalerProfile.payoutBankAccountNo || null,
                payoutBankIfsc: updatedUser.wholesalerProfile.payoutBankIfsc || null,
                payoutUpiId: updatedUser.wholesalerProfile.payoutUpiId || null,
                useSameAsB2B: updatedUser.wholesalerProfile.useSameAsB2B ?? true,
              }
            : null,
          businessProfile: updatedUser.businessProfile || null,
        },
      });
    }

    let wholesalerProfile = user.wholesalerProfile;
    if (user.role === 'WHOLESALER' && wholesalerProfile) {
      wholesalerProfile = await checkAndExpireSubscription(prisma, wholesalerProfile);
      user.wholesalerProfile = wholesalerProfile;
    }

    const wholesalerSummary =
      user.role === 'WHOLESALER' && user.wholesalerProfile
        ? buildWholesalerAccessSummary(user.wholesalerProfile)
        : null;

    res.status(200).json({
      message: 'No changes made',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        businessName: user.wholesalerProfile?.businessName || null,
        subscription: wholesalerSummary?.subscription || null,
        featureAccess: wholesalerSummary?.featureAccess || null,
        wholesalerProfile: user.wholesalerProfile
          ? {
              id: user.wholesalerProfile.id,
              businessName: user.wholesalerProfile.businessName,
              businessPhone: user.wholesalerProfile.businessPhone,
              taxId: user.wholesalerProfile.taxId,
              businessAddress: user.wholesalerProfile.businessAddress,
              onboardingStatus: wholesalerSummary?.onboardingStatus,
              rejectionReason: wholesalerSummary?.rejectionReason || null,
              trialStartedAt: wholesalerSummary?.trialState?.startedAt || null,
              trialEndsAt: wholesalerSummary?.trialState?.endsAt || null,
              trialUsedAt: wholesalerSummary?.trialState?.usedAt || null,
              bankName: user.wholesalerProfile.bankName || null,
              bankAccountNo: user.wholesalerProfile.bankAccountNo || null,
              bankIfsc: user.wholesalerProfile.bankIfsc || null,
              upiId: user.wholesalerProfile.upiId || null,
              payoutBankName: user.wholesalerProfile.payoutBankName || null,
              payoutBankAccountNo: user.wholesalerProfile.payoutBankAccountNo || null,
              payoutBankIfsc: user.wholesalerProfile.payoutBankIfsc || null,
              payoutUpiId: user.wholesalerProfile.payoutUpiId || null,
              useSameAsB2B: user.wholesalerProfile.useSameAsB2B ?? true,
            }
          : null,
        businessProfile: user.businessProfile || null,
      },
    });
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateAndSaveOtp = async (email, purpose, pendingData = null) => {
  await checkOtpRateLimit(email);

  const otp = generateOtp();
  const saltRounds = 10;
  const otpHash = await bcrypt.hash(otp, saltRounds);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

  const pendingDataStr = pendingData ? JSON.stringify(pendingData) : null;

  await prisma.emailOTP.upsert({
    where: {
      email_purpose: { email, purpose },
    },
    update: {
      otpHash,
      attempts: 0,
      expiresAt,
      createdAt: new Date(),
      pendingData: pendingDataStr,
    },
    create: {
      email,
      otpHash,
      purpose,
      expiresAt,
      pendingData: pendingDataStr,
    },
  });

  logSecurityAudit('OTP_GENERATED', { email, purpose });
  return otp;
};

export const sendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { purpose = 'VERIFICATION' } = req.body || {};

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    if (!['VERIFICATION', 'PASSWORD_RESET'].includes(purpose)) {
      return res.status(400).json({ error: 'Invalid OTP purpose.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    let pendingData = null;

    if (purpose === 'VERIFICATION') {
      if (user) {
        if (user.emailVerified) {
          return res.status(400).json({ error: 'Email is already verified.' });
        }
      } else {
        const existingOtp = await prisma.emailOTP.findUnique({
          where: {
            email_purpose: { email, purpose },
          },
        });
        if (!existingOtp || !existingOtp.pendingData) {
          return res.status(400).json({ error: 'No pending registration found for this email.' });
        }
        pendingData = JSON.parse(existingOtp.pendingData);
      }
    } else {
      if (!user) {
        return res.status(404).json({ error: 'User with this email does not exist.' });
      }
    }

    const otp = await generateAndSaveOtp(email, purpose, pendingData);

    if (purpose === 'VERIFICATION') {
      dispatchEmailAsync(() => sendVerificationOtp(email, otp));
    } else {
      dispatchEmailAsync(() => sendPasswordResetOtp(email, otp));
    }

    res.status(200).json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('SEND OTP ERROR:', error);
    const isRateLimit = error.message.includes('Limit') || error.message.includes('wait');
    res.status(isRateLimit ? 429 : 500).json({ error: error.message || 'Failed to send OTP.' });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { otp, purpose = 'VERIFICATION' } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    if (!['VERIFICATION', 'PASSWORD_RESET'].includes(purpose)) {
      return res.status(400).json({ error: 'Invalid OTP purpose.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const otpRecord = await tx.emailOTP.findUnique({
        where: {
          email_purpose: { email, purpose },
        },
      });

      if (!otpRecord) {
        throw new Error('OTP not found or expired.');
      }

      if (new Date() > new Date(otpRecord.expiresAt)) {
        await tx.emailOTP.delete({
          where: { id: otpRecord.id },
        });
        logSecurityAudit('OTP_EXPIRED', { email, purpose });
        throw new Error('OTP has expired. Please request a new one.');
      }

      const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);

      if (!isMatch) {
        const nextAttempts = otpRecord.attempts + 1;
        if (nextAttempts >= 5) {
          await tx.emailOTP.delete({
            where: { id: otpRecord.id },
          });
          logSecurityAudit('OTP_LOCKOUT', { email, purpose });
          throw new Error('Too many failed attempts. Please request a new OTP.');
        }

        await tx.emailOTP.update({
          where: { id: otpRecord.id },
          data: { attempts: nextAttempts },
        });

        logSecurityAudit('OTP_VERIFICATION_FAILED', { email, purpose, attempts: nextAttempts });
        throw new Error('Invalid OTP code. Please try again.');
      }

      await tx.emailOTP.delete({
        where: { id: otpRecord.id },
      });

      if (purpose === 'VERIFICATION') {
        const existingUser = await tx.user.findFirst({
          where: {
            email: {
              equals: email,
              mode: 'insensitive',
            },
          },
        });
        if (existingUser) {
          throw new Error('Email is already in use.');
        }

        let updatedUser;
        if (otpRecord.pendingData) {
          const reg = JSON.parse(otpRecord.pendingData);
          if (reg.role === 'WHOLESALER') {
            await ensureDefaultSubscriptionPlans(tx);
            updatedUser = await tx.user.create({
              data: {
                name: reg.name,
                email: reg.email,
                password: reg.password,
                role: 'WHOLESALER',
                emailVerified: true,
                wholesalerProfile: {
                  create: {
                    businessName: reg.businessName,
                    businessPhone: reg.businessPhone,
                    taxId: reg.taxId,
                    businessAddress: reg.businessAddress,
                    onboardingStatus: 'APPLIED',
                    reviewSubmittedAt: new Date(),
                  },
                },
              },
              include: { wholesalerProfile: true },
            });
          } else {
            updatedUser = await tx.user.create({
              data: {
                name: reg.name,
                email: reg.email,
                password: reg.password,
                role: 'CUSTOMER',
                emailVerified: true,
              },
            });
          }
        } else {
          // Fallback legacy verification
          updatedUser = await tx.user.update({
            where: { email },
            data: { emailVerified: true },
          });
        }

        logSecurityAudit('OTP_VERIFICATION_SUCCESS', { email, purpose });

        dispatchEmailAsync(() => sendWelcomeEmail(updatedUser));

        return { success: true, verified: true };
      } else {
        const resetToken = jwt.sign({ email, purpose: 'PASSWORD_RESET' }, process.env.JWT_SECRET, {
          expiresIn: '10m',
        });
        logSecurityAudit('OTP_VERIFICATION_SUCCESS', { email, purpose });
        return { success: true, resetToken };
      }
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('VERIFY OTP ERROR:', error);
    const isClientErr =
      error.message.includes('expired') ||
      error.message.includes('Invalid') ||
      error.message.includes('Too many') ||
      error.message.includes('found');
    res.status(isClientErr ? 400 : 500).json({ error: error.message });
  }
};

export const forgotPasswordSendOtp = async (req, res) => {
  if (req.body) {
    req.body.purpose = 'PASSWORD_RESET';
  } else {
    req.body = { purpose: 'PASSWORD_RESET' };
  }
  return sendOtp(req, res);
};

export const forgotPasswordVerifyOtp = async (req, res) => {
  if (req.body) {
    req.body.purpose = 'PASSWORD_RESET';
  } else {
    req.body = { purpose: 'PASSWORD_RESET' };
  }
  return verifyOtp(req, res);
};

export const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body || {};

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, resetToken, and newPassword are required.' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      logSecurityAudit('PASSWORD_RESET_FAILED', { email, reason: 'Token verification failed' });
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    if (
      decoded.purpose !== 'PASSWORD_RESET' ||
      normalizeEmail(decoded.email) !== normalizeEmail(email)
    ) {
      logSecurityAudit('PASSWORD_RESET_FAILED', { email, reason: 'Token payload mismatch' });
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email: normalizeEmail(email) },
      data: { password: hashedPassword },
    });

    logSecurityAudit('PASSWORD_RESET_COMPLETED', { email });
    res
      .status(200)
      .json({ message: 'Password reset successful. Please log in with your new password.' });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
};
