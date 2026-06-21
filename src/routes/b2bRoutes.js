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
  updateWholesalerBankDetails,
  getWholesalerProfile,
  getBuyerCreditStatus,
} from '../controllers/b2bController.js';
import {
  authenticate,
  requireRoles,
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
router.post('/rfq', requireRoles('CUSTOMER'), createRfq);
router.get('/rfq', getRfqs);
router.patch('/rfq/:id', requireWholesaler, respondToRfq);
router.post('/rfq/:id/accept', requireRoles('CUSTOMER'), acceptQuote);
router.post('/rfq/:id/buyer-respond', requireRoles('CUSTOMER'), buyerRespondToRfq);

// 3. Product Wholesale Settings
router.post('/products/:id/tiers', requireWholesaler, addProductPriceTiers);

// 4. Wholesaler Buyers List
router.get('/wholesaler/buyers', requireWholesaler, getWholesalerBuyers);

// 5. Wholesaler Profile and Bank Details
router.get('/wholesaler/profile', requireWholesaler, getWholesalerProfile);
router.put('/wholesaler/bank-details', requireWholesaler, updateWholesalerBankDetails);

// 6. Buyer Credit Status
router.get('/buyer/credit-limits', requireRoles('CUSTOMER'), getBuyerCreditStatus);

export default router;
