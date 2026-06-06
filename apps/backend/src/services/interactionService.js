import { prisma } from '../config/db.js';
import { VALID_INTERACTION_ACTIONS, VALID_RECOMMENDATION_EVENTS } from './recommendationConstants.js';

const VIEW_DEDUPLICATION_WINDOW_MINUTES = 30;

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
    }).catch(() => null);
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
  if (!VALID_RECOMMENDATION_EVENTS.includes(eventType)) {
    const error = new Error(`Unsupported recommendation event: ${eventType}`);
    error.statusCode = 400;
    throw error;
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

export const createPurchaseInteractions = async ({ tx, buyerId, orderItems, source = 'checkout' }) => {
  if (!orderItems.length) return;

  await tx.recommendationInteraction.createMany({
    data: orderItems.map((item) => ({
      userId: buyerId,
      productId: item.productId,
      action: 'purchase',
      quantity: item.quantity,
      source,
      metadata: {
        orderItemPrice: item.price?.toString?.() ?? item.price
      }
    }))
  });
};
