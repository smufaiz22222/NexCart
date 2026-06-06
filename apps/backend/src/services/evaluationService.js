import { prisma } from '../config/db.js';
import { getSimilarHybridRecommendations } from './hybridRecommendationService.js';

export const evaluateRecommendations = async ({ k = 5 } = {}) => {
  const users = await prisma.user.findMany({
    where: {
      ordersPlaced: {
        some: {}
      }
    },
    select: {
      id: true,
      ordersPlaced: {
        orderBy: { createdAt: 'asc' },
        include: { items: true }
      }
    }
  });

  let evaluatedUsers = 0;
  let hits = 0;
  let precisionTotal = 0;
  let recallTotal = 0;
  let ndcgTotal = 0;

  for (const user of users) {
    const purchasedProductIds = user.ordersPlaced.flatMap((order) => order.items.map((item) => item.productId));
    const uniquePurchases = [...new Set(purchasedProductIds)];
    if (uniquePurchases.length < 2) continue;

    const anchorProductId = uniquePurchases[0];
    const heldOutProductId = uniquePurchases[uniquePurchases.length - 1];
    const result = await getSimilarHybridRecommendations({
      productId: anchorProductId,
      userId: user.id,
      limit: k
    });
    const recommendedIds = result.recommendations.map((item) => item.product.id);
    const rank = recommendedIds.indexOf(heldOutProductId);

    evaluatedUsers += 1;
    if (rank >= 0) {
      hits += 1;
      precisionTotal += 1 / k;
      recallTotal += 1;
      ndcgTotal += 1 / Math.log2(rank + 2);
    }
  }

  if (!evaluatedUsers) {
    return {
      evaluatedUsers: 0,
      precisionAtK: 0,
      recallAtK: 0,
      ndcgAtK: 0,
      hitRateAtK: 0,
      coverage: 0
    };
  }

  const [recommendedProducts, totalProducts] = await Promise.all([
    prisma.recommendationEvent.groupBy({
      by: ['productId'],
      where: { eventType: 'impression' }
    }),
    prisma.product.count()
  ]);

  return {
    evaluatedUsers,
    precisionAtK: Number((precisionTotal / evaluatedUsers).toFixed(4)),
    recallAtK: Number((recallTotal / evaluatedUsers).toFixed(4)),
    ndcgAtK: Number((ndcgTotal / evaluatedUsers).toFixed(4)),
    hitRateAtK: Number((hits / evaluatedUsers).toFixed(4)),
    coverage: totalProducts ? Number((recommendedProducts.length / totalProducts).toFixed(4)) : 0
  };
};
