import express from 'express';
import { getDailyDeals } from '../controllers/dealsController.js';

const router = express.Router();

router.get('/daily', getDailyDeals);

export default router;
