import { prisma } from '../config/db.js';
import { VALID_INTERACTION_ACTIONS, VALID_RECOMMENDATION_EVENTS } from './recommendationConstants.js';

const VIEW_DEDUPLICATION_WINDOW_MINUTES = 30;
const IMPRESSION_DEDUPLICATION_WINDOW_MINUTES = Number(process.env.RECOMMENDATION_IMPRESSION_DEDUP_MINUTES || 60);
const ATTRIBUTION_WINDOW_HOURS = Number(process.env.RECOMMENDATION_ATTRIBUTION_WINDOW_HOURS || 24);

const getProductIdsFromRecommendationLog = (log) => {
  if (Array.isArray(log.productIds)) return log.productIds;
  return [];
};

export const validateRecommendationAttribution = async ({
  recommendationId,
  productId,
  userId
}, client = prisma) => {
  if (!recommendationId) return null;

  const log = await client.recommendationLog.findUnique({
    where: { id: recommendationId },
    select: {
      id: true,
      userId: true,
      productIds: true,
      isEvaluation: true,
      createdAt: true
    }
  });

  if (!log) {
    const error = new Error('Recommendation log not found');
    error.statusCode = 404;
    throw error;
  }

  if (log.isEvaluation) {
    const error = new Error('Evaluation recommendations cannot be used for attribution');
    error.statusCode = 400;
    throw error;
  }

  if (log.userId && log.userId !== userId) {
    const error = new Error('Recommendation log does not belong to this user');
    error.statusCode = 403;
    throw error;
  }

  const attributionAgeMs = Date.now() - new Date(log.createdAt).getTime();
  if (attributionAgeMs > ATTRIBUTION_WINDOW_HOURS * 60 * 60 * 1000) {
    const error = new Error('Recommendation attribution has expired');
    error.statusCode = 400;
    throw error;
  }

  if (!getProductIdsFromRecommendationLog(log).includes(productId)) {
    const error = new Error('Product was not included in this recommendation');
    error.statusCode = 400;
    throw error;
  }

  return log;
};

const findDuplicateImpression = async ({
  recommendationId,
  productId,
  userId,
  sessionId
}, client = prisma) => {
  const since = new Date(Date.now() - IMPRESSION_DEDUPLICATION_WINDOW_MINUTES * 60 * 1000);
  const log = await client.recommendationLog.findUnique({
    where: { id: recommendationId },
    select: { surface: true }
  });

  if (!log) return null;

  return client.recommendationEvent.findFirst({
    where: {
      productId,
      eventType: 'impression',
      createdAt: { gte: since },
      recommendationLog: {
        surface: log.surface,
        isEvaluation: false
      },
      OR: [
        userId ? { userId } : undefined,
        sessionId ? { sessionId } : undefined
      ].filter(Boolean)
    }
  });
};

export const logInteraction = async ({
  userId,
  sessionId,
  productId,
  action,
  quantity = 1,
  source = 'unknown',
  recommendationId,
  metadata = {}
}, client = prisma) => {
  if (!VALID_INTERACTION_ACTIONS.includes(action)) {
    const error = new Error(`Unsupported interaction action: ${action}`);
    error.statusCode = 400;
    throw error;
  }

  const product = await client.product.findUnique({
    where: { id: productId },
    select: { id: true }
  });

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  if (action === 'view') {
    const since = new Date(Date.now() - VIEW_DEDUPLICATION_WINDOW_MINUTES * 60 * 1000);
    const existingView = await client.recommendationInteraction.findFirst({
      where: {
        productId,
        action: 'view',
        createdAt: { gte: since },
        OR: [
          userId ? { userId } : undefined,
          sessionId ? { sessionId } : undefined
        ].filter(Boolean)
      }
    });

    if (existingView) return existingView;
  }

  if (recommendationId && VALID_RECOMMENDATION_EVENTS.includes(action)) {
    await validateRecommendationAttribution({ recommendationId, productId, userId }, client);
  }

  const interaction = await client.recommendationInteraction.create({
    data: {
      userId: userId || null,
      sessionId: sessionId || null,
      productId,
      action,
      quantity: Math.max(1, Number(quantity) || 1),
      source,
      recommendationId: recommendationId || null,
      metadata
    }
  });

  if (recommendationId && VALID_RECOMMENDATION_EVENTS.includes(action)) {
    await client.recommendationEvent.create({
      data: {
        recommendationLogId: recommendationId,
        productId,
        userId: userId || null,
        sessionId: sessionId || null,
        eventType: action
      }
    });
  }

  return interaction;
};

