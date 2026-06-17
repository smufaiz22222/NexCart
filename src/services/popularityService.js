import { prisma } from '../config/db.js';
import { INTERACTION_WEIGHTS } from './recommendationConstants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const calculateDecay = (createdAt, halfLifeDays = 14) => {
  const ageDays = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / DAY_MS);
  return Math.pow(0.5, ageDays / halfLifeDays);
};

export const getPopularityScores = async ({ scope = 'trending' } = {}) => {
  const scores = new Map();

  if (scope === 'trending') {
    // Trending: last 30 days with exponential time decay computed in database
    const interactions = await prisma.$queryRaw`
      SELECT 
        "productId", 
        "action"::text as "action", 
        SUM(quantity * power(0.5, (extract(epoch from (now() - "createdAt")) / 86400.0) / 14.0)) as "weightedScore"
      FROM "RecommendationInteraction"
      WHERE "action" != 'purchase'::"InteractionAction"
        AND "createdAt" >= now() - interval '30 days'
      GROUP BY "productId", "action"
    `;

    for (const row of interactions) {
      const baseWeight = INTERACTION_WEIGHTS[row.action] || 1;
      const score = baseWeight * Number(row.weightedScore || 0);
      scores.set(row.productId, (scores.get(row.productId) || 0) + score);
    }

    const purchases = await prisma.$queryRaw`
      SELECT 
        oi."productId", 
        SUM(oi.quantity * power(0.5, (extract(epoch from (now() - o."createdAt")) / 86400.0) / 14.0)) as "weightedScore"
      FROM "OrderItem" oi
      JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi.status = 'ACTIVE'::"OrderItemStatus"
        AND o."createdAt" >= now() - interval '30 days'
      GROUP BY oi."productId"
    `;

    for (const row of purchases) {
      const score = INTERACTION_WEIGHTS.purchase * Number(row.weightedScore || 0);
      scores.set(row.productId, (scores.get(row.productId) || 0) + score);
    }
  } else {
    // All-time: no time decay, grouped and summed in database
    const interactions = await prisma.$queryRaw`
      SELECT 
        "productId", 
        "action"::text as "action", 
        SUM(quantity) as "weightedScore"
      FROM "RecommendationInteraction"
      WHERE "action" != 'purchase'::"InteractionAction"
      GROUP BY "productId", "action"
    `;

    for (const row of interactions) {
      const baseWeight = INTERACTION_WEIGHTS[row.action] || 1;
      const score = baseWeight * Number(row.weightedScore || 0);
      scores.set(row.productId, (scores.get(row.productId) || 0) + score);
    }

    const purchases = await prisma.$queryRaw`
      SELECT 
        oi."productId", 
        SUM(oi.quantity) as "weightedScore"
      FROM "OrderItem" oi
      WHERE oi.status = 'ACTIVE'::"OrderItemStatus"
      GROUP BY oi."productId"
    `;

    for (const row of purchases) {
      const score = INTERACTION_WEIGHTS.purchase * Number(row.weightedScore || 0);
      scores.set(row.productId, (scores.get(row.productId) || 0) + score);
    }
  }

  return scores;
};

export const getPopularProducts = async ({
  scope = 'trending',
  limit = 12,
  excludeProductIds = [],
} = {}) => {
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
        currentStock: { gt: 0 },
      },
      include: {
        wholesaler: { select: { businessName: true } },
      },
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
        reasons: [
          scope === 'trending' ? 'Trending from recent activity' : 'Popular with NexCart shoppers',
        ],
        sourceScores: { popularity: scores.get(productId) || 0 },
      };
    })
    .filter(Boolean);

  if (rankedProducts.length >= limit) return rankedProducts;

  const fallbackProducts = await prisma.product.findMany({
    where: {
      currentStock: { gt: 0 },
      id: { notIn: [...rankedIds, ...excludeProductIds] },
    },
    include: {
      wholesaler: { select: { businessName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit - rankedProducts.length,
  });

  return [
    ...rankedProducts,
    ...fallbackProducts.map((product) => ({
      product,
      score: 0,
      reasons: ['Newly available product'],
      sourceScores: { popularity: 0 },
    })),
  ];
};
