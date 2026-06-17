import express from 'express';
import {
  recordPayment,
  getCustomerLedger,
  getAllLedgerEntries,
} from '../controllers/ledgerController.js';
import { authenticate, requireOperationalWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/payment', authenticate, requireOperationalWholesaler, recordPayment);
router.get('/', authenticate, requireOperationalWholesaler, getAllLedgerEntries);
router.get('/user/:userId', authenticate, requireOperationalWholesaler, getCustomerLedger);

export default router;
