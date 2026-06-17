import express from 'express';
import { processKhattaImage, saveKhattaEntries } from '../controllers/khattaController.js';
import {
  authenticate,
  requireWholesaler,
  requireWholesalerFeature,
} from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(requireWholesaler);
router.use(requireWholesalerFeature('khatta'));

router.post('/process', processKhattaImage);
router.post('/save', saveKhattaEntries);

export default router;
