import { prisma } from '../config/db.js';
import { decorateOrderWithReturnFinancials } from './orderReturnService.js';
import { createRazorpayRefund, toNumber } from './paymentRefundService.js';
import { createNotification, createWholesalerNotification } from './notificationService.js';

const DISPUTE_STATUSES = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
};

const DISPUTE_RESOLUTION_TYPES = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  PARTIAL_REFUND: 'PARTIAL_REFUND',
};

const DISPUTE_EVENT_TYPES = {
  OPENED: 'OPENED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  NOTE_ADDED: 'NOTE_ADDED',
  RESOLUTION_CREATED: 'RESOLUTION_CREATED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PARTIAL_REFUND: 'PARTIAL_REFUND',
};

const ACTIVE_RETURN_STATUSES = new Set(['REQUESTED', 'APPROVED', 'RECEIVED']);
const ACTIVE_DISPUTE_STATUSES = new Set([DISPUTE_STATUSES.OPEN, DISPUTE_STATUSES.UNDER_REVIEW]);
const MAX_DISPUTES_PER_WINDOW = Number(process.env.DISPUTE_MAX_PER_WINDOW || 5);
const DISPUTE_WINDOW_HOURS = Number(process.env.DISPUTE_WINDOW_HOURS || 24);
const MAX_EVIDENCE_URLS = Number(process.env.DISPUTE_MAX_EVIDENCE_URLS || 5);
const DESCRIPTION_MIN_LENGTH = Number(process.env.DISPUTE_DESCRIPTION_MIN_LENGTH || 12);
const DESCRIPTION_MAX_LENGTH = Number(process.env.DISPUTE_DESCRIPTION_MAX_LENGTH || 1000);
const NOTE_MAX_LENGTH = Number(process.env.DISPUTE_INTERNAL_NOTE_MAX_LENGTH || 1000);

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const sanitizeText = (value) =>
  String(value || '')
    .trim()
    .replace(/[<>]/g, '');

const isValidUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export const ORDER_DISPUTE_INCLUDE = {
  buyer: { select: { id: true, name: true, email: true } },
  seller: { select: { id: true, businessName: true } },
  invoice: true,
  items: {
    include: {
      product: true,
      disputes: {
        include: {
          orderItem: {
            include: {
              product: { select: { id: true, name: true, imageUrl: true } },
            },
          },
        },
      },
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
  adjustments: {
    orderBy: { createdAt: 'asc' },
  },
};

const getOrderWithDetails = (db, orderId) =>
  db.order.findUnique({
    where: { id: orderId },
    include: ORDER_DISPUTE_INCLUDE,
  });

const getExistingDisputesForItem = (order, itemId) =>
  (order?.disputes || []).filter((entry) => entry.orderItemId === itemId);

const getRemainingRefundableAmount = (item) =>
  Math.max(0, toNumber(item?.subtotalAtPurchase) - toNumber(item?.refundedAmount));

const isFullyRefunded = (item) => getRemainingRefundableAmount(item) <= 0;

const buildEligibilityFlags = ({ order, item, disputes = [] }) => {
  const activeDispute = disputes.find((entry) => ACTIVE_DISPUTE_STATUSES.has(entry.status));
  const hasAnyDispute = disputes.length > 0;
  const isDelivered = order?.status === 'DELIVERED';
  const activeReturn = ACTIVE_RETURN_STATUSES.has(item?.returnStatus);
  const fullyReturnedAndRefunded =
    item?.returnStatus === 'RETURN_COMPLETED' &&
    ['SUCCESS', 'REFUNDED'].includes(item?.returnRefundStatus || item?.refundStatus);

  return {
    isDelivered,
    isCancelled: item?.status === 'CANCELLED',
    hasActiveDispute: Boolean(activeDispute),
    hasExistingDispute: hasAnyDispute,
    isFullyRefunded: isFullyRefunded(item),
    hasActiveReturn: activeReturn,
    fullyReturnedAndRefunded,
    canOpen:
      Boolean(order && item) &&
      isDelivered &&
      item.status !== 'CANCELLED' &&
      !activeDispute &&
      !hasAnyDispute &&
      !isFullyRefunded(item) &&
      !activeReturn &&
      !fullyReturnedAndRefunded,
    blockedReasons: [
      !isDelivered ? 'Only delivered items can be disputed.' : null,
      item?.status === 'CANCELLED' ? 'Cancelled items cannot be disputed.' : null,
      activeDispute ? 'An active dispute already exists for this item.' : null,
      !activeDispute && hasAnyDispute ? 'This item already has a dispute record.' : null,
      isFullyRefunded(item) ? 'This item has already been fully refunded.' : null,
      activeReturn ? 'Finish the active return workflow before opening a dispute.' : null,
      fullyReturnedAndRefunded ? 'Fully returned and refunded items cannot be disputed.' : null,
    ].filter(Boolean),
  };
};

const validateDescription = (description) => {
  const sanitized = sanitizeText(description);
  if (!sanitized) {
    throw buildError('Description is required.', 400);
  }
  if (sanitized.length < DESCRIPTION_MIN_LENGTH) {
    throw buildError(
      `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters long.`,
      422
    );
  }
  if (sanitized.length > DESCRIPTION_MAX_LENGTH) {
    throw buildError(`Description must be at most ${DESCRIPTION_MAX_LENGTH} characters long.`, 422);
  }
  return sanitized;
};

const validateEvidenceUrls = (evidenceUrls = []) => {
  if (evidenceUrls == null) return [];
  if (!Array.isArray(evidenceUrls)) {
    throw buildError('Evidence must be provided as an array of URLs.', 400);
  }

  const normalized = evidenceUrls.map((value) => String(value || '').trim()).filter(Boolean);
  const unique = [...new Set(normalized)];

  if (unique.length > MAX_EVIDENCE_URLS) {
    throw buildError(`A maximum of ${MAX_EVIDENCE_URLS} evidence URLs is allowed.`, 422);
  }

  for (const url of unique) {
    if (!isValidUrl(url)) {
      throw buildError('Evidence URLs must be valid http or https URLs.', 400);
    }
  }

  return unique;
};

const validateUpdatedAtToken = (currentUpdatedAt, providedUpdatedAt) => {
  if (!providedUpdatedAt) {
    throw buildError('updatedAt is required for seller mutations.', 409);
  }

  const currentIso = new Date(currentUpdatedAt).toISOString();
  const providedIso = new Date(providedUpdatedAt).toISOString();
  if (currentIso !== providedIso) {
    throw buildError('This dispute was updated elsewhere. Refresh and try again.', 409);
  }
};

const createEvent = async ({ tx, disputeId, type, performedByUserId = null, notes = null }) =>
  tx.disputeEvent.create({
    data: {
      disputeId,
      type,
      performedByUserId,
      notes: notes ? sanitizeText(notes) : null,
    },
  });

const serializeTimelineEntry = (entry) => ({
  id: entry.id,
  type: entry.type,
  workflow: 'DISPUTE',
  occurredAt: entry.createdAt,
  notes: entry.notes || null,
  actor: entry.performedByUser
    ? {
        id: entry.performedByUser.id,
        name: entry.performedByUser.name,
        email: entry.performedByUser.email,
        role: entry.performedByUser.role,
      }
    : null,
});

const buildDisputeTimeline = (dispute) =>
  [...(dispute?.events || [])]
    .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
    .map(serializeTimelineEntry);

const serializeResolution = (resolution) =>
  resolution
    ? {
        id: resolution.id,
        disputeId: resolution.disputeId,
        resolvedByUserId: resolution.resolvedByUserId,
        resolvedByRole: resolution.resolvedByRole,
        resolutionType: resolution.resolutionType,
        resolutionNotes: resolution.resolutionNotes,
        resolutionAmount: resolution.resolutionAmount,
        refundId: resolution.refundId,
        ledgerEntryId: resolution.ledgerEntryId,
        createdAt: resolution.createdAt,
      }
    : null;

export const serializeDispute = (dispute, viewerRole = 'CUSTOMER') => ({
  id: dispute.id,
  orderId: dispute.orderId,
  orderItemId: dispute.orderItemId,
  buyerId: dispute.buyerId,
  sellerId: dispute.sellerId,
  status: dispute.status,
  reason: dispute.reason,
  description: dispute.description,
  openedAt: dispute.openedAt,
  respondedAt: dispute.respondedAt,
  dueAt: dispute.dueAt,
  createdAt: dispute.createdAt,
  updatedAt: dispute.updatedAt,
  item: dispute.orderItem
    ? {
        id: dispute.orderItem.id,
        quantity: dispute.orderItem.quantity,
        product: dispute.orderItem.product
          ? {
              id: dispute.orderItem.product.id,
              name: dispute.orderItem.product.name,
              imageUrl: dispute.orderItem.product.imageUrl,
            }
          : null,
      }
    : null,
  evidence: (dispute.evidence || []).map((entry) => ({
    id: entry.id,
    url: entry.url,
    createdAt: entry.createdAt,
  })),
  latestResolution: serializeResolution(dispute.resolution),
  timeline: buildDisputeTimeline(dispute),
  internalNotes:
    viewerRole === 'WHOLESALER'
      ? (dispute.internalNotes || []).map((note) => ({
          id: note.id,
          note: note.note,
          createdAt: note.createdAt,
          author: note.author
            ? {
                id: note.author.id,
                name: note.author.name,
                email: note.author.email,
              }
            : null,
        }))
      : [],
  isTerminal: dispute.status === DISPUTE_STATUSES.RESOLVED,
});

export const decorateOrderWithDisputes = (order, viewerRole = 'CUSTOMER') => {
  if (!order) return order;

  const decorated = decorateOrderWithReturnFinancials(order);
  const disputes = (order.disputes || []).map((dispute) => serializeDispute(dispute, viewerRole));

  return {
    ...decorated,
    disputes,
    items: (decorated.items || []).map((item) => {
      const itemDisputes = disputes.filter((entry) => entry.orderItemId === item.id);
      return {
        ...item,
        disputes: itemDisputes,
        disputeEligibility: buildEligibilityFlags({
          order: decorated,
          item,
          disputes: order.disputes?.filter((entry) => entry.orderItemId === item.id) || [],
        }),
      };
    }),
  };
};

const buildDisputeResponse = ({ order, dispute, viewerRole }) => {
  const decoratedOrder = decorateOrderWithDisputes(order, viewerRole);
  const serializedDispute =
    decoratedOrder?.disputes?.find((entry) => entry.id === dispute.id) ||
    serializeDispute(dispute, viewerRole);
  const sourceItem =
    decoratedOrder?.items?.find((entry) => entry.id === dispute.orderItemId) || null;

  return {
    order: decoratedOrder,
    dispute: serializedDispute,
    latestResolution: serializedDispute.latestResolution,
    timeline: serializedDispute.timeline,
    eligibility: sourceItem?.disputeEligibility || null,
    validation: {
      descriptionMinLength: DESCRIPTION_MIN_LENGTH,
      descriptionMaxLength: DESCRIPTION_MAX_LENGTH,
      maxEvidenceUrls: MAX_EVIDENCE_URLS,
    },
  };
};

const getDisputeById = async (db, disputeId) =>
  db.dispute.findUnique({
    where: { id: disputeId },
    include: ORDER_DISPUTE_INCLUDE.disputes.include,
  });

const requireSellerOwnership = (dispute, wholesalerId) => {
  if (!dispute || dispute.sellerId !== wholesalerId) {
    throw buildError('You do not have permission to modify this dispute.', 403);
  }
};

const validateResolutionRequest = ({ dispute, allowDirectResolution, resolutionType }) => {
  if (!Object.values(DISPUTE_RESOLUTION_TYPES).includes(resolutionType)) {
    throw buildError('Invalid resolution type.', 400);
  }

  if (dispute.status === DISPUTE_STATUSES.RESOLVED) {
    throw buildError('Resolved disputes cannot be modified.', 422);
  }

  if (dispute.status === DISPUTE_STATUSES.OPEN && !allowDirectResolution) {
    throw buildError(
      'Direct resolution from OPEN requires explicit allowDirectResolution=true.',
      422
    );
  }

  if (
    dispute.status !== DISPUTE_STATUSES.UNDER_REVIEW &&
    dispute.status !== DISPUTE_STATUSES.OPEN
  ) {
    throw buildError('Only OPEN or UNDER_REVIEW disputes can be resolved.', 422);
  }
};

const getResolutionAmount = ({ resolutionType, item, resolutionAmount }) => {
  if (resolutionType === DISPUTE_RESOLUTION_TYPES.REJECT) {
    return null;
  }

  const remainingRefundableAmount = getRemainingRefundableAmount(item);
  if (remainingRefundableAmount <= 0) {
    return null;
  }

  if (resolutionType === DISPUTE_RESOLUTION_TYPES.APPROVE) {
    return remainingRefundableAmount;
  }

  const parsed = toNumber(resolutionAmount);
  if (!(parsed > 0)) {
    throw buildError('Partial refund amount must be greater than zero.', 422);
  }
  if (parsed > toNumber(item.subtotalAtPurchase)) {
    throw buildError('Partial refund amount cannot exceed the item total.', 422);
  }
  if (parsed > remainingRefundableAmount) {
    throw buildError('Partial refund amount exceeds the remaining refundable amount.', 422);
  }
  return parsed;
};

const appendRefundAuditNote = async ({ disputeId, performedByUserId, note, client }) => {
  try {
    await client.disputeEvent.create({
      data: {
        disputeId,
        type: DISPUTE_EVENT_TYPES.NOTE_ADDED,
        performedByUserId,
        notes: sanitizeText(note),
      },
    });
  } catch (error) {
    console.error('Dispute refund audit note failed:', error);
  }
};

const processResolvedDisputeRefund = async ({
  disputeId,
  orderId,
  orderItemId,
  resolutionId,
  resolutionAmount,
  resolvedByUserId,
  client = prisma,
}) => {
  if (!(resolutionAmount > 0)) {
    return;
  }

  const order = await getOrderWithDetails(client, orderId);
  const dispute = order?.disputes?.find((entry) => entry.id === disputeId);
  const item = order?.items?.find((entry) => entry.id === orderItemId);

  if (!order || !dispute || !item) {
    throw buildError('Dispute state could not be reloaded for refund processing.', 404);
  }

  if (dispute.resolution?.refundId) {
    return;
  }

  if (order.paymentMethod !== 'PREPAID') {
    await appendRefundAuditNote({
      disputeId,
      performedByUserId: resolvedByUserId,
      note: `No gateway refund was required for ${order.paymentMethod} resolution.`,
      client,
    });
    return;
  }

  try {
    const refund = await createRazorpayRefund({
      order,
      amount: resolutionAmount,
      notes: {
        orderId,
        orderItemId,
        disputeId,
        resolutionId,
        kind: 'dispute',
      },
    });

    await client.disputeResolution.updateMany({
      where: {
        id: resolutionId,
        refundId: null,
      },
      data: {
        refundId: refund.id || `dispute-refund:${resolutionId}`,
      },
    });

    await appendRefundAuditNote({
      disputeId,
      performedByUserId: resolvedByUserId,
      note: `Refund processed for Rs. ${toNumber((refund.amount || 0) / 100).toFixed(2)}.`,
      client,
    });
  } catch (error) {
    console.error('Dispute refund processing failed:', error);
    await appendRefundAuditNote({
      disputeId,
      performedByUserId: resolvedByUserId,
      note: `Refund processing failed: ${error?.message || 'Unknown error'}`,
      client,
    });
  }
};

export const createDispute = async ({
  buyerId,
  orderId,
  itemId,
  reason,
  description,
  evidenceUrls = [],
  createdByIp = null,
  createdByUserAgent = null,
  client = prisma,
}) => {
  const sanitizedDescription = validateDescription(description);
  const normalizedEvidenceUrls = validateEvidenceUrls(evidenceUrls);

  if (!reason) {
    throw buildError('A dispute reason is required.', 400);
  }

  const cutoff = new Date(Date.now() - DISPUTE_WINDOW_HOURS * 60 * 60 * 1000);
  const recentDisputeCount = await client.dispute.count({
    where: {
      buyerId,
      createdAt: { gte: cutoff },
    },
  });
  if (recentDisputeCount >= MAX_DISPUTES_PER_WINDOW) {
    throw buildError('You have reached the dispute creation limit for now.', 422);
  }

  const created = await client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OrderItem" WHERE "id" = ${itemId} FOR UPDATE`;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: ORDER_DISPUTE_INCLUDE,
    });

    if (!order || order.buyerId !== buyerId) {
      throw buildError('Order not found.', 404);
    }

    const item = order.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw buildError('Order item not found.', 404);
    }

    const disputes = getExistingDisputesForItem(order, itemId);
    const eligibility = buildEligibilityFlags({ order, item, disputes });
    if (!eligibility.canOpen) {
      throw buildError(
        eligibility.blockedReasons[0] || 'This item is not eligible for a dispute.',
        422
      );
    }

    const dispute = await tx.dispute.create({
      data: {
        orderId,
        orderItemId: itemId,
        buyerId,
        sellerId: order.sellerId,
        reason,
        description: sanitizedDescription,
        createdByIp,
        createdByUserAgent,
        evidence: {
          create: normalizedEvidenceUrls.map((url) => ({ url })),
        },
      },
      include: ORDER_DISPUTE_INCLUDE.disputes.include,
    });

    await createEvent({
      tx,
      disputeId: dispute.id,
      type: DISPUTE_EVENT_TYPES.OPENED,
      performedByUserId: buyerId,
      notes: dispute.description,
    });

    const nextOrder = await getOrderWithDetails(tx, orderId);
    return {
      dispute: nextOrder.disputes.find((entry) => entry.id === dispute.id),
      order: nextOrder,
    };
  });

  createWholesalerNotification(created.order.sellerId, {
    title: 'New Dispute Opened',
    message: `A dispute has been opened by customer for order #${created.order.id}.`,
    type: 'DISPUTE',
    link: '/wholesaler/orders',
  }).catch((err) => console.error('Failed to notify wholesaler of dispute:', err));

  return buildDisputeResponse({
    order: created.order,
    dispute: created.dispute,
    viewerRole: 'CUSTOMER',
  });
};

