import express from 'express';
import {
  getPopularRecommendations,
  getRecommendationAnalytics,
  getRecommendationEvaluation,
  getSimilarProducts,
  getUserRecommendations
} from '../controllers/recommendationController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.get('/products/:id/similar', getSimilarProducts);
router.get('/user', getUserRecommendations);
router.get('/popular', getPopularRecommendations);
router.get('/analytics', getRecommendationAnalytics);
router.get('/evaluation', getRecommendationEvaluation);

export default router;
