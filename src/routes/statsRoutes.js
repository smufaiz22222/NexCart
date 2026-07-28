import express from 'express';
import {
  authenticate,
  requireWholesaler,
  requireWholesalerFeature,
} from '../middlewares/authMiddleware.js';
import {
  getWholesalerSummary,
  getAdvisorContext,
  getAdvancedSummary,
  getAnalyticsOverview,
} from '../controllers/statsController.js';

const router = express.Router();

router.get('/wholesaler-summary', authenticate, requireWholesaler, getWholesalerSummary);
router.get('/advisor-context', authenticate, requireWholesaler, getAdvisorContext);
router.get('/advanced-summary', authenticate, requireWholesaler, getAdvancedSummary);
router.get(
  '/analytics-overview',
  authenticate,
  requireWholesaler,
  requireWholesalerFeature('analytics'),
  getAnalyticsOverview
);

export default router;
