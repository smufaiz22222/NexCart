import Razorpay from 'razorpay';
import { prisma } from '../config/db.js';

export const RETURN_STATUSES = {
  NONE: 'NONE',
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RECEIVED: 'RECEIVED',
  RETURN_COMPLETED: 'RETURN_COMPLETED',
};

export const RETURN_REFUND_STATUSES = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
};

export const RETURN_REASONS = {
  WRONG_ITEM: 'WRONG_ITEM',
  DAMAGED: 'DAMAGED',
  DEFECTIVE: 'DEFECTIVE',
  CHANGED_MIND: 'CHANGED_MIND',
  MISSING_PARTS: 'MISSING_PARTS',
  OTHER: 'OTHER',
};

export const LEDGER_ENTRY_SOURCES = {
  MANUAL: 'MANUAL',
  ORDER_CHARGE: 'ORDER_CHARGE',
  ORDER_AUTO_PAYMENT: 'ORDER_AUTO_PAYMENT',
  ORDER_PREPAID_PAYMENT: 'ORDER_PREPAID_PAYMENT',
  ORDER_CANCELLATION: 'ORDER_CANCELLATION',
  CUSTOMER_RETURN: 'CUSTOMER_RETURN',
  RETURN_REFUND: 'RETURN_REFUND',
  RETURN_ADJUSTMENT: 'RETURN_ADJUSTMENT',
};

const DEFAULT_RETURN_WINDOW_DAYS = 7;

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toNumber = (value) => Number(Number(value || 0).toFixed(2));
const toPaise = (value) => Math.round(toNumber(value) * 100);

