import { prisma } from '../config/db.js';
import {
  createBusinessParty,
  createOfflineSale,
  getAccountingHub,
  recordPartyTransaction,
  createOfflinePurchase,
  reconcileInstrument,
  getPartyDetails as getPartyDetailsFromService,
} from '../services/accountingService.js';

export const recordPayment = async (req, res) => {
  try {
    const { userId, amount, description, referenceId } = req.body;
    const wholesalerId = req.user.wholesalerId;

    if (!userId || !amount || !description) {
      return res
        .status(400)
        .json({ error: 'Missing required fields (userId, amount, description)' });
    }

    const paymentAmount = Math.abs(parseFloat(amount));

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in the marketplace' });
    }

    const [existingLedgerLink, existingOrderLink, existingCreditLimit] = await prisma.$transaction([
      prisma.ledgerEntry.findFirst({
        where: { wholesalerId, userId },
        select: { id: true },
      }),
      prisma.order.findFirst({
        where: { sellerId: wholesalerId, buyerId: userId },
        select: { id: true },
      }),
      prisma.wholesalerCreditLimit.findUnique({
        where: { wholesalerId_buyerId: { wholesalerId, buyerId: userId } },
        select: { id: true },
      }),
    ]);

    if (!existingLedgerLink && !existingOrderLink && !existingCreditLimit) {
      return res.status(403).json({
        error:
          'Payment cannot be recorded for a user without an existing buyer relationship with this wholesaler',
      });
    }

    const entry = await prisma.ledgerEntry.create({
      data: {
        wholesalerId,
        userId,
        amount: paymentAmount,
        description,
        referenceId,
      },
    });

    res.status(201).json({ message: 'Payment recorded successfully', entry });
  } catch (error) {
    console.error('Record Payment Error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};
export const getCustomerLedger = async (req, res) => {
  try {
    const { userId } = req.params;
    const wholesalerId = req.user.wholesalerId;

    const entries = await prisma.ledgerEntry.findMany({
      where: { wholesalerId, userId },
      orderBy: { createdAt: 'desc' },
    });

    const creditLimitRecord = await prisma.wholesalerCreditLimit.findUnique({
      where: {
        wholesalerId_buyerId: { wholesalerId, buyerId: userId },
      },
    });
    const balance = creditLimitRecord ? Number(creditLimitRecord.balance) : 0.0;

    res.status(200).json({
      userId,
      balance: balance.toFixed(2),
      entriesCount: entries.length,
      entries,
    });
  } catch (error) {
    console.error('Get Ledger Error:', error);
    res.status(500).json({ error: 'Failed to fetch user ledger' });
  }
};
export const getAllLedgerEntries = async (req, res) => {
  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: { wholesalerId: req.user.wholesalerId },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ entries });
  } catch (error) {
    console.error('Ledger Error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
};

export const getLedgerHub = async (req, res) => {
  try {
    const hub = await getAccountingHub(req.user.wholesalerId);
    res.status(200).json(hub);
  } catch (error) {
    console.error('Ledger Hub Error:', error);
    res.status(500).json({ error: 'Failed to load accounting hub' });
  }
};

export const createParty = async (req, res) => {
  try {
    const party = await createBusinessParty({
      wholesalerId: req.user.wholesalerId,
      ...req.body,
    });

    res.status(201).json({ message: 'Party created successfully', party });
  } catch (error) {
    console.error('Create Party Error:', error);
    res.status(400).json({ error: error.message || 'Failed to create party' });
  }
};

export const createOfflineSaleEntry = async (req, res) => {
  try {
    const result = await createOfflineSale({
      wholesalerId: req.user.wholesalerId,
      ...req.body,
    });

    res.status(201).json({ message: 'Offline sale created successfully', ...result });
  } catch (error) {
    console.error('Create Offline Sale Error:', error);
    res.status(400).json({ error: error.message || 'Failed to create offline sale' });
  }
};

export const recordPartySettlement = async (req, res) => {
  try {
    const result = await recordPartyTransaction({
      wholesalerId: req.user.wholesalerId,
      partyId: req.params.partyId,
      ...req.body,
    });

    res.status(201).json({ message: 'Party transaction recorded successfully', ...result });
  } catch (error) {
    console.error('Record Party Settlement Error:', error);
    res.status(400).json({ error: error.message || 'Failed to record party transaction' });
  }
};

export const getMyLedger = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [entries, creditLimits] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: { userId },
        include: {
          wholesaler: { select: { businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wholesalerCreditLimit.findMany({
        where: { buyerId: userId },
      }),
    ]);

    const balance = creditLimits.reduce((sum, limit) => sum + Number(limit.balance), 0);

    res.status(200).json({
      balance: balance.toFixed(2),
      entriesCount: entries.length,
      entries,
    });
  } catch (error) {
    console.error('Get My Ledger Error:', error);
    res.status(500).json({ error: 'Failed to fetch your ledger statement' });
  }
};

export const createOfflinePurchaseEntry = async (req, res) => {
  try {
    const result = await createOfflinePurchase({
      wholesalerId: req.user.wholesalerId,
      ...req.body,
    });

    res.status(201).json({ message: 'Offline purchase created successfully', ...result });
  } catch (error) {
    console.error('Create Offline Purchase Error:', error);
    res.status(400).json({ error: error.message || 'Failed to create offline purchase' });
  }
};

export const reconcileInstrumentEntry = async (req, res) => {
  try {
    const { instrumentId } = req.params;
    const result = await reconcileInstrument({
      wholesalerId: req.user.wholesalerId,
      instrumentId,
    });

    res.status(200).json({ message: 'Instrument reconciled successfully', instrument: result });
  } catch (error) {
    console.error('Reconcile Instrument Error:', error);
    res.status(400).json({ error: error.message || 'Failed to reconcile instrument' });
  }
};

export const getPartyDetails = async (req, res) => {
  try {
    const { partyId } = req.params;
    const wholesalerId = req.user.wholesalerId;

    const details = await getPartyDetailsFromService(wholesalerId, partyId);
    res.status(200).json(details);
  } catch (error) {
    console.error('Get Party Details Error:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch party details' });
  }
};

export const getAccountEntries = async (req, res) => {
  try {
    const { accountId } = req.params;
    const wholesalerId = req.user.wholesalerId;

    const account = await prisma.accountingAccount.findFirst({
      where: { id: accountId, wholesalerId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const entries = await prisma.accountingEntry.findMany({
      where: { accountId, wholesalerId },
      include: {
        party: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ account, entries });
  } catch (error) {
    console.error('Get Account Entries Error:', error);
    res.status(500).json({ error: 'Failed to fetch account entries' });
  }
};
