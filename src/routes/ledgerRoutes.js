import express from 'express';
import {
  recordPayment,
  getCustomerLedger,
  getAllLedgerEntries,
  getMyLedger,
  getLedgerHub,
  createParty,
  createOfflineSaleEntry,
  recordPartySettlement,
  createOfflinePurchaseEntry,
  reconcileInstrumentEntry,
  getPartyDetails,
  getAccountEntries,
} from '../controllers/ledgerController.js';
import { authenticate, requireOperationalWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/payment', authenticate, requireOperationalWholesaler, recordPayment);
router.get('/hub', authenticate, requireOperationalWholesaler, getLedgerHub);
router.get(
  '/accounts/:accountId/entries',
  authenticate,
  requireOperationalWholesaler,
  getAccountEntries
);
router.post('/parties', authenticate, requireOperationalWholesaler, createParty);
router.get(
  '/parties/:partyId/details',
  authenticate,
  requireOperationalWholesaler,
  getPartyDetails
);
router.post('/offline-sales', authenticate, requireOperationalWholesaler, createOfflineSaleEntry);
router.post(
  '/parties/:partyId/transactions',
  authenticate,
  requireOperationalWholesaler,
  recordPartySettlement
);
router.post(
  '/offline-purchases',
  authenticate,
  requireOperationalWholesaler,
  createOfflinePurchaseEntry
);
router.post(
  '/instruments/:instrumentId/reconcile',
  authenticate,
  requireOperationalWholesaler,
  reconcileInstrumentEntry
);
router.get('/', authenticate, requireOperationalWholesaler, getAllLedgerEntries);
router.get('/my-ledger', authenticate, getMyLedger);
router.get('/user/:userId', authenticate, requireOperationalWholesaler, getCustomerLedger);

export default router;
