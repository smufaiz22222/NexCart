import express from 'express';
import { getAllWholesalers, getTenantData, getGlobalStats } from '../controllers/superAdminController.js';
import { authenticate, requireSuperAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/stats', getGlobalStats);
router.get('/wholesalers', getAllWholesalers);
router.get('/wholesalers/:wholesalerId', getTenantData);

export default router;
