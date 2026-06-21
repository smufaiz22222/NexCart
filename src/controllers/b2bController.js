import { prisma } from '../config/db.js';
import {
  createNotification,
  createWholesalerNotification,
} from '../services/notificationService.js';

const notifyAdminsNewB2B = (companyName) => {
  prisma.user
    .findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true },
    })
    .then((admins) => {
      for (const admin of admins) {
        createNotification(admin.id, {
          title: 'New B2B Application',
          message: `A new business onboarding profile has been submitted by "${companyName}".`,
          type: 'ONBOARDING',
          link: '/admin/subscriptions',
        }).catch((err) => console.error('Failed to notify admin of B2B application:', err));
      }
    })
    .catch((err) => console.error('Failed to find admins for B2B onboarding notification:', err));
};

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
      if (['APPLIED', 'UNDER_REVIEW', 'APPROVED'].includes(existingProfile.verification)) {
        return res.status(409).json({
          error: 'A business onboarding application already exists for this account.',
          profile: existingProfile,
        });
      }

      const profile = await prisma.businessProfile.update({
        where: { userId },
        data: {
          companyName,
          taxId,
          businessAddress,
          verification: 'APPLIED',
          status: 'APPLIED',
          rejectionReason: null,
        },
      });

      notifyAdminsNewB2B(companyName);

      return res.status(200).json({
        message: 'Business application resubmitted successfully',
        profile,
      });
    }

    const profile = await prisma.businessProfile.create({
      data: {
        userId,
        companyName,
        taxId,
        businessAddress,
        verification: 'APPLIED',
        status: 'APPLIED',
      },
    });

    notifyAdminsNewB2B(companyName);

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

    const updatedData = {
      verification,
      status: verification === 'APPROVED' ? 'ACTIVE' : 'REJECTED',
    };
    if (verification === 'REJECTED') {
      updatedData.rejectionReason = rejectionReason || 'Failed verification criteria';
    } else {
      updatedData.rejectionReason = null;
    }

    const updatedProfile = await prisma.businessProfile.update({
      where: { id },
      data: updatedData,
    });

    createNotification(updatedProfile.userId, {
      title: 'Business Onboarding Update',
      message: `Your B2B onboarding application has been ${verification === 'APPROVED' ? 'APPROVED' : 'REJECTED'}.`,
      type: 'ONBOARDING',
      link: '/store/dashboard/b2b-onboarding',
    }).catch((err) => console.error('Failed to notify user of B2B status update:', err));

    res.status(200).json({
      message: `Business profile status updated to ${verification}`,
      profile: updatedProfile,
    });
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
      return res
        .status(400)
        .json({ error: 'Missing required RFQ details (productId, quantity, targetPrice)' });
    }

    // Verify buyer has an approved B2B profile
    const profile = await prisma.businessProfile.findUnique({
      where: { userId: buyerId },
    });

    if (!profile || profile.verification !== 'APPROVED' || profile.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Only approved B2B business buyers can request custom quotes',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const qty = parseInt(quantity, 10);
    if (qty < product.minOrderQty) {
      return res
        .status(400)
        .json({ error: `Quantity must meet the product MOQ of ${product.minOrderQty} units` });
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

    createWholesalerNotification(rfq.sellerId, {
      title: 'New RFQ Received',
      message: `You received a new RFQ for product "${rfq.product.name}" (Qty: ${qty}, Target: ${targetPrice} INR).`,
      type: 'RFQ',
      link: '/wholesaler/rfqs',
    }).catch((err) => console.error('Failed to notify wholesaler of RFQ:', err));

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
    const { status, counterPrice, counterQuantity, sellerNotes } = req.body;
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
      let requiredQty = rfq.quantity;
      if (counterQuantity) {
        const qty = parseInt(counterQuantity, 10);
        if (isNaN(qty) || qty <= 0) {
          return res.status(400).json({ error: 'Counter quantity must be a positive integer' });
        }
        requiredQty = qty;
      }
      const product = await prisma.product.findUnique({
        where: { id: rfq.productId },
      });
      if (!product) {
        return res.status(404).json({ error: 'Product associated with RFQ not found' });
      }
      if (product.currentStock < requiredQty) {
        return res
          .status(400)
          .json({ error: 'Insufficient inventory stock to make this counter offer.' });
      }
      updateData.counterPrice = parseFloat(counterPrice);
      updateData.counterQuantity = counterQuantity ? parseInt(counterQuantity, 10) : null;
    } else if (status === 'ACCEPTED') {
      const product = await prisma.product.findUnique({
        where: { id: rfq.productId },
      });
      if (!product) {
        return res.status(404).json({ error: 'Product associated with RFQ not found' });
      }
      if (product.currentStock < rfq.quantity) {
        return res
          .status(400)
          .json({ error: 'Insufficient inventory stock to accept this quote.' });
      }
      updateData.counterPrice = null;
      updateData.counterQuantity = null;
    }

    const updatedRfq = await prisma.rfq.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { name: true, imageUrl: true } },
      },
    });

    createNotification(updatedRfq.buyerId, {
      title: 'RFQ Response Received',
      message: `Your RFQ for "${updatedRfq.product.name}" has been ${status.toLowerCase().replace('_', ' ')} by the wholesaler.`,
      type: 'RFQ',
      link: '/store/dashboard/rfqs',
    }).catch((err) => console.error('Failed to notify buyer of RFQ status:', err));

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
          product: {
            select: { id: true, name: true, imageUrl: true, price: true, currentStock: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else if (role === 'SUPER_ADMIN') {
      rfqs = await prisma.rfq.findMany({
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, businessName: true } },
          product: {
            select: { id: true, name: true, imageUrl: true, price: true, currentStock: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else {
      // CUSTOMER
      rfqs = await prisma.rfq.findMany({
        where: { buyerId: userId },
        include: {
          seller: { select: { id: true, businessName: true } },
          product: {
            select: { id: true, name: true, imageUrl: true, price: true, currentStock: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    // Fetch matching B2B orders to find their status and paymentStatus
    let ordersWhere = {
      paymentReferenceNo: {
        contains: 'RFQ:',
      },
    };
    if (role === 'WHOLESALER' && wholesalerId) {
      ordersWhere.sellerId = wholesalerId;
    } else if (role === 'CUSTOMER') {
      ordersWhere.buyerId = userId;
    }

    const orders = await prisma.order.findMany({
      where: ordersWhere,
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        paymentReferenceNo: true,
      },
    });

    const rfqsWithOrders = rfqs.map((rfq) => {
      const matchedOrder = orders.find((o) => {
        if (!o.paymentReferenceNo) return false;
        const parts = o.paymentReferenceNo.split('|RFQ:');
        if (parts.length < 2) return false;
        const rfqIds = parts[1].split(',');
        return rfqIds.includes(rfq.id);
      });

      return {
        ...rfq,
        order: matchedOrder
          ? {
              id: matchedOrder.id,
              status: matchedOrder.status,
              paymentStatus: matchedOrder.paymentStatus,
            }
          : null,
      };
    });

    res.status(200).json({ rfqs: rfqsWithOrders });
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

    res
      .status(200)
      .json({ message: 'Product price tiers updated successfully', tiers: updatedTiers });
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

    const product = await prisma.product.findUnique({
      where: { id: rfq.productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product associated with RFQ not found' });
    }

    const requiredQty =
      rfq.counterQuantity !== null && rfq.counterQuantity !== undefined
        ? rfq.counterQuantity
        : rfq.quantity;

    if (product.currentStock < requiredQty) {
      return res.status(400).json({ error: 'Insufficient inventory stock to accept this quote.' });
    }

    const updatedRfq = await prisma.rfq.update({
      where: { id },
      data: { status: 'ACCEPTED' },
    });

    createWholesalerNotification(updatedRfq.sellerId, {
      title: 'RFQ Quote Accepted',
      message: `Customer accepted your quote for RFQ #${updatedRfq.id}. Ready for B2B order checkout.`,
      type: 'RFQ',
      link: '/wholesaler/rfqs',
    }).catch((err) => console.error('Failed to notify wholesaler of RFQ acceptance:', err));

    res
      .status(200)
      .json({ message: 'Quote accepted successfully. You can now checkout.', rfq: updatedRfq });
  } catch (error) {
    console.error('Accept Quote Error:', error);
    res.status(500).json({ error: 'Failed to accept the quote' });
  }
};

export const buyerRespondToRfq = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, targetPrice, quantity, notes } = req.body;
    const buyerId = req.user.userId;

    if (!['PENDING', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid buyer response status. Must be counter (PENDING) or decline (REJECTED).',
      });
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
      updateData.counterQuantity = null;
      updateData.notes = notes || null;

      if (quantity) {
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          return res.status(400).json({ error: 'Quantity must be a positive integer' });
        }
        const product = await prisma.product.findUnique({
          where: { id: rfq.productId },
        });
        if (product && qty < product.minOrderQty) {
          return res.status(400).json({
            error: `Quantity must meet the product MOQ of ${product.minOrderQty} units`,
          });
        }
        updateData.quantity = qty;
      }
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

    createWholesalerNotification(updatedRfq.sellerId, {
      title: 'RFQ Counter/Update Received',
      message: `Customer updated/countered RFQ #${updatedRfq.id} (Status: ${status.toLowerCase()}).`,
      type: 'RFQ',
      link: '/wholesaler/rfqs',
    }).catch((err) => console.error('Failed to notify wholesaler of RFQ update:', err));

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
      where: { verification: 'APPROVED', status: 'ACTIVE' },
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

        const balance = creditRecord ? Number(creditRecord.balance) : 0.0;

        return {
          id: buyer.id,
          buyerId: buyer.userId,
          companyName: buyer.companyName,
          taxId: buyer.taxId,
          businessAddress: buyer.businessAddress,
          email: buyer.user?.email,
          name: buyer.user?.name,
          creditLimit: creditRecord ? Number(creditRecord.creditLimit) : 50000.0,
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

export const updateWholesalerBankDetails = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    if (!wholesalerId) {
      return res.status(403).json({ error: 'Access denied. Wholesaler profile required.' });
    }

    const {
      bankName,
      bankAccountNo,
      bankIfsc,
      upiId,
      qrCodeUrl,
      deliveryFee,
      freeDeliveryThreshold,
    } = req.body;

    const parsedDeliveryFee =
      deliveryFee !== undefined && deliveryFee !== null && deliveryFee !== ''
        ? parseFloat(deliveryFee)
        : 0.0;

    const parsedThreshold =
      freeDeliveryThreshold !== undefined &&
      freeDeliveryThreshold !== null &&
      freeDeliveryThreshold !== ''
        ? parseFloat(freeDeliveryThreshold)
        : null;

    if (isNaN(parsedDeliveryFee) || parsedDeliveryFee < 0) {
      return res.status(400).json({ error: 'Delivery fee must be a non-negative number' });
    }
    if (parsedThreshold !== null && (isNaN(parsedThreshold) || parsedThreshold < 0)) {
      return res
        .status(400)
        .json({ error: 'Free delivery threshold must be a non-negative number' });
    }

    const updated = await prisma.wholesaler.update({
      where: { id: wholesalerId },
      data: {
        bankName: bankName?.trim() || null,
        bankAccountNo: bankAccountNo?.trim() || null,
        bankIfsc: bankIfsc?.trim() || null,
        upiId: upiId?.trim() || null,
        qrCodeUrl: qrCodeUrl?.trim() || null,
        deliveryFee: parsedDeliveryFee,
        freeDeliveryThreshold: parsedThreshold,
      },
    });

    res.status(200).json({
      message: 'Bank & delivery details updated successfully',
      wholesaler: {
        id: updated.id,
        businessName: updated.businessName,
        bankName: updated.bankName,
        bankAccountNo: updated.bankAccountNo,
        bankIfsc: updated.bankIfsc,
        upiId: updated.upiId,
        qrCodeUrl: updated.qrCodeUrl,
        deliveryFee: Number(updated.deliveryFee),
        freeDeliveryThreshold:
          updated.freeDeliveryThreshold !== null ? Number(updated.freeDeliveryThreshold) : null,
      },
    });
  } catch (error) {
    console.error('Update Bank Details Error:', error);
    res.status(500).json({ error: 'Failed to update wholesaler bank details' });
  }
};

export const getWholesalerProfile = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    if (!wholesalerId) {
      return res.status(403).json({ error: 'Access denied. Wholesaler profile required.' });
    }

    const profile = await prisma.wholesaler.findUnique({
      where: { id: wholesalerId },
    });

    res.status(200).json({ wholesaler: profile });
  } catch (error) {
    console.error('Get Wholesaler Profile Error:', error);
    res.status(500).json({ error: 'Failed to fetch wholesaler profile details' });
  }
};

export const getBuyerCreditStatus = async (req, res) => {
  try {
    const buyerId = req.user.userId;
    const creditLimits = await prisma.wholesalerCreditLimit.findMany({
      where: { buyerId },
      include: {
        wholesaler: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = creditLimits.map((record) => {
      const balance = Number(record.balance);
      return {
        id: record.id,
        wholesalerId: record.wholesalerId,
        businessName: record.wholesaler?.businessName || 'Unknown Wholesaler',
        creditLimit: Number(record.creditLimit),
        balance: balance.toFixed(2),
        outstandingDebt: balance < 0 ? Math.abs(balance).toFixed(2) : '0.00',
      };
    });

    res.status(200).json({ creditLimits: formatted });
  } catch (error) {
    console.error('Get Buyer Credit Status Error:', error);
    res.status(500).json({ error: 'Failed to fetch buyer credit status' });
  }
};
