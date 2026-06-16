import { prisma } from '../config/db.js';
import { getSimilarHybridRecommendations } from './hybridRecommendationService.js';

export const evaluateRecommendations = async ({ k = 5, storeReport = false, notes } = {}) => {
  const users = await prisma.user.findMany({
    where: {
      ordersPlaced: {
        some: {},
      },
    },
    select: {
      id: true,
      ordersPlaced: {
        orderBy: { createdAt: 'asc' },
        include: {
          items: {
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
  });

  let evaluatedUsers = 0;
  let hits = 0;
  let precisionTotal = 0;
  let recallTotal = 0;
  let ndcgTotal = 0;
  let mapTotal = 0;
  const uniqueRecommendedProductIds = new Set();
  const recommendedProductIdsForDiversity = new Set();

  for (const user of users) {
    const purchasedProductIds = user.ordersPlaced.flatMap((order) =>
      order.items.map((item) => item.productId)
    );
    const uniquePurchases = [...new Set(purchasedProductIds)];
    if (uniquePurchases.length < 2) continue;

    const anchorProductId = uniquePurchases[0];
    const heldOutProductId = uniquePurchases[uniquePurchases.length - 1];
    const result = await getSimilarHybridRecommendations({
      productId: anchorProductId,
      userId: user.id,
      limit: k,
      trackingMode: 'none',
    });
    const recommendedIds = result.recommendations.map((item) => item.product.id);
    recommendedIds.forEach((productId) => uniqueRecommendedProductIds.add(productId));
    recommendedIds.forEach((productId) => recommendedProductIdsForDiversity.add(productId));
    const rank = recommendedIds.indexOf(heldOutProductId);

    evaluatedUsers += 1;
    if (rank >= 0) {
      hits += 1;
      precisionTotal += 1 / k;
      recallTotal += 1;
      ndcgTotal += 1 / Math.log2(rank + 2);
      mapTotal += 1 / (rank + 1);
    }
  }

  if (!evaluatedUsers) {
    const emptyMetrics = {
      evaluatedUsers: 0,
      precisionAtK: 0,
      recallAtK: 0,
      mapAtK: 0,
      ndcgAtK: 0,
      hitRateAtK: 0,
      coverage: 0,
      diversity: 0,
    };

    if (storeReport) {
      const report = await prisma.recommendationEvaluationReport.create({
        data: { k, metrics: emptyMetrics, notes },
      });
      return { ...emptyMetrics, reportId: report.id };
    }

    return emptyMetrics;
  }

  const [totalProducts, recommendedProducts] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      where: { id: { in: [...recommendedProductIdsForDiversity] } },
      select: { category: true },
    }),
  ]);

  const uniqueCategories = new Set(
    recommendedProducts.map((product) => product.category || 'General')
  );
  const metrics = {
    evaluatedUsers,
    precisionAtK: Number((precisionTotal / evaluatedUsers).toFixed(4)),
    recallAtK: Number((recallTotal / evaluatedUsers).toFixed(4)),
    mapAtK: Number((mapTotal / evaluatedUsers).toFixed(4)),
    ndcgAtK: Number((ndcgTotal / evaluatedUsers).toFixed(4)),
    hitRateAtK: Number((hits / evaluatedUsers).toFixed(4)),
    coverage: totalProducts
      ? Number((uniqueRecommendedProductIds.size / totalProducts).toFixed(4))
      : 0,
    diversity: recommendedProducts.length
      ? Number((uniqueCategories.size / recommendedProducts.length).toFixed(4))
      : 0,
  };

  if (storeReport) {
    const previousReport = await prisma.recommendationEvaluationReport.findFirst({
      where: { reportType: 'offline' },
      orderBy: { createdAt: 'desc' },
    });

    const report = await prisma.recommendationEvaluationReport.create({
      data: {
        reportType: 'offline',
        k,
        metrics: {
          ...metrics,
          comparison: previousReport
            ? {
                previousReportId: previousReport.id,
                previousCreatedAt: previousReport.createdAt,
                precisionAtKDelta: Number(
                  (metrics.precisionAtK - (previousReport.metrics?.precisionAtK || 0)).toFixed(4)
                ),
                recallAtKDelta: Number(
                  (metrics.recallAtK - (previousReport.metrics?.recallAtK || 0)).toFixed(4)
                ),
                mapAtKDelta: Number(
                  (metrics.mapAtK - (previousReport.metrics?.mapAtK || 0)).toFixed(4)
                ),
                ndcgAtKDelta: Number(
                  (metrics.ndcgAtK - (previousReport.metrics?.ndcgAtK || 0)).toFixed(4)
                ),
                coverageDelta: Number(
                  (metrics.coverage - (previousReport.metrics?.coverage || 0)).toFixed(4)
                ),
                diversityDelta: Number(
                  (metrics.diversity - (previousReport.metrics?.diversity || 0)).toFixed(4)
                ),
              }
            : null,
        },
        notes,
      },
    });

    return { ...metrics, reportId: report.id };
  }

  return metrics;
};
