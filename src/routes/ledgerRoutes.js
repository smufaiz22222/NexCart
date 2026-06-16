import express from 'express';
import {
  recordPayment,
  getCustomerLedger,
  getAllLedgerEntries,
} from '../controllers/ledgerController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/payment', authenticate, recordPayment);
router.get('/', authenticate, getAllLedgerEntries);
router.get('/user/:userId', authenticate, getCustomerLedger);

export default router;
