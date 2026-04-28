import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log("Authorization Header:", req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    console.log("hi")
    req.user = decoded; 
    console.log("Decoded Token:", decoded);
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
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
