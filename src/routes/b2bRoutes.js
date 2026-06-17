import express from 'express';
import {
  registerB2BProfile,
  adminApproveB2B,
  createRfq,
  respondToRfq,
  getRfqs,
  addProductPriceTiers,
  getBusinessApplications,
  acceptQuote,
  buyerRespondToRfq,
  getWholesalerBuyers,
  updateWholesalerCreditLimit,
  getBuyerCreditStatus,
} from '../controllers/b2bController.js';
import {
  authenticate,
  requireSuperAdmin,
  requireWholesaler,
} from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply auth to all B2B routes
router.use(authenticate);

// 1. Onboarding Routes
router.post('/register', registerB2BProfile);
router.get('/applications', requireSuperAdmin, getBusinessApplications);
router.post('/admin/approve/:id', requireSuperAdmin, adminApproveB2B);

// 2. RFQ Negotiation Routes
router.post('/rfq', createRfq);
router.get('/rfq', getRfqs);
router.patch('/rfq/:id', requireWholesaler, respondToRfq);
router.post('/rfq/:id/accept', acceptQuote);
router.post('/rfq/:id/buyer-respond', buyerRespondToRfq);

// 3. Product Wholesale Settings
router.post('/products/:id/tiers', requireWholesaler, addProductPriceTiers);

// 4. Wholesaler Credit Limits Management
router.get('/wholesaler/buyers', requireWholesaler, getWholesalerBuyers);
router.post('/wholesaler/buyers/:buyerId/credit-limit', requireWholesaler, updateWholesalerCreditLimit);

// 5. Buyer Credit Limits Query
router.get('/buyer/credit-limits', getBuyerCreditStatus);

export default router;
