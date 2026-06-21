import crypto from 'crypto';
import { prisma } from '../config/db.js';
import {
  ORDER_ITEM_STATUSES,
  PAYMENT_CAPTURE_STATUSES,
  REFUND_STATUSES,
  refreshOrderPaymentStatus,
} from './orderCancellationService.js';
import { recordMarketplaceOrderPayment } from './accountingService.js';

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toNumber = (value) => Number(Number(value || 0).toFixed(2));

const resolveWebhookSecret = () => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw buildError('Razorpay webhook secret is not configured', 500);
  }
  return secret;
};

const parseWebhookBody = (rawBody) => {
  if (!rawBody) {
    throw buildError('Webhook body is required', 400);
  }

  const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  try {
    return JSON.parse(text);
  } catch {
    throw buildError('Webhook body must be valid JSON', 400);
  }
};

export const verifyRazorpayWebhookSignature = ({
  rawBody,
  signature,
  secret = resolveWebhookSecret(),
}) => {
  if (!signature) {
    throw buildError('Missing Razorpay webhook signature', 400);
  }

  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (signature !== expectedSignature) {
    throw buildError('Invalid Razorpay webhook signature', 401);
  }
};

const mapRefundState = (refundEntity, eventName) => {
  const normalizedStatus = String(refundEntity?.status || '').toLowerCase();

  if (normalizedStatus === 'processed') {
    return REFUND_STATUSES.REFUNDED;
  }

  if (normalizedStatus === 'failed') {
    return REFUND_STATUSES.FAILED;
  }

  if (eventName === 'refund.created') {
    return REFUND_STATUSES.PROCESSING;
  }

  return REFUND_STATUSES.PENDING;
};

const buildRefundFailureReason = (refundEntity) =>
  refundEntity?.error_description ||
  refundEntity?.acquirer_data?.arn ||
  refundEntity?.notes?.failureReason ||
  'Refund is pending confirmation from Razorpay.';

const buildPaymentReferenceMatch = (paymentId) => [
  { razorpayPaymentId: paymentId },
  { paymentReference: paymentId },
  { paymentReference: { endsWith: `:${paymentId}` } },
];

const updateRefundMetadata = async ({ client, itemId, refundEntity, refundStatus }) => {
  const data = {
    refundStatus,
    refundReference: refundEntity.id || null,
    refundFailureReason: null,
  };

  if (refundEntity?.created_at) {
    data.refundRequestedAt = new Date(refundEntity.created_at * 1000);
  }

  if (refundStatus === REFUND_STATUSES.REFUNDED) {
    data.refundCompletedAt = refundEntity?.processed_at
      ? new Date(refundEntity.processed_at * 1000)
      : new Date();
    data.refundedAmount = toNumber((refundEntity.amount || 0) / 100);
    data.refundFailureReason = null;
  } else if (refundStatus === REFUND_STATUSES.FAILED) {
    data.refundCompletedAt = null;
    data.refundFailureReason = buildRefundFailureReason(refundEntity);
  } else {
    data.refundCompletedAt = null;
    data.refundFailureReason = buildRefundFailureReason(refundEntity);
  }

  await client.orderItem.update({
    where: { id: itemId },
    data,
  });
};

const findCandidateOrderFromRefund = async ({ client, refundEntity }) => {
  const notes = refundEntity?.notes || {};
  const orderId = notes.orderId || null;
  const orderItemId = notes.orderItemId || null;

  if (orderId && orderItemId) {
    const order = await client.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (order?.items.some((item) => item.id === orderItemId)) {
      return { orderId, itemId: orderItemId };
    }
  }

  if (refundEntity?.id) {
    const order = await client.order.findFirst({
      where: {
        items: {
          some: {
            refundReference: refundEntity.id,
          },
        },
      },
      include: { items: true },
    });

    const matchedItem = order?.items.find((item) => item.refundReference === refundEntity.id);
    if (order && matchedItem) {
      return { orderId: order.id, itemId: matchedItem.id };
    }
  }

  const paymentId = refundEntity?.payment_id || refundEntity?.paymentId || null;
  if (!paymentId) {
    return null;
  }

  const orders = await client.order.findMany({
    where: {
      OR: buildPaymentReferenceMatch(paymentId),
      paymentMethod: 'PREPAID',
      items: {
        some: {
          status: ORDER_ITEM_STATUSES.CANCELLED,
          refundStatus: {
            in: [REFUND_STATUSES.PENDING, REFUND_STATUSES.PROCESSING, REFUND_STATUSES.FAILED],
          },
        },
      },
    },
    include: { items: true },
  });

  const amount = toNumber((refundEntity?.amount || 0) / 100);
  const candidates = orders.flatMap((order) =>
    order.items
      .filter(
        (item) =>
          item.status === ORDER_ITEM_STATUSES.CANCELLED &&
          [REFUND_STATUSES.PENDING, REFUND_STATUSES.PROCESSING, REFUND_STATUSES.FAILED].includes(
            item.refundStatus
          ) &&
          (toNumber(item.subtotalAtPurchase) === amount || !amount)
      )
      .map((item) => ({ orderId: order.id, itemId: item.id }))
  );

  return candidates.length === 1 ? candidates[0] : null;
};

