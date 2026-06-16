import { prisma } from '../config/db.js';
import { evaluateRecommendations } from '../services/evaluationService.js';
import {
  getSimilarHybridRecommendations,
  getUserHybridRecommendations,
} from '../services/hybridRecommendationService.js';
import { getPopularProducts } from '../services/popularityService.js';

const toPositiveLimit = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
};

export const getSimilarProducts = async (req, res) => {
  try {
    const limit = toPositiveLimit(req.query.limit, 8);
    const result = await getSimilarHybridRecommendations({
      productId: req.params.id,
      limit,
      userId: req.user?.userId,
      sessionId: req.query.sessionId,
    });

    res.json(result);
  } catch (error) {
    console.error('Similar Recommendations Error:', error);
    res.status(500).json({ error: 'Failed to fetch similar products' });
  }
};

export const getUserRecommendations = async (req, res) => {
  try {
    const limit = toPositiveLimit(req.query.limit, 12);
    const result = await getUserHybridRecommendations({
      userId: req.user?.userId,
      sessionId: req.query.sessionId,
      limit,
    });

    res.json(result);
  } catch (error) {
    console.error('User Recommendations Error:', error);
    res.status(500).json({ error: 'Failed to fetch user recommendations' });
  }
};

export const getPopularRecommendations = async (req, res) => {
  try {
    const limit = toPositiveLimit(req.query.limit, 12);
    const scope = req.query.scope === 'allTime' ? 'allTime' : 'trending';
    const recommendations = await getPopularProducts({ scope, limit });

    const log = await prisma.recommendationLog.create({
      data: {
        userId: req.user?.userId || null,
        sessionId: req.query.sessionId || null,
        surface: `storefront_${scope}`,
        algorithm: `popularity_${scope}_v1`,
        productIds: recommendations.map((item) => item.product.id),
        isEvaluation: false,
      },
    });

    res.json({
      recommendationId: log.id,
      algorithm: `popularity_${scope}_v1`,
      recommendations,
    });
  } catch (error) {
    console.error('Popular Recommendations Error:', error);
    res.status(500).json({ error: 'Failed to fetch popular recommendations' });
  }
};

export const getRecommendationAnalytics = async (req, res) => {
  try {
    const [
      mostViewed,
      mostPurchased,
      eventCounts,
      totalRecommendationLogs,
      recommendedProducts,
      totalProducts,
      topRecommendedGroups,
      topPurchaseGroups,
      health,
    ] = await Promise.all([
      prisma.recommendationInteraction.groupBy({
        by: ['productId'],
        where: { action: 'view' },
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 10,
      }),
      prisma.recommendationInteraction.groupBy({
        by: ['productId'],
        where: { action: 'purchase' },
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 10,
      }),
      prisma.recommendationEvent.groupBy({
        by: ['eventType'],
        where: {
          recommendationLog: { isEvaluation: false },
        },
        _count: { eventType: true },
      }),
      prisma.recommendationLog.count({
        where: { isEvaluation: false },
      }),
      prisma.recommendationEvent.groupBy({
        by: ['productId'],
        where: {
          eventType: 'impression',
          recommendationLog: { isEvaluation: false },
        },
      }),
      prisma.product.count(),
      prisma.recommendationEvent.groupBy({
        by: ['productId'],
        where: {
          eventType: 'impression',
          recommendationLog: { isEvaluation: false },
        },
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 10,
      }),
      prisma.recommendationEvent.groupBy({
        by: ['productId'],
        where: {
          eventType: 'purchase',
          recommendationLog: { isEvaluation: false },
        },
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 10,
      }),
      getRecommendationHealthSummary(),
    ]);

    const productIds = [
      ...new Set(
        [...mostViewed, ...mostPurchased, ...topRecommendedGroups, ...topPurchaseGroups].map(
          (item) => item.productId
        )
      ),
    ];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, category: true },
    });
    const topPurchaseProductIds = topPurchaseGroups.map((item) => item.productId);
    const purchaseProductImpressions = topPurchaseProductIds.length
      ? await prisma.recommendationEvent.groupBy({
          by: ['productId'],
          where: {
            productId: { in: topPurchaseProductIds },
            eventType: 'impression',
            recommendationLog: { isEvaluation: false },
          },
          _count: { productId: true },
        })
      : [];
    const impressionsByProductId = new Map(
      purchaseProductImpressions.map((item) => [item.productId, item._count.productId])
    );
    const productsById = new Map(products.map((product) => [product.id, product]));
    const counts = Object.fromEntries(
      eventCounts.map((item) => [item.eventType, item._count.eventType])
    );

    res.json({
      totalRecommendationLogs,
      recommendationCtr: counts.impression
        ? Number(((counts.click || 0) / counts.impression).toFixed(4))
        : 0,
      recommendationCartRate: counts.impression
        ? Number(((counts.cart || 0) / counts.impression).toFixed(4))
        : 0,
      recommendationConversionRate: counts.impression
        ? Number(((counts.purchase || 0) / counts.impression).toFixed(4))
        : 0,
      coverage: totalProducts ? Number((recommendedProducts.length / totalProducts).toFixed(4)) : 0,
      eventCounts: counts,
      funnel: {
        impression: counts.impression || 0,
        click: counts.click || 0,
        cart: counts.cart || 0,
        purchase: counts.purchase || 0,
      },
      mostViewed: mostViewed.map((item) => ({
        product: productsById.get(item.productId),
        count: item._count.productId,
      })),
      mostPurchased: mostPurchased.map((item) => ({
        product: productsById.get(item.productId),
        count: item._count.productId,
      })),
      topRecommendedProducts: topRecommendedGroups.map((item) => ({
        product: productsById.get(item.productId),
        impressions: item._count.productId,
      })),
      topConvertingRecommendations: topPurchaseGroups.map((item) => {
        const impressionCount = impressionsByProductId.get(item.productId) || 0;
        return {
          product: productsById.get(item.productId),
          purchases: item._count.productId,
          conversionRate: impressionCount
            ? Number((item._count.productId / impressionCount).toFixed(4))
            : 0,
        };
      }),
      health,
    });
  } catch (error) {
    console.error('Recommendation Analytics Error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendation analytics' });
  }
};

