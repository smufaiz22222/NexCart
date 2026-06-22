import { prisma } from '../config/db.js';

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const calculateWholesalerEarnings = async (wholesalerId) => {
  // 1. Fetch all orders for this wholesaler that are paid and completed/delivered
  const orders = await prisma.order.findMany({
    where: {
      sellerId: wholesalerId,
      paymentStatus: 'PAID',
      status: { in: ['DELIVERED', 'RETURN_COMPLETED'] },
    },
    include: {
      items: true,
    },
  });

  let totalCumulativeEarnings = 0;
  const now = new Date();

  for (const order of orders) {
    let orderEarnings = 0;
    let hasQualifyingItem = false;

    for (const item of order.items) {
      if (item.status === 'ACTIVE' && ['NONE', 'REJECTED'].includes(item.returnStatus)) {
        const returnEligibleUntil = item.returnEligibleUntil
          ? new Date(item.returnEligibleUntil)
          : null;
        // If return window has expired
        if (returnEligibleUntil && returnEligibleUntil <= now) {
          orderEarnings += Number(item.subtotalAtPurchase || item.price * item.quantity);
          hasQualifyingItem = true;
        }
      }
    }

    // If at least one item qualified, credit the delivery fee to the wholesaler
    if (hasQualifyingItem) {
      orderEarnings += Number(order.deliveryFee);
    }

    totalCumulativeEarnings += orderEarnings;
  }

  // 2. Fetch all payout requests for this wholesaler
  const payouts = await prisma.wholesalerPayout.findMany({
    where: { wholesalerId },
  });

  const totalPaidPayouts = payouts
    .filter((p) => p.status === 'APPROVED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPendingPayouts = payouts
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const availableBalance = Math.max(0, totalCumulativeEarnings - totalPaidPayouts);
  const withdrawableBalance = Math.max(0, availableBalance - totalPendingPayouts);

  return {
    totalCumulativeEarnings: Number(totalCumulativeEarnings.toFixed(2)),
    totalPaidPayouts: Number(totalPaidPayouts.toFixed(2)),
    totalPendingPayouts: Number(totalPendingPayouts.toFixed(2)),
    availableBalance: Number(availableBalance.toFixed(2)),
    withdrawableBalance: Number(withdrawableBalance.toFixed(2)),
  };
};

export const requestPayout = async ({ wholesalerId, amount, supplierNotes }) => {
  const value = Number(amount);
  if (isNaN(value) || value <= 0) {
    throw buildError('Payout amount must be greater than zero.', 400);
  }

  return prisma.$transaction(async (tx) => {
    // 1. Fetch wholesaler bank details from their profile
    const wholesaler = await tx.wholesaler.findUnique({
      where: { id: wholesalerId },
    });

    if (!wholesaler) {
      throw buildError('Wholesaler profile not found.', 404);
    }

    // 2. Calculate balance inside transaction
    const balance = await calculateWholesalerEarnings(wholesalerId);
    if (value > balance.withdrawableBalance) {
      throw buildError(
        `Insufficient balance. Requested: ${value} INR, Withdrawable: ${balance.withdrawableBalance} INR`,
        400
      );
    }

    // 3. Select target credentials based on configuration
    const useSame = wholesaler.useSameAsB2B;
    const finalBankName = useSame ? wholesaler.bankName : wholesaler.payoutBankName;
    const finalBankAccountNo = useSame ? wholesaler.bankAccountNo : wholesaler.payoutBankAccountNo;
    const finalBankIfsc = useSame ? wholesaler.bankIfsc : wholesaler.payoutBankIfsc;
    const finalUpiId = useSame ? wholesaler.upiId : wholesaler.payoutUpiId;

    if (!finalBankAccountNo && !finalUpiId) {
      throw buildError('Missing settlement details. Please configure bank account or UPI ID.', 400);
    }

    // 4. Create the payout record
    const payout = await tx.wholesalerPayout.create({
      data: {
        wholesalerId,
        amount: value,
        status: 'PENDING',
        bankName: finalBankName,
        bankAccountNo: finalBankAccountNo,
        bankIfsc: finalBankIfsc,
        upiId: finalUpiId,
        supplierNotes: supplierNotes?.trim() || null,
      },
    });

    return payout;
  });
};

export const getWholesalerPayoutRequests = async (wholesalerId) => {
  return prisma.wholesalerPayout.findMany({
    where: { wholesalerId },
    orderBy: { createdAt: 'desc' },
  });
};

export const adminGetAllPayoutRequests = async (status) => {
  const where = status ? { status } : {};
  return prisma.wholesalerPayout.findMany({
    where,
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
};

export const adminApprovePayoutRequest = async ({ payoutId, transactionRef, adminNotes }) => {
  if (!transactionRef?.trim()) {
    throw buildError('Transaction reference number is required to approve payouts.', 400);
  }

  return prisma.$transaction(async (tx) => {
    const payout = await tx.wholesalerPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw buildError('Payout request not found.', 404);
    }

    if (payout.status !== 'PENDING') {
      throw buildError(`Payout request is already ${payout.status}.`, 400);
    }

    const updatedPayout = await tx.wholesalerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'APPROVED',
        transactionRef: transactionRef.trim(),
        adminNotes: adminNotes?.trim() || null,
        paidAt: new Date(),
      },
    });

    return updatedPayout;
  });
};

export const adminRejectPayoutRequest = async ({ payoutId, adminNotes }) => {
  if (!adminNotes?.trim()) {
    throw buildError('Admin notes/reason is required to reject payouts.', 400);
  }

  return prisma.$transaction(async (tx) => {
    const payout = await tx.wholesalerPayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw buildError('Payout request not found.', 404);
    }

    if (payout.status !== 'PENDING') {
      throw buildError(`Payout request is already ${payout.status}.`, 400);
    }

    const updatedPayout = await tx.wholesalerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'REJECTED',
        adminNotes: adminNotes.trim(),
        rejectedAt: new Date(),
      },
    });

    return updatedPayout;
  });
};

export const updateWholesalerPayoutSettings = async ({
  wholesalerId,
  useSameAsB2B,
  payoutBankName,
  payoutBankAccountNo,
  payoutBankIfsc,
  payoutUpiId,
}) => {
  return prisma.wholesaler.update({
    where: { id: wholesalerId },
    data: {
      useSameAsB2B: !!useSameAsB2B,
      payoutBankName: payoutBankName?.trim() || null,
      payoutBankAccountNo: payoutBankAccountNo?.trim() || null,
      payoutBankIfsc: payoutBankIfsc?.trim() || null,
      payoutUpiId: payoutUpiId?.trim() || null,
    },
  });
};