const syncRefundEvent = async ({ eventName, payload, client }) => {
  const refundEntity = payload?.refund?.entity;
  if (!refundEntity?.id) {
    return { handled: false, reason: 'Missing refund entity' };
  }

  const candidate = await findCandidateOrderFromRefund({ client, refundEntity });
  if (!candidate) {
    return { handled: false, reason: 'Refund could not be matched to a cancelled order item' };
  }

  const order = await client.order.findUnique({
    where: { id: candidate.orderId },
    include: { items: true },
  });

  const item = order?.items.find((entry) => entry.id === candidate.itemId);
  if (!order || !item || item.status !== ORDER_ITEM_STATUSES.CANCELLED) {
    return { handled: false, reason: 'Refund matched no cancellable item' };
  }

  const refundStatus = mapRefundState(refundEntity, eventName);
  const alreadyInTerminalState =
    item.refundStatus === REFUND_STATUSES.REFUNDED &&
    item.refundReference === refundEntity.id &&
    refundStatus === REFUND_STATUSES.REFUNDED;

  if (!alreadyInTerminalState) {
    await updateRefundMetadata({
      client,
      itemId: item.id,
      refundEntity,
      refundStatus,
    });
  }

  await refreshOrderPaymentStatus(client, order.id);

  return {
    handled: true,
    orderId: order.id,
    itemId: item.id,
    refundStatus,
  };
};

const syncPaymentCapturedEvent = async ({ payload, client }) => {
  const paymentEntity = payload?.payment?.entity;
  const paymentId = paymentEntity?.id;
  if (!paymentId) {
    return { handled: false, reason: 'Missing payment entity' };
  }

  // Find prepaid orders that are not yet marked as PAID
  const candidateOrders = await client.order.findMany({
    where: {
      OR: buildPaymentReferenceMatch(paymentId),
      paymentMethod: 'PREPAID',
      paymentStatus: { not: 'PAID' },
    },
    include: { invoice: true },
  });

  if (candidateOrders.length === 0) {
    return { handled: false, reason: 'No pending matching prepaid orders found' };
  }

  for (const order of candidateOrders) {
    await client.$transaction(async (tx) => {
      // Re-fetch with a lock/check to ensure idempotency
      const lockedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { invoice: true },
      });

      if (!lockedOrder || lockedOrder.paymentStatus === 'PAID') {
        return;
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentCaptureStatus: PAYMENT_CAPTURE_STATUSES.CAPTURED,
          paymentStatus: 'PAID',
          status: lockedOrder.status === 'PENDING' ? 'PROCESSING' : lockedOrder.status,
        },
      });

      // Record double-entry payment
      await recordMarketplaceOrderPayment(tx, {
        orderId: lockedOrder.id,
        sellerId: lockedOrder.sellerId,
        settlementAmount: toNumber(lockedOrder.totalAmount),
        paymentMethod: 'PREPAID',
      });
    });
  }

  return {
    handled: true,
    paymentId,
    updatedOrders: candidateOrders.length,
  };
};

const syncPaymentFailedEvent = async ({ payload, client }) => {
  const paymentEntity = payload?.payment?.entity;
  const razorpayOrderId = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;

  if (!razorpayOrderId) {
    return { handled: false, reason: 'Missing Razorpay order id' };
  }

  const result = await client.prepaidCheckoutSession.updateMany({
    where: { razorpayOrderId },
    data: {
      paymentStatus: 'FAILED',
      paymentReference: paymentId || null,
    },
  });

  return {
    handled: result.count > 0,
    razorpayOrderId,
    updatedSessions: result.count,
  };
};

export const handleRazorpayWebhook = async ({ rawBody, signature, client = prisma, secret }) => {
  verifyRazorpayWebhookSignature({ rawBody, signature, secret });
  const event = parseWebhookBody(rawBody);
  const eventName = String(event?.event || '');

  switch (eventName) {
    case 'refund.created':
    case 'refund.processed':
    case 'refund.failed':
      return {
        event: eventName,
        ...(await syncRefundEvent({ eventName, payload: event.payload, client })),
      };
    case 'payment.captured':
      return {
        event: eventName,
        ...(await syncPaymentCapturedEvent({ payload: event.payload, client })),
      };
    case 'payment.failed':
      return {
        event: eventName,
        ...(await syncPaymentFailedEvent({ payload: event.payload, client })),
      };
    default:
      return {
        event: eventName,
        handled: false,
        reason: 'Event ignored',
      };
  }
};
