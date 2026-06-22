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

export default router;