const ORDER_DETAILS_INCLUDE = {
  buyer: { select: { id: true, name: true, email: true } },
  seller: { select: { id: true, businessName: true } },
  invoice: true,
  items: {
    include: {
      product: true,
    },
    orderBy: { id: 'asc' },
  },
  issues: {
    include: {
      requester: { select: { id: true, name: true, role: true } },
      orderItem: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
  adjustments: {
    orderBy: { createdAt: 'asc' },
  },
};

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw buildError('Razorpay is not configured on the server', 500);
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const getOrderWithDetails = (db, orderId) =>
  db.order.findUnique({
    where: { id: orderId },
    include: ORDER_DETAILS_INCLUDE,
  });

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getReturnEligibleUntil = (baseDate = new Date()) =>
  addDays(baseDate, DEFAULT_RETURN_WINDOW_DAYS);

const getChargeReversalKey = (itemId) => `return-charge:${itemId}`;
const getPaymentReversalKey = (itemId) => `return-payment:${itemId}`;
const getAdjustmentKey = (itemId) => `return-adjustment:${itemId}`;

const hasTrustedGatewayRefundId = (refundId) =>
  typeof refundId === 'string' && (refundId.startsWith('rfnd_') || refundId.startsWith('return_'));

const classifyRefundFailureStatus = (error) => {
  const statusCode = error?.statusCode || error?.status || error?.error?.statusCode;
  if (!statusCode || statusCode >= 500) {
    return RETURN_REFUND_STATUSES.PENDING;
  }

  return RETURN_REFUND_STATUSES.FAILED;
};

const getPaymentMetadata = (order) => {
  const reference = String(order.paymentReference || '');
  const [refOrderId, refPaymentId] = reference.includes(':') ? reference.split(':') : [null, null];

  return {
    razorpayOrderId: order.razorpayOrderId || refOrderId || null,
    razorpayPaymentId: order.razorpayPaymentId || refPaymentId || null,
  };
};

const validateReturnReason = (reason) => {
  if (!reason || !Object.values(RETURN_REASONS).includes(reason)) {
    throw buildError('A valid return reason is required');
  }
};

const calculateReturnAmount = (item, quantity) => {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity) {
    throw buildError('Invalid returned quantity');
  }

  return toNumber(item.unitPriceAtPurchase ?? item.price) * quantity;
};

const getReturnedAmount = (adjustments = []) =>
  toNumber(
    adjustments.reduce((sum, adjustment) => {
      if (adjustment.type !== 'RETURN') return sum;
      return sum + toNumber(adjustment.amount);
    }, 0)
  );

const getCancelledAmount = (items = []) =>
  toNumber(
    items.reduce((sum, item) => {
      if (item.status !== 'CANCELLED') return sum;
      return sum + toNumber(item.subtotalAtPurchase);
    }, 0)
  );

const isItemFullyReturned = (item) =>
  item.returnStatus === RETURN_STATUSES.RETURN_COMPLETED &&
  Number(item.returnedQuantity || 0) >= Number(item.quantity || 0);

export const decorateOrderWithReturnFinancials = (order) => {
  if (!order) return order;

  const returnedAmount = getReturnedAmount(order.adjustments || []);
  const cancelledAmount = getCancelledAmount(order.items || []);
  const baseTotal = toNumber(order.totalAmount);
  const originalAmount = toNumber(baseTotal + cancelledAmount);
  const payableAmount = toNumber(originalAmount - cancelledAmount - returnedAmount);

  return {
    ...order,
    financials: {
      originalAmount,
      cancelledAmount,
      returnedAmount,
      payableAmount,
    },
    items: (order.items || []).map((item) => ({
      ...item,
      isReturnEligible:
        order.status === 'DELIVERED' &&
        item.status !== 'CANCELLED' &&
        item.returnStatus === RETURN_STATUSES.NONE &&
        (!item.returnEligibleUntil || new Date(item.returnEligibleUntil) >= new Date()),
    })),
  };
};

export const requestOrderItemReturn = async ({
  buyerId,
  orderId,
  itemId,
  reason,
  notes = '',
  quantity = null,
  client = prisma,
}) =>
  client.$transaction(async (tx) => {
    validateReturnReason(reason);

    await tx.$queryRaw`SELECT "id" FROM "OrderItem" WHERE "id" = ${itemId} FOR UPDATE`;

    const item = await tx.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: true,
        product: true,
      },
    });

    if (!item || item.orderId !== orderId) {
      throw buildError('Order item not found', 404);
    }

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        invoice: true,
        issues: true,
        adjustments: true,
      },
    });

    if (!order || order.buyerId !== buyerId) {
      throw buildError('Order not found', 404);
    }

    if (order.status !== 'DELIVERED') {
      throw buildError('Only delivered items can be returned', 409);
    }

    if (item.status === 'CANCELLED') {
      throw buildError('Cancelled items cannot be returned', 409);
    }

    if (item.returnStatus !== RETURN_STATUSES.NONE) {
      throw buildError('A return has already been created for this item', 409);
    }

    const eligibleUntil =
      item.returnEligibleUntil || getReturnEligibleUntil(order.updatedAt || order.createdAt);

    if (new Date(eligibleUntil) < new Date()) {
      throw buildError('The return window has expired for this item', 409);
    }

    const requestedQuantity = quantity == null ? item.quantity : Number(quantity);
    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1 ||
      requestedQuantity > item.quantity
    ) {
      throw buildError('Invalid return quantity');
    }

    await tx.orderItem.update({
      where: { id: itemId },
      data: {
        returnStatus: RETURN_STATUSES.REQUESTED,
        returnRefundStatus: RETURN_REFUND_STATUSES.NONE,
        returnReason: reason,
        customerReturnNotes: notes?.trim() || null,
        returnedQuantity: requestedQuantity,
        returnRequestedAt: new Date(),
        returnEligibleUntil: eligibleUntil,
        rejectionReason: null,
        returnRejectedAt: null,
        decisionBy: null,
      },
    });

    const nextOrder = await getOrderWithDetails(tx, orderId);
    return {
      order: decorateOrderWithReturnFinancials(nextOrder),
      item:
        decorateOrderWithReturnFinancials(nextOrder)?.items.find((entry) => entry.id === itemId) ||
        null,
      message: 'Return requested successfully.',
    };
  });

export const approveOrderItemReturn = async ({
  wholesalerId,
  decisionBy,
  orderId,
  itemId,
  client = prisma,
}) =>
  client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OrderItem" WHERE "id" = ${itemId} FOR UPDATE`;

    const item = await tx.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true, product: true },
    });

    if (!item || item.orderId !== orderId) {
      throw buildError('Order item not found', 404);
    }

    if (item.order.sellerId !== wholesalerId) {
      throw buildError('Not authorized to approve this return', 403);
    }

    if (item.returnStatus === RETURN_STATUSES.APPROVED) {
      const nextOrder = await getOrderWithDetails(tx, orderId);
      return {
        order: decorateOrderWithReturnFinancials(nextOrder),
        item:
          decorateOrderWithReturnFinancials(nextOrder)?.items.find(
            (entry) => entry.id === itemId
          ) || null,
        message: 'Return already approved.',
      };
    }

    if (item.returnStatus !== RETURN_STATUSES.REQUESTED) {
      throw buildError('Only requested returns can be approved', 409);
    }

    const refundAmountSnapshot = calculateReturnAmount(
      item,
      item.returnedQuantity || item.quantity
    );

    await tx.orderItem.update({
      where: { id: itemId },
      data: {
        returnStatus: RETURN_STATUSES.APPROVED,
        returnApprovedAt: new Date(),
        decisionBy,
        refundAmountSnapshot,
        returnRefundStatus:
          item.order.paymentMethod === 'PREPAID'
            ? RETURN_REFUND_STATUSES.PENDING
            : RETURN_REFUND_STATUSES.NONE,
      },
    });

    const nextOrder = await getOrderWithDetails(tx, orderId);
    return {
      order: decorateOrderWithReturnFinancials(nextOrder),
      item:
        decorateOrderWithReturnFinancials(nextOrder)?.items.find((entry) => entry.id === itemId) ||
        null,
      message: 'Return approved successfully.',
    };
  });

