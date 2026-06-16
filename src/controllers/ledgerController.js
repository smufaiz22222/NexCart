import { prisma } from '../config/db.js';

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

    const computedBalance = entries.reduce((sum, entry) => {
      return sum + parseFloat(entry.amount);
    }, 0);

    res.status(200).json({
      userId,
      balance: computedBalance.toFixed(2),
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
