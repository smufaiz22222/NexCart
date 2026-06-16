import express from 'express';
import {
  createInteraction,
  createRecommendationEvent,
  createRecommendationEvents,
} from '../controllers/interactionController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.post('/', createInteraction);
router.post('/recommendation-event', createRecommendationEvent);
router.post('/recommendation-events', createRecommendationEvents);

export default router;
