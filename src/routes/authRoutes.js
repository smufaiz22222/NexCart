import express from 'express';
import {
  register,
  login,
  getProfile,
  logout,
  updateProfile,
  sendOtp,
  verifyOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  resetPassword,
  requestEmailChange,
  verifyOldEmailOtp,
  verifyNewEmailOtp,
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

router.post('/send-otp', authLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/forgot-password-send-otp', authLimiter, forgotPasswordSendOtp);
router.post('/forgot-password-verify-otp', authLimiter, forgotPasswordVerifyOtp);
router.post('/reset-password', authLimiter, resetPassword);

// Email change with dual OTP verification
router.post('/request-email-change', authenticate, authLimiter, requestEmailChange);
router.post('/verify-old-email-otp', authenticate, authLimiter, verifyOldEmailOtp);
router.post('/verify-new-email-otp', authenticate, authLimiter, verifyNewEmailOtp);

export default router;