export const moveDisputeToReview = async ({
  wholesalerId,
  sellerUserId,
  orderId,
  itemId,
  disputeId,
  updatedAt,
  client = prisma,
}) => {
  const result = await client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Dispute" WHERE "id" = ${disputeId} FOR UPDATE`;

    const dispute = await getDisputeById(tx, disputeId);
    if (!dispute || dispute.orderId !== orderId || dispute.orderItemId !== itemId) {
      throw buildError('Dispute not found.', 404);
    }

    requireSellerOwnership(dispute, wholesalerId);
    validateUpdatedAtToken(dispute.updatedAt, updatedAt);

    if (dispute.status === DISPUTE_STATUSES.RESOLVED) {
      throw buildError('Resolved disputes cannot be reviewed again.', 422);
    }

    if (dispute.status === DISPUTE_STATUSES.UNDER_REVIEW) {
      const nextOrder = await getOrderWithDetails(tx, orderId);
      return {
        dispute: nextOrder.disputes.find((entry) => entry.id === disputeId),
        order: nextOrder,
      };
    }

    if (dispute.status !== DISPUTE_STATUSES.OPEN) {
      throw buildError('Only OPEN disputes can move to UNDER_REVIEW.', 422);
    }

    await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: DISPUTE_STATUSES.UNDER_REVIEW,
        respondedAt: dispute.respondedAt || new Date(),
      },
    });

    await createEvent({
      tx,
      disputeId,
      type: DISPUTE_EVENT_TYPES.UNDER_REVIEW,
      performedByUserId: sellerUserId,
      notes: 'Seller started dispute review.',
    });

    const nextOrder = await getOrderWithDetails(tx, orderId);
    return {
      dispute: nextOrder.disputes.find((entry) => entry.id === disputeId),
      order: nextOrder,
    };
  });

  return buildDisputeResponse({
    order: result.order,
    dispute: result.dispute,
    viewerRole: 'WHOLESALER',
  });
};

