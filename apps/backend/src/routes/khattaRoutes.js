import express from 'express';
import { processKhattaImage, saveKhattaEntries } from '../controllers/khattaController.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Only logged-in Wholesalers can use the AI feature
router.use(authenticate);
router.use(requireWholesaler);

// 🟢 POST: Send image to Gemini AI
router.post('/process', processKhattaImage);
router.post('/save', saveKhattaEntries);

export default router;