export const rejectOrderItemReturn = async ({
  wholesalerId,
  decisionBy,
  orderId,
  itemId,
  rejectionReason,
  client = prisma,
}) =>
  client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OrderItem" WHERE "id" = ${itemId} FOR UPDATE`;

    const item = await tx.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });

    if (!item || item.orderId !== orderId) {
      throw buildError('Order item not found', 404);
    }

    if (item.order.sellerId !== wholesalerId) {
      throw buildError('Not authorized to reject this return', 403);
    }

    if (item.returnStatus === RETURN_STATUSES.REJECTED) {
      const nextOrder = await getOrderWithDetails(tx, orderId);
      return {
        order: decorateOrderWithReturnFinancials(nextOrder),
        item:
          decorateOrderWithReturnFinancials(nextOrder)?.items.find(
            (entry) => entry.id === itemId
          ) || null,
        message: 'Return already rejected.',
      };
    }

    if (item.returnStatus !== RETURN_STATUSES.REQUESTED) {
      throw buildError('Only requested returns can be rejected', 409);
    }

    await tx.orderItem.update({
      where: { id: itemId },
      data: {
        returnStatus: RETURN_STATUSES.REJECTED,
        returnRejectedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
        decisionBy,
      },
    });

    const nextOrder = await getOrderWithDetails(tx, orderId);
    return {
      order: decorateOrderWithReturnFinancials(nextOrder),
      item:
        decorateOrderWithReturnFinancials(nextOrder)?.items.find((entry) => entry.id === itemId) ||
        null,
      message: 'Return rejected successfully.',
    };
  });

const getNextOrderStatus = (items = []) => {
  const eligibleItems = items.filter((item) => item.status !== 'CANCELLED');
  if (eligibleItems.length > 0 && eligibleItems.every(isItemFullyReturned)) {
    return 'RETURN_COMPLETED';
  }

  return 'DELIVERED';
};

