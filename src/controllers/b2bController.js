import { prisma } from '../config/db.js';

// 1. Submit B2B Business Onboarding Profile
export const registerB2BProfile = async (req, res) => {
  try {
    const { companyName, taxId, businessAddress } = req.body;
    const userId = req.user.userId;

    if (!companyName || !taxId || !businessAddress) {
      return res.status(400).json({ error: 'Missing required business details' });
    }

    // Check if profile already exists
    const existingProfile = await prisma.businessProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return res.status(400).json({ 
        error: 'Business onboarding profile already exists for this account',
        verification: existingProfile.verification 
      });
    }

    const profile = await prisma.businessProfile.create({
      data: {
        userId,
        companyName,
        taxId,
        businessAddress,
        verification: 'APPLIED',
      },
    });

    res.status(201).json({ message: 'Business application submitted successfully', profile });
  } catch (error) {
    console.error('B2B Onboarding Error:', error);
    res.status(500).json({ error: 'Failed to submit B2B onboarding application' });
  }
};

// 2. Admin Review and Approval of B2B Onboarding Profile
export const adminApproveB2B = async (req, res) => {
  try {
    const { id } = req.params;
    const { verification, rejectionReason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(verification)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    const profile = await prisma.businessProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    const updatedData = { verification };
    if (verification === 'REJECTED') {
      updatedData.rejectionReason = rejectionReason || 'Failed verification criteria';
    } else {
      updatedData.rejectionReason = null;
    }

    const updatedProfile = await prisma.businessProfile.update({
      where: { id },
      data: updatedData,
    });

    res.status(200).json({ message: `Business profile status updated to ${verification}`, profile: updatedProfile });
  } catch (error) {
    console.error('B2B Admin Approval Error:', error);
    res.status(500).json({ error: 'Failed to update business profile status' });
  }
};

// 3. Create Custom B2B Quote (RFQ)
export const createRfq = async (req, res) => {
  try {
    const { productId, quantity, targetPrice, notes } = req.body;
    const buyerId = req.user.userId;

    if (!productId || !quantity || !targetPrice) {
      return res.status(400).json({ error: 'Missing required RFQ details (productId, quantity, targetPrice)' });
    }

    // Verify buyer has an approved B2B profile
    const profile = await prisma.businessProfile.findUnique({
      where: { userId: buyerId },
    });

    if (!profile || profile.verification !== 'APPROVED') {
      return res.status(403).json({ error: 'Only approved B2B business buyers can request custom quotes' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const qty = parseInt(quantity, 10);
    if (qty < product.minOrderQty) {
      return res.status(400).json({ error: `Quantity must meet the product MOQ of ${product.minOrderQty} units` });
    }

    const rfq = await prisma.rfq.create({
      data: {
        buyerId,
        sellerId: product.wholesalerId,
        productId,
        quantity: qty,
        targetPrice: parseFloat(targetPrice),
        status: 'PENDING',
        notes: notes || '',
        businessProfileId: profile.id,
      },
      include: {
        product: { select: { name: true, imageUrl: true, price: true } },
      },
    });

    res.status(201).json({ message: 'RFQ submitted successfully', rfq });
  } catch (error) {
    console.error('Create RFQ Error:', error);
    res.status(500).json({ error: 'Failed to create RFQ request' });
  }
};

// 4. Respond to RFQ (Accept, Counter, or Reject)
export const respondToRfq = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, counterPrice, sellerNotes } = req.body;
    const wholesalerId = req.user.wholesalerId;

    if (!['ACCEPTED', 'REJECTED', 'COUNTER_OFFERED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid response status' });
    }

    const rfq = await prisma.rfq.findUnique({
      where: { id },
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    if (rfq.sellerId !== wholesalerId) {
      return res.status(403).json({ error: 'Access denied. You do not own this RFQ' });
    }

    if (['ORDER_PLACED', 'ACCEPTED'].includes(rfq.status)) {
      return res.status(400).json({ error: 'RFQ has already been finalized' });
    }

    const updateData = { status, sellerNotes: sellerNotes || '' };

    if (status === 'COUNTER_OFFERED') {
      if (!counterPrice) {
        return res.status(400).json({ error: 'Counter price is required for counter offers' });
      }
      updateData.counterPrice = parseFloat(counterPrice);
    } else if (status === 'ACCEPTED') {
      updateData.counterPrice = null;
    }

    const updatedRfq = await prisma.rfq.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { name: true, imageUrl: true } },
      },
    });

    res.status(200).json({ message: `RFQ status updated to ${status}`, rfq: updatedRfq });
  } catch (error) {
    console.error('Respond RFQ Error:', error);
    res.status(500).json({ error: 'Failed to respond to RFQ' });
  }
};

