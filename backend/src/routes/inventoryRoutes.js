import express from 'express';
import { adjustStock, getInventoryLogs } from '../controllers/inventoryController.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(requireWholesaler);

router.post('/', adjustStock);
router.get('/', getInventoryLogs);

export default router;
