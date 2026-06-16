import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { wholesalerProfile: true },
    });

    if (!user) {
      return res
        .status(401)
        .json({ error: 'User for this token no longer exists. Please log in again.' });
    }

    req.user = {
      userId: user.id,
      role: user.role,
      wholesalerId: user.wholesalerProfile?.id ?? null,
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
  } catch (error) {
    // Treat invalid/expired token as guest instead of crashing/blocking
    next();
  }
};

