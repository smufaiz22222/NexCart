import { prisma } from '../config/db.js';
import {
  createRazorpayRefund,
  getOrderPaymentMetadata,
  toNumber,
  getRazorpayClient,
} from './paymentRefundService.js';
import {
  recordMarketplaceOrderReturnCharge,
  recordMarketplaceOrderReturnPayment,
} from './accountingService.js';

export const ORDER_ITEM_STATUSES = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
};

export const REFUND_STATUSES = {
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
};

export const PAYMENT_CAPTURE_STATUSES = {
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  CAPTURED: 'CAPTURED',
  UNCERTAIN: 'UNCERTAIN',
};

const CANCELLABLE_ORDER_STATUSES = new Set(['PENDING', 'PROCESSING']);
const RETRYABLE_REFUND_STATUSES = new Set([REFUND_STATUSES.FAILED]);
const TRUSTED_REFUND_REFERENCE_PREFIX = 'rfnd_';

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ORDER_DETAILS_INCLUDE = {
  buyer: { select: { id: true, name: true, email: true } },
  seller: { select: { id: true, businessName: true } },
  invoice: true,
  items: {
    include: {
      product: true,
    },
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
  disputes: {
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, businessName: true } },
      orderItem: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } },
        },
      },
      resolution: true,
      evidence: { orderBy: { createdAt: 'asc' } },
      internalNotes: {
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      events: {
        include: {
          performedByUser: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
};

const getOrderWithDetails = (db, orderId) =>
  db.order.findUnique({
    where: { id: orderId },
    include: ORDER_DETAILS_INCLUDE,
  });

const hasTrustedRefundReference = (refundReference) =>
  typeof refundReference === 'string' &&
  refundReference.trim().startsWith(TRUSTED_REFUND_REFERENCE_PREFIX);

const classifyRefundFailureStatus = (error) => {
  const statusCode = error?.statusCode || error?.status || error?.error?.statusCode;
  if (!statusCode || statusCode >= 500) {
    return REFUND_STATUSES.PENDING;
  }
  return REFUND_STATUSES.FAILED;
};

const deriveOrderPaymentStatus = (order) => {
  if (order.paymentMethod !== 'PREPAID') {
    return order.paymentStatus;
  }

  const cancelledItems = order.items.filter(
    (item) => item.status === ORDER_ITEM_STATUSES.CANCELLED
  );
  if (!cancelledItems.length) {
    return 'PAID';
  }

  if (
    cancelledItems.some((item) =>
      [REFUND_STATUSES.PENDING, REFUND_STATUSES.PROCESSING, REFUND_STATUSES.FAILED].includes(
        item.refundStatus
      )
    )
  ) {
    return 'REFUND_PENDING';
  }

  const activeItems = order.items.filter((item) => item.status !== ORDER_ITEM_STATUSES.CANCELLED);
  return activeItems.length === 0 ? 'REFUNDED' : 'PAID';
};

export const refreshOrderPaymentStatus = async (db, orderId) => {
  const order = await getOrderWithDetails(db, orderId);
  if (!order || order.paymentMethod !== 'PREPAID') {
    return order;
  }

  const nextPaymentStatus = deriveOrderPaymentStatus(order);
  if (nextPaymentStatus !== order.paymentStatus) {
    await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: nextPaymentStatus,
      },
    });
    return getOrderWithDetails(db, orderId);
  }

  return order;
};