// 5. Fetch RFQs
export const getRfqs = async (req, res) => {
  try {
    const { role, userId, wholesalerId } = req.user;

    let rfqs = [];

    if (role === 'WHOLESALER' && wholesalerId) {
      rfqs = await prisma.rfq.findMany({
        where: { sellerId: wholesalerId },
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, imageUrl: true, price: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else if (role === 'SUPER_ADMIN') {
      rfqs = await prisma.rfq.findMany({
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, businessName: true } },
          product: { select: { id: true, name: true, imageUrl: true, price: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else {
      // CUSTOMER
      rfqs = await prisma.rfq.findMany({
        where: { buyerId: userId },
        include: {
          seller: { select: { id: true, businessName: true } },
          product: { select: { id: true, name: true, imageUrl: true, price: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    res.status(200).json({ rfqs });
  } catch (error) {
    console.error('Get RFQs Error:', error);
    res.status(500).json({ error: 'Failed to fetch RFQs' });
  }
};

// 6. Manage Product price tiers (Wholesaler only)
export const addProductPriceTiers = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { tiers } = req.body; // Array of { minQuantity: number, unitPrice: number }
    const wholesalerId = req.user.wholesalerId;

    if (!Array.isArray(tiers)) {
      return res.status(400).json({ error: 'Tiers must be an array of quantity pricing rules' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.wholesalerId !== wholesalerId) {
      return res.status(403).json({ error: 'Access denied. You do not own this product' });
    }

    // Bulk transact: clear existing price tiers and create new ones
    await prisma.$transaction([
      prisma.productPriceTier.deleteMany({
        where: { productId },
      }),
      prisma.productPriceTier.createMany({
        data: tiers.map((tier) => ({
          productId,
          minQuantity: parseInt(tier.minQuantity, 10),
          unitPrice: parseFloat(tier.unitPrice),
        })),
      }),
    ]);

    const updatedTiers = await prisma.productPriceTier.findMany({
      where: { productId },
      orderBy: { minQuantity: 'asc' },
    });

    res.status(200).json({ message: 'Product price tiers updated successfully', tiers: updatedTiers });
  } catch (error) {
    console.error('Update Tiers Error:', error);
    res.status(500).json({ error: 'Failed to update product price tiers' });
  }
};

// 7. Get Business Applications (Admin only)
export const getBusinessApplications = async (req, res) => {
  try {
    const applications = await prisma.businessProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ applications });
  } catch (error) {
    console.error('Get Applications Error:', error);
    res.status(500).json({ error: 'Failed to fetch business onboarding applications' });
  }
};

// 8. Accept Counter Offer or Quote (Customer only)
export const acceptQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const buyerId = req.user.userId;

    const rfq = await prisma.rfq.findUnique({
      where: { id },
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    if (rfq.buyerId !== buyerId) {
      return res.status(403).json({ error: 'Access denied. You do not own this RFQ' });
    }

    if (!['COUNTER_OFFERED', 'PENDING'].includes(rfq.status)) {
      return res.status(400).json({ error: 'RFQ is not in a negotiable status' });
    }

    const updatedRfq = await prisma.rfq.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    res.status(200).json({ message: 'Quote accepted successfully. You can now checkout.', rfq: updatedRfq });
  } catch (error) {
    console.error('Accept Quote Error:', error);
    res.status(500).json({ error: 'Failed to accept the quote' });
  }
};

export const buyerRespondToRfq = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, targetPrice, notes } = req.body;
    const buyerId = req.user.userId;

    if (!['PENDING', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid buyer response status. Must be counter (PENDING) or decline (REJECTED).' });
    }

    const rfq = await prisma.rfq.findUnique({
      where: { id },
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    if (rfq.buyerId !== buyerId) {
      return res.status(403).json({ error: 'Access denied. You do not own this RFQ' });
    }

    if (['ORDER_PLACED', 'ACCEPTED'].includes(rfq.status)) {
      return res.status(400).json({ error: 'RFQ has already been finalized' });
    }

    const updateData = { status };

    if (status === 'PENDING') {
      if (!targetPrice || isNaN(parseFloat(targetPrice)) || parseFloat(targetPrice) <= 0) {
        return res.status(400).json({ error: 'A valid target price is required to counter offer' });
      }
      updateData.targetPrice = parseFloat(targetPrice);
      updateData.counterPrice = null;
      updateData.notes = notes || null;
    } else if (status === 'REJECTED') {
      updateData.notes = notes ? `Declined: ${notes}` : rfq.notes;
    }

    const updatedRfq = await prisma.rfq.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { name: true, imageUrl: true } },
      },
    });

    res.status(200).json({ message: `RFQ updated to ${status}`, rfq: updatedRfq });
  } catch (error) {
    console.error('Buyer Respond RFQ Error:', error);
    res.status(500).json({ error: 'Failed to counter or decline the quote' });
  }
};

// 9. Fetch B2B buyers and credit details (Wholesaler only)
export const getWholesalerBuyers = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    if (!wholesalerId) {
      return res.status(403).json({ error: 'Access denied. Wholesaler profile required.' });
    }

    const buyers = await prisma.businessProfile.findMany({
      where: { verification: 'APPROVED' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const buyersWithCredit = await Promise.all(
      buyers.map(async (buyer) => {
        const creditRecord = await prisma.wholesalerCreditLimit.findUnique({
          where: {
            wholesalerId_buyerId: { wholesalerId, buyerId: buyer.userId },
          },
        });

        const balance = creditRecord ? Number(creditRecord.balance) : 0.00;

        return {
          id: buyer.id,
          buyerId: buyer.userId,
          companyName: buyer.companyName,
          taxId: buyer.taxId,
          businessAddress: buyer.businessAddress,
          email: buyer.user?.email,
          name: buyer.user?.name,
          creditLimit: creditRecord ? Number(creditRecord.creditLimit) : 50000.00,
          hasCustomLimit: !!creditRecord,
          balance: balance.toFixed(2),
          outstandingDebt: balance < 0 ? Math.abs(balance).toFixed(2) : '0.00',
        };
      })
    );

    res.status(200).json({ buyers: buyersWithCredit });
  } catch (error) {
    console.error('Get Wholesaler Buyers Error:', error);
    res.status(500).json({ error: 'Failed to fetch buyers and credit lines' });
  }
};

// 10. Update custom credit limit for a buyer (Wholesaler only)
export const updateWholesalerCreditLimit = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const { buyerId } = req.params;
    const { creditLimit } = req.body;

    if (!wholesalerId) {
      return res.status(403).json({ error: 'Access denied. Wholesaler profile required.' });
    }

    if (creditLimit === undefined || isNaN(parseFloat(creditLimit))) {
      return res.status(400).json({ error: 'Valid credit limit value is required' });
    }

    const limitValue = parseFloat(creditLimit);
    if (limitValue < 0) {
      return res.status(400).json({ error: 'Credit limit cannot be negative' });
    }

    const businessProfile = await prisma.businessProfile.findUnique({
      where: { userId: buyerId },
    });

    if (!businessProfile || businessProfile.verification !== 'APPROVED') {
      return res.status(400).json({ error: 'Customer must have an approved B2B profile to set a credit limit' });
    }

    const record = await prisma.wholesalerCreditLimit.upsert({
      where: {
        wholesalerId_buyerId: { wholesalerId, buyerId },
      },
      update: {
        creditLimit: limitValue,
      },
      create: {
        wholesalerId,
        buyerId,
        creditLimit: limitValue,
      },
    });

    res.status(200).json({ message: 'Credit limit updated successfully', record });
  } catch (error) {
    console.error('Update Credit Limit Error:', error);
    res.status(500).json({ error: 'Failed to update credit limit' });
  }
};

// 11. Get Buyer Credit Status per Wholesaler
export const getBuyerCreditStatus = async (req, res) => {
  try {
    const buyerId = req.user.userId;

    const businessProfile = await prisma.businessProfile.findUnique({
      where: { userId: buyerId },
    });

    if (!businessProfile || businessProfile.verification !== 'APPROVED' || businessProfile.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Access denied. Active approved B2B business profile required.' });
    }

    // Batch query wholesaler credit limits and ledger entries for this buyer
    const [creditLimits, ledgerEntries] = await Promise.all([
      prisma.wholesalerCreditLimit.findMany({
        where: { buyerId },
        include: {
          wholesaler: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      }),
      prisma.ledgerEntry.findMany({
        where: { userId: buyerId },
        include: {
          wholesaler: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      }),
    ]);

    // Group ledger entries by wholesalerId
    const balanceMap = {};
    const wholesalerNames = {};

    for (const entry of ledgerEntries) {
      const wId = entry.wholesalerId;
      if (!balanceMap[wId]) {
        balanceMap[wId] = 0;
      }
      balanceMap[wId] += Number(entry.amount);
      if (entry.wholesaler) {
        wholesalerNames[wId] = entry.wholesaler.businessName;
      }
    }

    // Build credit lines list
    const creditLines = [];
    const processedWholesalerIds = new Set();

    // 1. Process explicit credit limits
    for (const limitRecord of creditLimits) {
      const wId = limitRecord.wholesalerId;
      processedWholesalerIds.add(wId);

      const balance = balanceMap[wId] || 0;
      const outstanding = balance < 0 ? -balance : 0;
      const creditLimit = Number(limitRecord.creditLimit);
      const available = Math.max(0, creditLimit - outstanding);

      creditLines.push({
        wholesalerId: wId,
        wholesalerName: limitRecord.wholesaler?.businessName || 'Unknown Wholesaler',
        creditEnabled: true,
        creditLimit,
        outstanding,
        available,
        currency: 'INR',
        status: 'Active',
      });
    }

    // 2. Process wholesalers with ledger activity but no explicit credit limit configured (use default ₹50,000)
    for (const [wId, balance] of Object.entries(balanceMap)) {
      if (!processedWholesalerIds.has(wId)) {
        processedWholesalerIds.add(wId);

        const outstanding = balance < 0 ? -balance : 0;
        const creditLimit = 50000.00; // Default credit limit
        const available = Math.max(0, creditLimit - outstanding);

        creditLines.push({
          wholesalerId: wId,
          wholesalerName: wholesalerNames[wId] || 'Unknown Wholesaler',
          creditEnabled: true,
          creditLimit,
          outstanding,
          available,
          currency: 'INR',
          status: 'Active',
        });
      }
    }

    // Computes aggregate totals
    const totalOutstanding = creditLines.reduce((sum, line) => sum + line.outstanding, 0);
    const totalAvailable = creditLines.reduce((sum, line) => sum + line.available, 0);

    res.status(200).json({
      totalOutstanding,
      totalAvailable,
      creditLines,
    });
  } catch (error) {
    console.error('Get Buyer Credit Status Error:', error);
    res.status(500).json({ error: 'Failed to fetch buyer credit status' });
  }
};