export const logRecommendationEvent = async ({
  recommendationId,
  productId,
  eventType,
  userId,
  sessionId
}) => {
  if (!recommendationId) {
    const error = new Error('Recommendation ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!productId) {
    const error = new Error('Product ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!VALID_RECOMMENDATION_EVENTS.includes(eventType)) {
    const error = new Error(`Unsupported recommendation event: ${eventType}`);
    error.statusCode = 400;
    throw error;
  }

  await validateRecommendationAttribution({ recommendationId, productId, userId });

  if (eventType === 'impression') {
    const duplicate = await findDuplicateImpression({ recommendationId, productId, userId, sessionId });
    if (duplicate) return duplicate;
  }

  return prisma.recommendationEvent.create({
    data: {
      recommendationLogId: recommendationId,
      productId,
      userId: userId || null,
      sessionId: sessionId || null,
      eventType
    }
  });
};

export const logRecommendationEvents = async ({
  recommendationId,
  events = [],
  userId,
  sessionId
}) => {
  if (!recommendationId) {
    const error = new Error('Recommendation ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(events)) {
    const error = new Error('Events must be an array');
    error.statusCode = 400;
    throw error;
  }

  if (events.length === 0) {
    return { count: 0 };
  }

  const validatedProducts = new Set();
  const data = events.map((event) => {
    if (!event.productId) {
      const error = new Error('Product ID is required for each recommendation event');
      error.statusCode = 400;
      throw error;
    }

    if (!VALID_RECOMMENDATION_EVENTS.includes(event.eventType)) {
      const error = new Error(`Unsupported recommendation event: ${event.eventType}`);
      error.statusCode = 400;
      throw error;
    }

    return {
      recommendationLogId: recommendationId,
      productId: event.productId,
      userId: userId || null,
      sessionId: sessionId || null,
      eventType: event.eventType
    };
  });

  for (const event of events) {
    if (validatedProducts.has(event.productId)) continue;
    await validateRecommendationAttribution({
      recommendationId,
      productId: event.productId,
      userId
    });
    validatedProducts.add(event.productId);
  }

  const dedupedData = [];
  for (const item of data) {
    if (item.eventType === 'impression') {
      const duplicate = await findDuplicateImpression({
        recommendationId,
        productId: item.productId,
        userId,
        sessionId
      });
      if (duplicate) continue;
    }
    dedupedData.push(item);
  }

  if (dedupedData.length === 0) return { count: 0 };

  return prisma.recommendationEvent.createMany({ data: dedupedData });
};

export const createPurchaseInteractions = async ({ tx, buyerId, orderItems, source = 'checkout' }) => {
  if (!orderItems.length) return;

  for (const item of orderItems) {
    if (item.recommendationId) {
      await validateRecommendationAttribution({
        recommendationId: item.recommendationId,
        productId: item.productId,
        userId: buyerId
      }, tx);
    }
  }

  await tx.recommendationInteraction.createMany({
    data: orderItems.map((item) => ({
      userId: buyerId,
      productId: item.productId,
      action: 'purchase',
      quantity: item.quantity,
      source,
      recommendationId: item.recommendationId || null,
      metadata: {
        orderItemPrice: item.price?.toString?.() ?? item.price
      }
    }))
  });

  const attributedItems = orderItems.filter((item) => item.recommendationId);

  if (attributedItems.length) {
    await tx.recommendationEvent.createMany({
      data: attributedItems.map((item) => ({
        recommendationLogId: item.recommendationId,
        productId: item.productId,
        userId: buyerId,
        eventType: 'purchase'
      }))
    });
  }
};
