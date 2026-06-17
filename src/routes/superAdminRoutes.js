import express from 'express';
import {
  approveWholesalerApplication,
  getAllWholesalers,
  getAdminSubscriptionPlans,
  getTenantData,
  getGlobalStats,
  getPendingWholesalerApplications,
  rejectWholesalerApplication,
  updateWholesalerLifecycle,
} from '../controllers/superAdminController.js';
import { activateAdminManualSubscription } from '../controllers/subscriptionController.js';
import { authenticate, requireSuperAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/stats', getGlobalStats);
router.get('/wholesalers', getAllWholesalers);
router.get('/wholesalers/pending', getPendingWholesalerApplications);
router.get('/wholesalers/:wholesalerId', getTenantData);
router.post('/wholesalers/:wholesalerId/approve', approveWholesalerApplication);
router.post('/wholesalers/:wholesalerId/reject', rejectWholesalerApplication);
router.post('/wholesalers/:wholesalerId/lifecycle', updateWholesalerLifecycle);
router.get('/subscriptions/plans', getAdminSubscriptionPlans);
router.post(
  '/wholesalers/:wholesalerId/subscriptions/activate-direct',
  activateAdminManualSubscription
);

export default router;
