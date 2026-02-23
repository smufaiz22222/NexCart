import express from 'express';
import { recordPayment, getCustomerLedger, getAllLedgerEntries } from '../controllers/ledgerController.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply auth and tenant-isolation middlewares to ALL routes
router.use(authenticate);
router.use(requireWholesaler);

// Route: POST /api/ledger/payment
// Desc: Record a payment from a customer (Credit)
router.get('/', getAllLedgerEntries);
router.post('/payment', recordPayment);

// Route: GET /api/ledger/:customerId
// Desc: Get a specific customer's ledger entries and computed balance
router.get('/:customerId', getCustomerLedger);

export default router;