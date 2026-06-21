import express from 'express';
import {
  createInteraction,
  createRecommendationEvent,
  createRecommendationEvents,
  getWishlist,
  toggleWishlist,
} from '../controllers/interactionController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.post('/', createInteraction);
router.post('/recommendation-event', createRecommendationEvent);
router.post('/recommendation-events', createRecommendationEvents);
router.get('/wishlist', getWishlist);
router.post('/wishlist/toggle', toggleWishlist);

export default router;
