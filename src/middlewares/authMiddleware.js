import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import {
  buildWholesalerAccessSummary,
  assertFeatureAccess,
  assertOperationalWholesaler,
  checkAndExpireSubscription,
} from '../services/subscriptionService.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const blacklisted = await prisma.blacklistedToken.findUnique({
      where: { token },
    });
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        wholesalerProfile: {
          include: {
            subscriptions: {
              include: { plan: true },
              orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
            },
          },
        },
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ error: 'User for this token no longer exists. Please log in again.' });
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

    req.user = {
      userId: user.id,
      role: user.role,
      wholesalerId: user.wholesalerProfile?.id ?? null,
      wholesalerProfile: user.wholesalerProfile || null,
      onboardingStatus: wholesalerSummary?.onboardingStatus || null,
      featureAccess: wholesalerSummary?.featureAccess || null,
      subscription: wholesalerSummary?.subscription || null,
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    console.error('AUTH ERROR:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireRoles =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };

export const requireWholesaler = (req, res, next) => {
  if (req.user.role !== 'WHOLESALER') {
    return res.status(403).json({ error: 'Access denied. Wholesaler account required.' });
  }

  if (!req.user.wholesalerId) {
    return res.status(400).json({ error: 'Tenant context missing.' });
  }

  next();
};

export const requireOperationalWholesaler = (req, res, next) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerProfile) {
      return res.status(403).json({ error: 'Access denied. Wholesaler account required.' });
    }

    assertOperationalWholesaler(req.user.wholesalerProfile);
    next();
  } catch (error) {
    return res.status(error.statusCode || 403).json({
      error: error.message || 'Wholesaler account is not operational yet.',
      onboardingStatus: req.user.onboardingStatus || null,
    });
  }
};

export const requireWholesalerFeature = (feature) => (req, res, next) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerProfile) {
      return res.status(403).json({ error: 'Access denied. Wholesaler account required.' });
    }

    assertFeatureAccess(req.user.wholesalerProfile, feature);
    next();
  } catch (error) {
    return res.status(error.statusCode || 403).json({
      error: error.message || `Feature ${feature} is not available on this subscription.`,
      feature,
      featureAccess: req.user.featureAccess || null,
      onboardingStatus: req.user.onboardingStatus || null,
    });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Access denied. Super Admin only.' });
  }
  next();
};

export const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next();
    }

    const blacklisted = await prisma.blacklistedToken.findUnique({
      where: { token },
    });
    if (blacklisted) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { wholesalerProfile: true },
    });

    if (user) {
      req.user = {
        userId: user.id,
        role: user.role,
        wholesalerId: user.wholesalerProfile?.id ?? null,
      };
    }
    next();
  } catch {
    // Treat invalid/expired token as guest instead of crashing/blocking
    next();
  }
};