export const resolveDispute = async ({
  wholesalerId,
  sellerUserId,
  orderId,
  itemId,
  disputeId,
  updatedAt,
  resolutionType,
  resolutionNotes = '',
  resolutionAmount = null,
  allowDirectResolution = false,
  client = prisma,
}) => {
  const normalizedNotes = resolutionNotes ? sanitizeText(resolutionNotes) : null;
  const transactionResult = await client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Dispute" WHERE "id" = ${disputeId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "OrderItem" WHERE "id" = ${itemId} FOR UPDATE`;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: ORDER_DISPUTE_INCLUDE,
    });
    if (!order) {
      throw buildError('Order not found.', 404);
    }

    const item = order.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw buildError('Order item not found.', 404);
    }

    const dispute = order.disputes.find((entry) => entry.id === disputeId);
    if (!dispute) {
      throw buildError('Dispute not found.', 404);
    }

    requireSellerOwnership(dispute, wholesalerId);
    validateUpdatedAtToken(dispute.updatedAt, updatedAt);

    if (dispute.resolution) {
      return {
        dispute,
        order,
        resolutionAmount: toNumber(dispute.resolution.resolutionAmount),
      };
    }

    validateResolutionRequest({ dispute, allowDirectResolution, resolutionType });
    const nextResolutionAmount = getResolutionAmount({
      resolutionType,
      item,
      resolutionAmount,
    });

    await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: DISPUTE_STATUSES.RESOLVED,
        respondedAt: dispute.respondedAt || new Date(),
      },
    });

    const resolution = await tx.disputeResolution.create({
      data: {
        disputeId,
        resolvedByUserId: sellerUserId,
        resolvedByRole: 'SELLER',
        resolutionType,
        resolutionNotes: normalizedNotes,
        resolutionAmount: nextResolutionAmount,
      },
    });

    await createEvent({
      tx,
      disputeId,
      type: DISPUTE_EVENT_TYPES.RESOLUTION_CREATED,
      performedByUserId: sellerUserId,
      notes: normalizedNotes || `Resolution recorded as ${resolutionType}.`,
    });

    await createEvent({
      tx,
      disputeId,
      type:
        resolutionType === DISPUTE_RESOLUTION_TYPES.APPROVE
          ? DISPUTE_EVENT_TYPES.APPROVED
          : resolutionType === DISPUTE_RESOLUTION_TYPES.REJECT
            ? DISPUTE_EVENT_TYPES.REJECTED
            : DISPUTE_EVENT_TYPES.PARTIAL_REFUND,
      performedByUserId: sellerUserId,
      notes:
        nextResolutionAmount != null
          ? `Resolution amount: Rs. ${toNumber(nextResolutionAmount).toFixed(2)}`
          : normalizedNotes,
    });

    const nextOrder = await getOrderWithDetails(tx, orderId);
    return {
      dispute: nextOrder.disputes.find((entry) => entry.id === disputeId),
      order: nextOrder,
      resolutionId: resolution.id,
      resolutionAmount: nextResolutionAmount,
    };
  });

  await processResolvedDisputeRefund({
    disputeId,
    orderId,
    orderItemId: itemId,
    resolutionId: transactionResult.resolutionId,
    resolutionAmount: transactionResult.resolutionAmount,
    resolvedByUserId: sellerUserId,
    client,
  });

  const refreshedOrder = await getOrderWithDetails(client, orderId);
  const refreshedDispute = refreshedOrder?.disputes?.find((entry) => entry.id === disputeId);

  if (refreshedOrder) {
    createNotification(refreshedOrder.buyerId, {
      title: 'Dispute Resolved',
      message: `Your dispute for order #${refreshedOrder.id} has been resolved as: ${resolutionType}.`,
      type: 'DISPUTE',
      link: '/store/dashboard/orders',
    }).catch((err) => console.error('Failed to notify customer of dispute resolution:', err));
  }

  return buildDisputeResponse({
    order: refreshedOrder,
    dispute: refreshedDispute,
    viewerRole: 'WHOLESALER',
  });
};