export const processReturnRefund = async ({ wholesalerId, orderId, itemId, client = prisma }) => {
  const order = await getOrderWithDetails(client, orderId);
  if (!order) {
    throw buildError('Order not found', 404);
  }

  if (order.sellerId !== wholesalerId) {
    throw buildError('Not authorized to process this return', 403);
  }

  const item = order.items.find((entry) => entry.id === itemId);
  if (!item) {
    throw buildError('Order item not found', 404);
  }

  if (item.returnStatus !== RETURN_STATUSES.RECEIVED) {
    throw buildError('Only received returns can be refunded', 409);
  }

  if (order.paymentMethod !== 'PREPAID') {
    const decoratedOrder = decorateOrderWithReturnFinancials(order);
    return {
      order: decoratedOrder,
      item: decoratedOrder.items.find((entry) => entry.id === itemId) || item,
      message: 'No prepaid refund is required for this return.',
    };
  }

  if (
    item.returnRefundStatus === RETURN_REFUND_STATUSES.SUCCESS ||
    hasTrustedGatewayRefundId(item.gatewayRefundId || item.refundReference)
  ) {
    const decoratedOrder = decorateOrderWithReturnFinancials(order);
    return {
      order: decoratedOrder,
      item: decoratedOrder.items.find((entry) => entry.id === itemId) || item,
      message: 'Refund already completed.',
    };
  }

  const { razorpayPaymentId } = getPaymentMetadata(order);
  if (!razorpayPaymentId) {
    await client.orderItem.update({
      where: { id: itemId },
      data: {
        returnRefundStatus: RETURN_REFUND_STATUSES.FAILED,
        gatewayResponse: { message: 'Missing Razorpay payment id for return refund retry.' },
      },
    });
    const nextOrder = await getOrderWithDetails(client, orderId);
    return {
      order: decorateOrderWithReturnFinancials(nextOrder),
      item:
        decorateOrderWithReturnFinancials(nextOrder)?.items.find((entry) => entry.id === itemId) ||
        null,
      message: 'Refund failed. Retry is available.',
    };
  }

  const processing = await client.orderItem.updateMany({
    where: {
      id: itemId,
      returnStatus: RETURN_STATUSES.RECEIVED,
      returnRefundStatus: {
        in: [RETURN_REFUND_STATUSES.PENDING, RETURN_REFUND_STATUSES.FAILED],
      },
    },
    data: {
      returnRefundStatus: RETURN_REFUND_STATUSES.PROCESSING,
      refundAttemptCount: { increment: 1 },
      gatewayResponse: null,
    },
  });

  if (processing.count === 0) {
    const nextOrder = await getOrderWithDetails(client, orderId);
    return {
      order: decorateOrderWithReturnFinancials(nextOrder),
      item:
        decorateOrderWithReturnFinancials(nextOrder)?.items.find((entry) => entry.id === itemId) ||
        null,
      message: 'Refund is already being processed.',
    };
  }

  try {
    const razorpay = getRazorpayClient();
    const refund = await razorpay.payments.refund(razorpayPaymentId, {
      amount: toPaise(
        item.refundAmountSnapshot ??
          calculateReturnAmount(item, item.returnedQuantity || item.quantity)
      ),
      speed: 'normal',
      notes: {
        orderId,
        orderItemId: itemId,
        kind: 'return',
      },
    });

    await client.orderItem.update({
      where: { id: itemId },
      data: {
        returnRefundStatus: RETURN_REFUND_STATUSES.SUCCESS,
        refundReference: refund.id || item.refundReference,
        gatewayRefundId: refund.id || item.gatewayRefundId,
        gatewayResponse: refund,
        refundedAmount: toNumber((refund.amount || 0) / 100),
        returnStatus: RETURN_STATUSES.RETURN_COMPLETED,
        returnCompletedAt: new Date(),
      },
    });

    const currentOrder = await getOrderWithDetails(client, orderId);
    const nextStatus = getNextOrderStatus(currentOrder?.items || []);
    await client.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        paymentStatus: nextStatus === 'RETURN_COMPLETED' ? 'REFUNDED' : order.paymentStatus,
      },
    });
  } catch (error) {
    await client.orderItem.update({
      where: { id: itemId },
      data: {
        returnRefundStatus: classifyRefundFailureStatus(error),
        gatewayResponse: error?.error || { message: error?.message || 'Refund attempt failed.' },
      },
    });
  }

  const nextOrder = await getOrderWithDetails(client, orderId);
  const decoratedOrder = decorateOrderWithReturnFinancials(nextOrder);
  return {
    order: decoratedOrder,
    item: decoratedOrder?.items.find((entry) => entry.id === itemId) || null,
    message:
      decoratedOrder?.items.find((entry) => entry.id === itemId)?.returnRefundStatus ===
      RETURN_REFUND_STATUSES.SUCCESS
        ? 'Return refund completed successfully.'
        : 'Return refund failed. Retry is available.',
  };
};

