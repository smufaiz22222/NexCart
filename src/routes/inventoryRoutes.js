import express from 'express';
import { adjustStock, getInventoryLogs } from '../controllers/inventoryController.js';
import {
  authenticate,
  requireOperationalWholesaler,
  requireWholesaler,
} from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(requireWholesaler);
router.use(requireOperationalWholesaler);

router.post('/', adjustStock);
router.get('/', getInventoryLogs);

export default router;
