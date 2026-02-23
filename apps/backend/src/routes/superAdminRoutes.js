import express from 'express';
import { getAllWholesalers, getTenantData, getGlobalStats } from '../controllers/superAdminController.js';
import { authenticate, requireSuperAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply auth and Super Admin middlewares to ALL routes in this file
router.use(authenticate);
router.use(requireSuperAdmin);

// Route: GET /api/admin/stats
// Desc: Get global platform statistics (Total revenue, user counts, etc.)
router.get('/stats', getGlobalStats);

// Route: GET /api/admin/wholesalers
// Desc: Get a list of all wholesalers on the platform
router.get('/wholesalers', getAllWholesalers);

// Route: GET /api/admin/wholesalers/:wholesalerId
// Desc: Drill down into a specific tenant's completely isolated data
router.get('/wholesalers/:wholesalerId', getTenantData);

export default router;