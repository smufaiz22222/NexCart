import { prisma } from '../config/db.js';

// --- RECORD A PAYMENT / CREDIT (WHOLESALER ACTION) ---
export const recordPayment = async (req, res) => {
  try {
    const { customerId, amount, description, referenceId } = req.body;
    const wholesalerId = req.user.wholesalerId;

    if (!customerId || !amount || !description) {
      return res.status(400).json({ error: 'Missing required fields (customerId, amount, description)' });
    }

    // Ensure the amount is positive for a payment
    const paymentAmount = Math.abs(parseFloat(amount));

    // 1. Verify the customer belongs to this wholesaler
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer || customer.wholesalerId !== wholesalerId) {
      return res.status(403).json({ error: 'Customer not found or unauthorized' });
    }

    // 2. Create the immutable append-only ledger entry
    const entry = await prisma.ledgerEntry.create({
      data: {
        wholesalerId,
        customerId,
        amount: paymentAmount, // Positive value means the customer paid off debt
        description,
        referenceId // Optional: Can be a check number, bank transaction ID, etc.
      }
    });

    res.status(201).json({ message: 'Payment recorded successfully', entry });

  } catch (error) {
    console.error('Record Payment Error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

// --- GET CUSTOMER LEDGER & COMPUTED BALANCE ---
export const getCustomerLedger = async (req, res) => {
  try {
    const { customerId } = req.params;
    const wholesalerId = req.user.wholesalerId;

    // 1. Fetch all immutable entries for this customer
    const entries = await prisma.ledgerEntry.findMany({
      where: { wholesalerId, customerId },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Compute the balance dynamically: SUM(amount)
    // Negative = Customer owes the Wholesaler
    // Positive = Customer overpaid / has a credit balance
    // Zero = Settled
    const computedBalance = entries.reduce((sum, entry) => {
      return sum + parseFloat(entry.amount);
    }, 0);

    res.status(200).json({ 
      customerId, 
      balance: computedBalance.toFixed(2), 
      entriesCount: entries.length,
      entries 
    });

  } catch (error) {
    console.error('Get Ledger Error:', error);
    res.status(500).json({ error: 'Failed to fetch customer ledger' });
  }
};
// --- GET ALL LEDGER ENTRIES FOR WHOLESALER ---
export const getAllLedgerEntries = async (req, res) => {
  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: { wholesalerId: req.user.wholesalerId },
      include: { 
        customer: { include: { user: { select: { email: true } } } } 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ entries });
  } catch (error) {
    console.error('Ledger Error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
};