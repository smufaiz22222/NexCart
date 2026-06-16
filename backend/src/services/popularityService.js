import { prisma } from '../config/db.js';
import { INTERACTION_WEIGHTS } from './recommendationConstants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const calculateDecay = (createdAt, halfLifeDays = 14) => {
  const ageDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / DAY_MS);
  return Math.pow(0.5, ageDays / halfLifeDays);
};

export const getPopularityScores = async ({ scope = 'trending' } = {}) => {
  const interactions = await prisma.recommendationInteraction.findMany({
    select: {
      productId: true,
      action: true,
      quantity: true,
      createdAt: true
    }
  });

  const scores = new Map();

  for (const interaction of interactions) {
    const baseWeight = INTERACTION_WEIGHTS[interaction.action] || 1;
    const quantity = Math.max(1, interaction.quantity || 1);
    const decay = scope === 'trending' ? calculateDecay(interaction.createdAt) : 1;
    const weightedScore = baseWeight * quantity * decay;
    scores.set(interaction.productId, (scores.get(interaction.productId) || 0) + weightedScore);
  }

  const purchasedItems = await prisma.orderItem.findMany({
    select: {
      productId: true,
      quantity: true,
      order: { select: { createdAt: true } }
    }
  });

  for (const item of purchasedItems) {
    const decay = scope === 'trending' ? calculateDecay(item.order.createdAt) : 1;
    const weightedScore = INTERACTION_WEIGHTS.purchase * Math.max(1, item.quantity || 1) * decay;
    scores.set(item.productId, (scores.get(item.productId) || 0) + weightedScore);
  }

  return scores;
};

export const getPopularProducts = async ({ scope = 'trending', limit = 12, excludeProductIds = [] } = {}) => {
  const scores = await getPopularityScores({ scope });
  const rankedIds = [...scores.entries()]
    .filter(([productId]) => !excludeProductIds.includes(productId))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId]) => productId);

  let products = [];
  if (rankedIds.length > 0) {
    products = await prisma.product.findMany({
      where: {
        id: { in: rankedIds },
        currentStock: { gt: 0 }
      },
      include: {
        wholesaler: { select: { businessName: true } }
      }
    });
  }

  const byId = new Map(products.map((product) => [product.id, product]));
  const rankedProducts = rankedIds
    .map((productId) => {
      const product = byId.get(productId);
      if (!product) return null;
      return {
        product,
        score: scores.get(productId) || 0,
        reasons: [scope === 'trending' ? 'Trending from recent activity' : 'Popular with NexCart shoppers'],
        sourceScores: { popularity: scores.get(productId) || 0 }
      };
    })
    .filter(Boolean);

  if (rankedProducts.length >= limit) return rankedProducts;

  const fallbackProducts = await prisma.product.findMany({
    where: {
      currentStock: { gt: 0 },
      id: { notIn: [...rankedIds, ...excludeProductIds] }
    },
    include: {
      wholesaler: { select: { businessName: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit - rankedProducts.length
  });

  return [
    ...rankedProducts,
    ...fallbackProducts.map((product) => ({
      product,
      score: 0,
      reasons: ['Newly available product'],
      sourceScores: { popularity: 0 }
    }))
  ];
};
