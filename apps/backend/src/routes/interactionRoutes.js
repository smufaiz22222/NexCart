import express from 'express';
import { createInteraction, createRecommendationEvent } from '../controllers/interactionController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.post('/', createInteraction);
router.post('/recommendation-event', createRecommendationEvent);

export default router;
