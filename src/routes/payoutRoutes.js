import express from 'express';
import {
  getWholesalerPayoutSummary,
  getWholesalerPayoutRequests,
  createWholesalerPayoutRequest,
  updateWholesalerPayoutSettings,
  adminGetAllPayoutRequests,
  adminApprovePayoutRequest,
  adminRejectPayoutRequest,
} from '../controllers/payoutController.js';
import {
  authenticate,
  requireWholesaler,
  requireSuperAdmin,
} from '../middlewares/authMiddleware.js';

const router = express.Router();

// All payout routes require authentication
router.use(authenticate);

// Wholesaler endpoints
router.get('/wholesaler/summary', requireWholesaler, getWholesalerPayoutSummary);
router.get('/wholesaler/requests', requireWholesaler, getWholesalerPayoutRequests);
router.post('/wholesaler/requests', requireWholesaler, createWholesalerPayoutRequest);
router.put('/wholesaler/payout-settings', requireWholesaler, updateWholesalerPayoutSettings);

// Admin endpoints
router.get('/admin/requests', requireSuperAdmin, adminGetAllPayoutRequests);
router.post('/admin/requests/:payoutId/approve', requireSuperAdmin, adminApprovePayoutRequest);
router.post('/admin/requests/:payoutId/reject', requireSuperAdmin, adminRejectPayoutRequest);

export default router;
