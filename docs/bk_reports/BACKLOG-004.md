# BACKLOG-004: Missing Rate Limiting on Authentication & Scanners

## Issue Description

Public-facing endpoints such as registration (`/api/auth/register`), login (`/api/auth/login`), and the AI Khatta image scanner parser (`/api/khatta/process`) were entirely unprotected by rate limiters. This exposed the server to password brute-forcing, script resource consumption, DDoS attacks, and high costs from Google Gemini API spam.

---

## Resolution

Installed `express-rate-limit` and configured a multi-tiered rate limiting middleware solution:

1. **Global Rate Limiting**: Added `globalLimiter` in `src/app.js` to cap requests at 100 requests per minute per IP address.
2. **Authentication Route Protection**: Applied `authLimiter` to register and login routes to enforce a strict limit of 5 requests per minute per IP.
3. **AI Scan Protection**: Applied `scanLimiter` to the `/api/khatta/process` endpoint to restrict expensive AI OCR scans to 5 requests per minute.

### Code Implementations

#### [rateLimiter.js](file:///c:/Users/smufa/Desktop/NexCart_updated/src/middlewares/rateLimiter.js)

```javascript
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
```

---

## Verification

- Verified syntax on all files:
  ```powershell
  node --check src/app.js src/routes/authRoutes.js src/routes/khattaRoutes.js src/middlewares/rateLimiter.js
  ```
- Ran backend unit/integration tests successfully.