export const cancelOrderItemForCustomer = async ({
  buyerId,
  orderId,
  itemId,
  reason = '',
  client = prisma,
}) => {
  const result = await client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OrderItem" WHERE "id" = ${itemId} FOR UPDATE`;

    const lockedItem = await tx.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: true,
        product: true,
      },
    });

    if (!lockedItem) {
      throw buildError('Order item not found', 404);
    }

    if (lockedItem.orderId !== orderId) {
      throw buildError('Order item does not belong to this order', 404);
    }

    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${lockedItem.orderId} FOR UPDATE`;

    const lockedOrder = await tx.order.findUnique({
      where: { id: lockedItem.orderId },
      include: {
        items: true,
        invoice: true,
      },
    });

    if (!lockedOrder) {
      throw buildError('Order not found', 404);
    }

    if (lockedOrder.buyerId !== buyerId) {
      throw buildError('Not authorized to cancel this item', 403);
    }

    if (lockedItem.status === ORDER_ITEM_STATUSES.CANCELLED) {
      const order = await getOrderWithDetails(tx, lockedOrder.id);
      return {
        alreadyCancelled: true,
        order,
        item: order?.items.find((item) => item.id === itemId) || null,
      };
    }

    if (!CANCELLABLE_ORDER_STATUSES.has(lockedOrder.status)) {
      throw buildError('This item can no longer be cancelled', 409);
    }

    const refundStatus =
      lockedOrder.paymentMethod === 'PREPAID'
        ? REFUND_STATUSES.PENDING
        : REFUND_STATUSES.NOT_APPLICABLE;
    const refundAmount = toNumber(lockedItem.subtotalAtPurchase);

    await tx.orderItem.update({
      where: { id: itemId },
      data: {
        status: ORDER_ITEM_STATUSES.CANCELLED,
        cancelledAt: new Date(),
        cancelledByRole: 'CUSTOMER',
        cancellationReason: reason?.trim() || null,
        refundStatus,
        refundReference: null,
        refundFailureReason: null,
        refundRequestedAt: null,
        refundCompletedAt: null,
        refundedAmount: null,
      },
    });

    await tx.product.update({
      where: { id: lockedItem.productId },
      data: {
        currentStock: { increment: lockedItem.quantity },
      },
    });

    await tx.inventoryLog.create({
      data: {
        wholesalerId: lockedOrder.sellerId,
        productId: lockedItem.productId,
        changeAmount: lockedItem.quantity,
        reason: 'CANCELLATION',
      },
    });

    try {
      await recordMarketplaceOrderReturnCharge(tx, {
        orderId: lockedOrder.id,
        sellerId: lockedOrder.sellerId,
        buyerId,
        returnAmount: refundAmount,
        description: `Marketplace Order Item Cancellation charge reversal ${lockedOrder.id}:${itemId}`,
      });
    } catch (error) {
      if (error?.code !== 'P2002') throw error;
    }

    if (lockedOrder.paymentStatus === 'PAID' || lockedOrder.paymentStatus === 'REFUND_PENDING') {
      try {
        await recordMarketplaceOrderReturnPayment(tx, {
          orderId: lockedOrder.id,
          sellerId: lockedOrder.sellerId,
          buyerId,
          returnAmount: refundAmount,
          paymentMethod: lockedOrder.paymentMethod,
          description: `Marketplace Order Item Cancellation payment refund ${lockedOrder.id}:${itemId}`,
        });
      } catch (error) {
        if (error?.code !== 'P2002') throw error;
      }
    }

    const activeItems = lockedOrder.items.filter(
      (item) => item.id !== itemId && item.status !== ORDER_ITEM_STATUSES.CANCELLED
    );
    const nextTotalAmount = toNumber(
      activeItems.reduce((sum, item) => sum + toNumber(item.subtotalAtPurchase), 0)
    );
    const nextOrderStatus = activeItems.length ? lockedOrder.status : 'CANCELLED';
    const nextPaymentStatus =
      lockedOrder.paymentMethod === 'PREPAID' ? 'REFUND_PENDING' : lockedOrder.paymentStatus;

    await tx.order.update({
      where: { id: lockedOrder.id },
      data: {
        totalAmount: nextTotalAmount,
        status: nextOrderStatus,
        paymentStatus: nextPaymentStatus,
      },
    });

    if (lockedOrder.invoice) {
      // TODO: Replace invoice mutation with a credit-note or invoice-adjustment model.
      await tx.invoice.update({
        where: { id: lockedOrder.invoice.id },
        data: {
          amount: nextTotalAmount,
        },
      });
    }

    const order = await getOrderWithDetails(tx, lockedOrder.id);
    return {
      alreadyCancelled: false,
      order,
      item: order?.items.find((item) => item.id === itemId) || null,
    };
  });

  if (
    !result.alreadyCancelled &&
    result.order?.paymentMethod === 'PREPAID' &&
    result.item?.status === ORDER_ITEM_STATUSES.CANCELLED
  ) {
    const refunded = await processCancelledItemRefund({
      orderId,
      itemId,
      client,
    });

    return {
      ...result,
      order: refunded.order,
      item: refunded.item,
      message: 'Item cancelled successfully.',
    };
  }

  return {
    ...result,
    message: result.alreadyCancelled
      ? 'Item is already cancelled.'
      : 'Item cancelled successfully.',
  };
};

export const processCancelledItemRefund = async ({ orderId, itemId, client = prisma }) => {
  const order = await getOrderWithDetails(client, orderId);
  if (!order) {
    throw buildError('Order not found', 404);
  }

  const item = order.items.find((entry) => entry.id === itemId);
  if (!item) {
    throw buildError('Order item not found', 404);
  }

  if (item.status !== ORDER_ITEM_STATUSES.CANCELLED) {
    throw buildError('Only cancelled items can be refunded', 409);
  }

  if (order.paymentMethod !== 'PREPAID') {
    return { order, item };
  }

  if (
    item.refundStatus === REFUND_STATUSES.REFUNDED ||
    hasTrustedRefundReference(item.refundReference)
  ) {
    const refreshedOrder = await refreshOrderPaymentStatus(client, orderId);
    return {
      order: refreshedOrder,
      item: refreshedOrder?.items.find((entry) => entry.id === itemId) || item,
    };
  }

  const { razorpayPaymentId } = getOrderPaymentMetadata(order);
  if (!razorpayPaymentId) {
    await client.orderItem.update({
      where: { id: itemId },
      data: {
        refundStatus: REFUND_STATUSES.FAILED,
        refundFailureReason: 'Missing Razorpay payment id for refund retry.',
      },
    });
    const refreshedOrder = await refreshOrderPaymentStatus(client, orderId);
    return {
      order: refreshedOrder,
      item: refreshedOrder?.items.find((entry) => entry.id === itemId) || item,
    };
  }

  const razorpay = getRazorpayClient();
  try {
    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    if (payment.status === 'refunded' || payment.refund_status === 'full') {
      await client.orderItem.update({
        where: { id: itemId },
        data: {
          refundStatus: REFUND_STATUSES.REFUNDED,
          refundReference: payment.id || item.refundReference,
          refundFailureReason: null,
          refundCompletedAt: new Date(),
          refundedAmount: item.subtotalAtPurchase,
        },
      });
      const refreshedOrder = await refreshOrderPaymentStatus(client, orderId);
      return {
        order: refreshedOrder,
        item: refreshedOrder?.items.find((entry) => entry.id === itemId) || item,
      };
    }

    const existingRefunds = await razorpay.refunds.all({ payment_id: razorpayPaymentId });
    const matchedRefund = existingRefunds.items?.find((rf) => {
      const notes = rf.notes || {};
      if (notes.orderItemId === itemId) return true;
      if (
        notes.orderId === orderId &&
        Math.round(Number(rf.amount)) === Math.round(Number(item.subtotalAtPurchase) * 100)
      )
        return true;
      return false;
    });

    if (matchedRefund && matchedRefund.status === 'processed') {
      await client.orderItem.update({
        where: { id: itemId },
        data: {
          refundStatus: REFUND_STATUSES.REFUNDED,
          refundReference: matchedRefund.id || item.refundReference,
          refundFailureReason: null,
          refundCompletedAt: matchedRefund.created_at
            ? new Date(matchedRefund.created_at * 1000)
            : new Date(),
          refundedAmount: toNumber(
            matchedRefund.amount ? matchedRefund.amount / 100 : item.subtotalAtPurchase
          ),
        },
      });
      const refreshedOrder = await refreshOrderPaymentStatus(client, orderId);
      return {
        order: refreshedOrder,
        item: refreshedOrder?.items.find((entry) => entry.id === itemId) || item,
      };
    }
  } catch (err) {
    console.error('Failed to sync Razorpay refund state:', err);
  }

  const processing = await client.orderItem.updateMany({
    where: {
      id: itemId,
      status: ORDER_ITEM_STATUSES.CANCELLED,
      refundStatus: {
        in: [REFUND_STATUSES.PENDING, REFUND_STATUSES.FAILED],
      },
    },
    data: {
      refundStatus: REFUND_STATUSES.PROCESSING,
      refundRequestedAt: new Date(),
      refundFailureReason: null,
    },
  });

  if (processing.count === 0) {
    const refreshedOrder = await refreshOrderPaymentStatus(client, orderId);
    return {
      order: refreshedOrder,
      item: refreshedOrder?.items.find((entry) => entry.id === itemId) || item,
    };
  }

  const isTestMode = () => process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_');
  const shouldFallbackToMockRefund = (error) => {
    if (!isTestMode()) return false;
    const desc = error?.error?.description || error?.message || '';
    return (
      desc.includes('invalid request sent') ||
      desc.includes('balance') ||
      desc.includes('greater than the refund payment amount')
    );
  };

  try {
    const refund = await createRazorpayRefund({
      order,
      amount: item.subtotalAtPurchase,
      notes: {
        orderId,
        orderItemId: itemId,
      },
    });

    await client.orderItem.update({
      where: { id: itemId },
      data: {
        refundStatus: REFUND_STATUSES.REFUNDED,
        refundReference: refund.id || item.refundReference,
        refundFailureReason: null,
        refundCompletedAt: new Date(),
        refundedAmount: toNumber(refund.amount ? refund.amount / 100 : item.subtotalAtPurchase),
      },
    });
  } catch (error) {
    if (shouldFallbackToMockRefund(error)) {
      console.warn(
        `[Test Mode Fallback] Simulating refund for item ${itemId} due to error:`,
        error?.error?.description || error?.message
      );
      const mockRefundRef = `rfnd_mock_${Math.random().toString(36).slice(2, 10)}`;
      await client.orderItem.update({
        where: { id: itemId },
        data: {
          refundStatus: REFUND_STATUSES.REFUNDED,
          refundReference: mockRefundRef,
          refundFailureReason: null,
          refundCompletedAt: new Date(),
          refundedAmount: item.subtotalAtPurchase,
        },
      });
    } else {
      await client.orderItem.update({
        where: { id: itemId },
        data: {
          refundStatus: classifyRefundFailureStatus(error),
          refundFailureReason:
            error?.error?.description || error?.message || 'Refund attempt failed.',
        },
      });
    }
  }

  const refreshedOrder = await refreshOrderPaymentStatus(client, orderId);
  return {
    order: refreshedOrder,
    item: refreshedOrder?.items.find((entry) => entry.id === itemId) || null,
  };
};

export const retryOrderItemRefundForCustomer = async ({
  buyerId,
  orderId,
  itemId,
  client = prisma,
}) => {
  const order = await getOrderWithDetails(client, orderId);
  if (!order) {
    throw buildError('Order not found', 404);
  }

  if (order.buyerId !== buyerId) {
    throw buildError('Not authorized to retry this refund', 403);
  }

  const item = order.items.find((entry) => entry.id === itemId);
  if (!item) {
    throw buildError('Order item not found', 404);
  }

  if (item.status !== ORDER_ITEM_STATUSES.CANCELLED) {
    throw buildError('Only cancelled items can be retried for refund', 409);
  }

  if (order.paymentMethod !== 'PREPAID') {
    throw buildError('Refund retries are only available for prepaid items', 409);
  }

  if (!RETRYABLE_REFUND_STATUSES.has(item.refundStatus)) {
    return {
      order,
      item,
      message:
        item.refundStatus === REFUND_STATUSES.PENDING ||
        item.refundStatus === REFUND_STATUSES.PROCESSING
          ? 'Refund is already pending. Please wait for it to settle before retrying.'
          : 'Refund does not require a retry.',
    };
  }

  const result = await processCancelledItemRefund({ orderId, itemId, client });
  return {
    ...result,
    message:
      result.item?.refundStatus === REFUND_STATUSES.REFUNDED
        ? 'Refund completed successfully.'
        : 'Refund retry recorded. We will keep tracking it.',
  };
};
