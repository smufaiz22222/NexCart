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
  resetRecommendationEvaluation,
} from '../controllers/recommendationController.js';
import {
  authenticate,
  optionalAuthenticate,
  requireRoles,
  requireWholesalerFeature,
} from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/products/:id/similar', optionalAuthenticate, getSimilarProducts);
router.get('/user', authenticate, getUserRecommendations);
router.get('/popular', optionalAuthenticate, getPopularRecommendations);
router.get(
  '/analytics',
  authenticate,
  requireRoles('WHOLESALER', 'SUPER_ADMIN'),
  (req, res, next) =>
    req.user.role === 'WHOLESALER'
      ? requireWholesalerFeature('recommendations')(req, res, next)
      : next(),
  getRecommendationAnalytics
);
router.get(
  '/health',
  authenticate,
  requireRoles('WHOLESALER', 'SUPER_ADMIN'),
  (req, res, next) =>
    req.user.role === 'WHOLESALER'
      ? requireWholesalerFeature('recommendations')(req, res, next)
      : next(),
  getRecommendationHealth
);
router.get('/evaluation', authenticate, requireRoles('SUPER_ADMIN'), getRecommendationEvaluation);
router.post(
  '/maintenance/clear-logs',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  clearRecommendationLogs
);
router.post(
  '/maintenance/reset-evaluation',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  resetRecommendationEvaluation
);
router.post(
  '/maintenance/reset-analytics',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  resetRecommendationAnalytics
);

export default router;
