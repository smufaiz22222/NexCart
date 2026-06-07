import express from 'express';
import {
  clearRecommendationLogs,
  getPopularRecommendations,
  getRecommendationAnalytics,
  getRecommendationEvaluation,
  getRecommendationHealth,
  getSimilarProducts,
  getUserRecommendations,
  resetRecommendationAnalytics,
  resetRecommendationEvaluation
} from '../controllers/recommendationController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.get('/products/:id/similar', getSimilarProducts);
router.get('/user', getUserRecommendations);
router.get('/popular', getPopularRecommendations);
router.get('/analytics', requireRoles('WHOLESALER', 'SUPER_ADMIN'), getRecommendationAnalytics);
router.get('/health', requireRoles('WHOLESALER', 'SUPER_ADMIN'), getRecommendationHealth);
router.get('/evaluation', requireRoles('SUPER_ADMIN'), getRecommendationEvaluation);
router.post('/maintenance/clear-logs', requireRoles('SUPER_ADMIN'), clearRecommendationLogs);
router.post('/maintenance/reset-evaluation', requireRoles('SUPER_ADMIN'), resetRecommendationEvaluation);
router.post('/maintenance/reset-analytics', requireRoles('SUPER_ADMIN'), resetRecommendationAnalytics);

export default router;
