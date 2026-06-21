import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
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

    if (role === 'WHOLESALER') {
      await ensureDefaultSubscriptionPlans(prisma);
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'WHOLESALER',
          wholesalerProfile: {
            create: {
              businessName,
              businessPhone,
              taxId: taxId || null,
              businessAddress,
              onboardingStatus: 'APPLIED',
              reviewSubmittedAt: new Date(),
            },
          },
        },
        include: { wholesalerProfile: true },
      });

      return res.status(201).json({
        message: 'Application submitted. Our team will review your wholesaler profile shortly.',
        applicationSubmitted: true,
      });
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'CUSTOMER',
        },
      });
    }

    res.status(201).json({ message: 'Registration successful. Please log in.' });
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
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
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
