import { prisma } from '../config/db.js';
import { evaluateRecommendations } from '../services/evaluationService.js';
import { getSimilarHybridRecommendations, getUserHybridRecommendations } from '../services/hybridRecommendationService.js';
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
      sessionId: req.query.sessionId
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
      limit
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
        events: {
          create: recommendations.map((item) => ({
            productId: item.product.id,
            userId: req.user?.userId || null,
            sessionId: req.query.sessionId || null,
            eventType: 'impression'
          }))
        }
      }
    });

    res.json({
      recommendationId: log.id,
      algorithm: `popularity_${scope}_v1`,
      recommendations
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
      totalProducts
    ] = await Promise.all([
      prisma.recommendationInteraction.groupBy({
        by: ['productId'],
        where: { action: 'view' },
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 10
      }),
      prisma.recommendationInteraction.groupBy({
        by: ['productId'],
        where: { action: 'purchase' },
        _count: { productId: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 10
      }),
      prisma.recommendationEvent.groupBy({
        by: ['eventType'],
        _count: { eventType: true }
      }),
      prisma.recommendationLog.count(),
      prisma.recommendationEvent.groupBy({
        by: ['productId'],
        where: { eventType: 'impression' }
      }),
      prisma.product.count()
    ]);

    const productIds = [...new Set([...mostViewed, ...mostPurchased].map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, category: true }
    });
    const productsById = new Map(products.map((product) => [product.id, product]));
    const counts = Object.fromEntries(eventCounts.map((item) => [item.eventType, item._count.eventType]));

    res.json({
      totalRecommendationLogs,
      recommendationCtr: counts.impression ? Number(((counts.click || 0) / counts.impression).toFixed(4)) : 0,
      recommendationCartRate: counts.impression ? Number(((counts.cart || 0) / counts.impression).toFixed(4)) : 0,
      recommendationConversionRate: counts.impression ? Number(((counts.purchase || 0) / counts.impression).toFixed(4)) : 0,
      coverage: totalProducts ? Number((recommendedProducts.length / totalProducts).toFixed(4)) : 0,
      eventCounts: counts,
      mostViewed: mostViewed.map((item) => ({
        product: productsById.get(item.productId),
        count: item._count.productId
      })),
      mostPurchased: mostPurchased.map((item) => ({
        product: productsById.get(item.productId),
        count: item._count.productId
      }))
    });
  } catch (error) {
    console.error('Recommendation Analytics Error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendation analytics' });
  }
};

export const getRecommendationEvaluation = async (req, res) => {
  try {
    const k = toPositiveLimit(req.query.k, 5);
    const metrics = await evaluateRecommendations({ k });
    res.json({ k, metrics });
  } catch (error) {
    console.error('Recommendation Evaluation Error:', error);
    res.status(500).json({ error: 'Failed to evaluate recommendations' });
  }
};
