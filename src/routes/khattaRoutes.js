import express from 'express';
import { processKhattaImage, saveKhattaEntries } from '../controllers/khattaController.js';
import {
  authenticate,
  requireWholesaler,
  requireWholesalerFeature,
} from '../middlewares/authMiddleware.js';
import { scanLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.use(authenticate);
router.use(requireWholesaler);
router.use(requireWholesalerFeature('khatta'));

router.post('/process', scanLimiter, processKhattaImage);
router.post('/save', saveKhattaEntries);

export default router;
