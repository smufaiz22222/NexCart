import express from 'express';
import { adjustStock, getInventoryLogs } from '../controllers/inventoryController.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply auth and tenant-isolation middlewares to ALL routes
router.use(authenticate);
router.use(requireWholesaler);

// Route: POST /api/inventory
// Desc: Adjust stock for a product and create an immutable log
router.post('/', adjustStock);

// Route: GET /api/inventory
// Desc: Get all inventory logs for the logged-in wholesaler
router.get('/', getInventoryLogs);

export default router;