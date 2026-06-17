import express from 'express';
import {
  createSubscriptionCheckout,
  getSubscriptionPayments,
  getSubscriptionPlans,
  getSubscriptionSummary,
  startSubscriptionTrial,
  verifySubscriptionCheckout,
} from '../controllers/subscriptionController.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(requireWholesaler);

router.get('/plans', getSubscriptionPlans);
router.get('/me', getSubscriptionSummary);
router.get('/payments', getSubscriptionPayments);
router.post('/checkout', createSubscriptionCheckout);
router.post('/verify', verifySubscriptionCheckout);
router.post('/trial/start', startSubscriptionTrial);

export default router;