export const getRecommendationEvaluation = async (req, res) => {
  try {
    const k = toPositiveLimit(req.query.k, 5);
    const shouldStoreReport = req.query.store !== 'false';
    const metrics = await evaluateRecommendations({
      k,
      storeReport: shouldStoreReport,
      notes: 'Generated from recommendations evaluation endpoint',
    });
    res.json({ k, metrics });
  } catch (error) {
    console.error('Recommendation Evaluation Error:', error);
    res.status(500).json({ error: 'Failed to evaluate recommendations' });
  }
};

export const getRecommendationHealth = async (req, res) => {
  try {
    res.json(await getRecommendationHealthSummary());
  } catch (error) {
    console.error('Recommendation Health Error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendation health' });
  }
};

export const clearRecommendationLogs = async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.recommendationEvent.deleteMany();
      await tx.recommendationInteraction.updateMany({
        where: { recommendationId: { not: null } },
        data: { recommendationId: null },
      });
      await tx.recommendationLog.deleteMany();
    });

    res.json({ message: 'Recommendation logs and events cleared' });
  } catch (error) {
    console.error('Recommendation Clear Logs Error:', error);
    res.status(500).json({ error: 'Failed to clear recommendation logs' });
  }
};

export const resetRecommendationEvaluation = async (req, res) => {
  try {
    const result = await prisma.recommendationEvaluationReport.deleteMany();
    res.json({ message: 'Recommendation evaluation reports reset', count: result.count });
  } catch (error) {
    console.error('Recommendation Evaluation Reset Error:', error);
    res.status(500).json({ error: 'Failed to reset recommendation evaluation reports' });
  }
};

export const resetRecommendationAnalytics = async (req, res) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.recommendationEvent.deleteMany();
      await tx.recommendationInteraction.updateMany({
        where: { recommendationId: { not: null } },
        data: { recommendationId: null },
      });
      await tx.recommendationLog.deleteMany();
    });

    res.json({ message: 'Recommendation analytics reset' });
  } catch (error) {
    console.error('Recommendation Analytics Reset Error:', error);
    res.status(500).json({ error: 'Failed to reset recommendation analytics' });
  }
};

const getRecommendationHealthSummary = async () => {
  const [
    totalProducts,
    availableProducts,
    contentRows,
    collaborativeRows,
    logs,
    impressions,
    recommendedProductGroups,
    latestEvaluation,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { currentStock: { gt: 0 } } }),
    prisma.productSimilarity.count({ where: { method: 'CONTENT' } }),
    prisma.productSimilarity.count({ where: { method: 'COLLABORATIVE' } }),
    prisma.recommendationLog.count({ where: { isEvaluation: false } }),
    prisma.recommendationEvent.count({
      where: {
        eventType: 'impression',
        recommendationLog: { isEvaluation: false },
      },
    }),
    prisma.recommendationEvent.groupBy({
      by: ['productId'],
      where: {
        eventType: 'impression',
        recommendationLog: { isEvaluation: false },
      },
    }),
    prisma.recommendationEvaluationReport.findFirst({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const coverage = totalProducts
    ? Number((recommendedProductGroups.length / totalProducts).toFixed(4))
    : 0;
  const warnings = [];

  if (availableProducts === 0)
    warnings.push('No in-stock products are available for recommendations.');
  if (totalProducts > 1 && contentRows === 0)
    warnings.push('Content similarity rows are missing. Run recommendations:build-content.');
  if (totalProducts > 1 && collaborativeRows === 0)
    warnings.push(
      'Collaborative similarity rows are missing or sparse. Run recommendations:build-cf after interaction/order data exists.'
    );
  if (logs === 0) warnings.push('No production recommendation logs have been created yet.');
  if (impressions === 0)
    warnings.push('No rendered recommendation impressions have been tracked yet.');
  if (coverage > 0 && coverage < 0.2) warnings.push('Recommendation coverage is low.');

  return {
    status: warnings.length ? 'warning' : 'healthy',
    totalProducts,
    availableProducts,
    contentSimilarityRows: contentRows,
    collaborativeSimilarityRows: collaborativeRows,
    productionRecommendationLogs: logs,
    trackedImpressions: impressions,
    coverage,
    latestEvaluation: latestEvaluation
      ? {
          id: latestEvaluation.id,
          k: latestEvaluation.k,
          metrics: latestEvaluation.metrics,
          createdAt: latestEvaluation.createdAt,
        }
      : null,
    warnings,
  };
};