export const receiveOrderItemReturn = async ({
  wholesalerId,
  orderId,
  itemId,
  client = prisma,
}) => {
  const receiptResult = await client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OrderItem" WHERE "id" = ${itemId} FOR UPDATE`;

    const item = await tx.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: true,
        product: true,
      },
    });

    if (!item || item.orderId !== orderId) {
      throw buildError('Order item not found', 404);
    }

    if (item.order.sellerId !== wholesalerId) {
      throw buildError('Not authorized to receive this return', 403);
    }

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        invoice: true,
        issues: true,
        adjustments: true,
      },
    });

    if (!order) {
      throw buildError('Order not found', 404);
    }

    if (
      item.returnStatus === RETURN_STATUSES.RETURN_COMPLETED ||
      item.returnStatus === RETURN_STATUSES.RECEIVED
    ) {
      const nextOrder = await getOrderWithDetails(tx, orderId);
      return {
        order: decorateOrderWithReturnFinancials(nextOrder),
        item:
          decorateOrderWithReturnFinancials(nextOrder)?.items.find(
            (entry) => entry.id === itemId
          ) || null,
        requiresRefund:
          item.order.paymentMethod === 'PREPAID' &&
          [RETURN_REFUND_STATUSES.PENDING, RETURN_REFUND_STATUSES.FAILED].includes(
            item.returnRefundStatus
          ),
        message: 'Return receipt already recorded.',
      };
    }

    if (item.returnStatus !== RETURN_STATUSES.APPROVED) {
      throw buildError('Only approved returns can be received', 409);
    }

    const returnQuantity = item.returnedQuantity || item.quantity;
    const returnAmount = toNumber(
      item.refundAmountSnapshot ?? calculateReturnAmount(item, returnQuantity)
    );

    await tx.product.update({
      where: { id: item.productId },
      data: {
        currentStock: { increment: returnQuantity },
      },
    });

    await tx.inventoryLog.create({
      data: {
        wholesalerId: item.order.sellerId,
        productId: item.productId,
        changeAmount: returnQuantity,
        reason: 'CUSTOMER_RETURN',
      },
    });

    await tx.orderAdjustment.create({
      data: {
        orderId,
        orderItemId: itemId,
        type: 'RETURN',
        quantity: returnQuantity,
        amount: returnAmount,
        description: `Customer return adjustment ${orderId}:${itemId}`,
        referenceKey: getAdjustmentKey(itemId),
      },
    });

    try {
      await tx.ledgerEntry.create({
        data: {
          wholesalerId: order.sellerId,
          userId: order.buyerId,
          orderId,
          amount: returnAmount,
          description: `Customer return charge reversal ${orderId}:${itemId}`,
          referenceId: order.invoice?.id || orderId,
          source: LEDGER_ENTRY_SOURCES.CUSTOMER_RETURN,
          idempotencyKey: getChargeReversalKey(itemId),
        },
      });
    } catch (error) {
      if (error?.code !== 'P2002') throw error;
    }

    if (item.order.paymentStatus === 'PAID' || item.order.paymentStatus === 'REFUND_PENDING') {
      try {
        await tx.ledgerEntry.create({
          data: {
            wholesalerId: order.sellerId,
            userId: order.buyerId,
            orderId,
            amount: -returnAmount,
            description: `Customer return settlement adjustment ${orderId}:${itemId}`,
            referenceId: order.invoice?.id || orderId,
            source:
              order.paymentMethod === 'PREPAID'
                ? LEDGER_ENTRY_SOURCES.RETURN_REFUND
                : LEDGER_ENTRY_SOURCES.RETURN_ADJUSTMENT,
            idempotencyKey: getPaymentReversalKey(itemId),
          },
        });
      } catch (error) {
        if (error?.code !== 'P2002') throw error;
      }
    }

    await tx.orderItem.update({
      where: { id: itemId },
      data: {
        inventoryRestored: true,
        returnStatus:
          order.paymentMethod === 'PREPAID'
            ? RETURN_STATUSES.RECEIVED
            : RETURN_STATUSES.RETURN_COMPLETED,
        returnReceivedAt: new Date(),
        returnCompletedAt: order.paymentMethod === 'PREPAID' ? null : new Date(),
        returnRefundStatus:
          order.paymentMethod === 'PREPAID'
            ? RETURN_REFUND_STATUSES.PENDING
            : RETURN_REFUND_STATUSES.NONE,
      },
    });

    if (order.paymentMethod !== 'PREPAID') {
      const currentOrder = await getOrderWithDetails(tx, orderId);
      await tx.order.update({
        where: { id: orderId },
        data: { status: getNextOrderStatus(currentOrder?.items || []) },
      });
    }

    const nextOrder = await getOrderWithDetails(tx, orderId);
    return {
      order: decorateOrderWithReturnFinancials(nextOrder),
      item:
        decorateOrderWithReturnFinancials(nextOrder)?.items.find((entry) => entry.id === itemId) ||
        null,
      requiresRefund: item.order.paymentMethod === 'PREPAID',
      message: 'Return receipt recorded successfully.',
    };
  });

  if (!receiptResult.requiresRefund) {
    return receiptResult;
  }

  const refunded = await processReturnRefund({
    wholesalerId,
    orderId,
    itemId,
    client,
  });

  return {
    order: refunded.order,
    item: refunded.item,
    message: receiptResult.message,
  };
};

export const retryOrderItemReturnRefund = async ({
  wholesalerId,
  orderId,
  itemId,
  client = prisma,
}) =>
  processReturnRefund({
    wholesalerId,
    orderId,
    itemId,
    client,
  });

export const getReturnWindowDateForDelivery = (baseDate = new Date()) =>
  getReturnEligibleUntil(baseDate);
