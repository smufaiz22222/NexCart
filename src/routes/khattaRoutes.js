import express from 'express';
import {
  processKhattaImage,
  saveKhattaEntries,
  processPurchaseInvoice,
} from '../controllers/khattaController.js';
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
router.post('/process-purchase', scanLimiter, processPurchaseInvoice);
router.post('/save', saveKhattaEntries);

export default router;
