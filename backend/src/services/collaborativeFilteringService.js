import { prisma } from '../config/db.js';
import { INTERACTION_WEIGHTS } from './recommendationConstants.js';

const cosineSimilarity = (left, right) => {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  const users = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const userId of users) {
    const a = left[userId] || 0;
    const b = right[userId] || 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }

  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
};

export const buildCollaborativeRecommendations = async ({ topK = 10 } = {}) => {
  const interactions = await prisma.recommendationInteraction.findMany({
    where: { userId: { not: null } },
    select: {
      userId: true,
      productId: true,
      action: true,
      quantity: true
    }
  });

  const orderItems = await prisma.orderItem.findMany({
    select: {
      productId: true,
      quantity: true,
      order: { select: { buyerId: true } }
    }
  });

  const itemUserMatrix = new Map();
  const addSignal = (productId, userId, score) => {
    if (!productId || !userId) return;
    if (!itemUserMatrix.has(productId)) itemUserMatrix.set(productId, {});
    const userScores = itemUserMatrix.get(productId);
    userScores[userId] = Math.max(userScores[userId] || 0, score);
  };

  for (const interaction of interactions) {
    const score = (INTERACTION_WEIGHTS[interaction.action] || 1) * Math.max(1, interaction.quantity || 1);
    addSignal(interaction.productId, interaction.userId, score);
  }

  for (const item of orderItems) {
    const score = INTERACTION_WEIGHTS.purchase * Math.max(1, item.quantity || 1);
    addSignal(item.productId, item.order.buyerId, score);
  }

  const productIds = [...itemUserMatrix.keys()];
  const similarityRows = [];

  for (const productId of productIds) {
    const ranked = productIds
      .filter((candidateId) => candidateId !== productId)
      .map((candidateId) => ({
        productId,
        similarProductId: candidateId,
        score: cosineSimilarity(itemUserMatrix.get(productId), itemUserMatrix.get(candidateId))
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((candidate, index) => ({
        ...candidate,
        method: 'COLLABORATIVE',
        rank: index + 1
      }));

    similarityRows.push(...ranked);
  }

  await prisma.$transaction(async (tx) => {
    await tx.productSimilarity.deleteMany({ where: { method: 'COLLABORATIVE' } });
    if (similarityRows.length > 0) {
      await tx.productSimilarity.createMany({ data: similarityRows });
    }
  });

  return {
    productsProcessed: productIds.length,
    similaritiesCreated: similarityRows.length
  };
};

export const getCollaborativeSimilarProducts = async ({ productId, limit = 8 }) => {
  return prisma.productSimilarity.findMany({
    where: {
      productId,
      method: 'COLLABORATIVE',
      similarProduct: { currentStock: { gt: 0 } }
    },
    include: {
      similarProduct: {
        include: {
          wholesaler: { select: { businessName: true } }
        }
      }
    },
    orderBy: { rank: 'asc' },
    take: limit
  });
};