export const addDisputeInternalNote = async ({
  wholesalerId,
  sellerUserId,
  orderId,
  itemId,
  disputeId,
  updatedAt,
  note,
  client = prisma,
}) => {
  const sanitizedNote = sanitizeText(note);
  if (!sanitizedNote) {
    throw buildError('Internal note is required.', 400);
  }
  if (sanitizedNote.length > NOTE_MAX_LENGTH) {
    throw buildError(`Internal note must be at most ${NOTE_MAX_LENGTH} characters.`, 422);
  }

  const result = await client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Dispute" WHERE "id" = ${disputeId} FOR UPDATE`;

    const dispute = await getDisputeById(tx, disputeId);
    if (!dispute || dispute.orderId !== orderId || dispute.orderItemId !== itemId) {
      throw buildError('Dispute not found.', 404);
    }

    requireSellerOwnership(dispute, wholesalerId);
    validateUpdatedAtToken(dispute.updatedAt, updatedAt);

    if (dispute.status === DISPUTE_STATUSES.RESOLVED) {
      throw buildError('Resolved disputes cannot receive new internal notes.', 422);
    }

    await tx.disputeInternalNote.create({
      data: {
        disputeId,
        authorId: sellerUserId,
        note: sanitizedNote,
      },
    });

    await createEvent({
      tx,
      disputeId,
      type: DISPUTE_EVENT_TYPES.NOTE_ADDED,
      performedByUserId: sellerUserId,
      notes: sanitizedNote,
    });

    const nextOrder = await getOrderWithDetails(tx, orderId);
    return {
      dispute: nextOrder.disputes.find((entry) => entry.id === disputeId),
      order: nextOrder,
    };
  });

  return buildDisputeResponse({
    order: result.order,
    dispute: result.dispute,
    viewerRole: 'WHOLESALER',
  });
};
