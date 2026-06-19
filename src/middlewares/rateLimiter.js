import rateLimit from 'express-rate-limit';

// Global rate limiter to prevent general spam/DDoS
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication rate limiter for register/login routes
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many authentication attempts, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Scanning rate limiter to restrict high-cost AI operations
export const scanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many scans. Please wait a minute before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
