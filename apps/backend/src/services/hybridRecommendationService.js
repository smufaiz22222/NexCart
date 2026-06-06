import { prisma } from '../config/db.js';
import { getCollaborativeSimilarProducts } from './collaborativeFilteringService.js';
import { getContentSimilarProducts } from './contentRecommendationService.js';
import { getPopularProducts } from './popularityService.js';
import { HYBRID_WEIGHTS } from './recommendationConstants.js';

const normalize = (items, scoreKey = 'score') => {
  const maxScore = Math.max(...items.map((item) => item[scoreKey] || 0), 0);
  if (!maxScore) return items.map((item) => ({ ...item, normalizedScore: 0 }));
  return items.map((item) => ({ ...item, normalizedScore: (item[scoreKey] || 0) / maxScore }));
};

const addCandidate = (candidates, product, source, score, reason) => {
  if (!product || product.currentStock <= 0) return;

  const current = candidates.get(product.id) || {
    product,
    sourceScores: { content: 0, collaborative: 0, popularity: 0, review: 0 },
    reasons: new Set()
  };

  current.sourceScores[source] = Math.max(current.sourceScores[source] || 0, score);
  current.reasons.add(reason);
  candidates.set(product.id, current);
};

const addReviewScores = async (candidateMap) => {
  const productIds = [...candidateMap.keys()];
  if (productIds.length === 0) return;

  const ratings = await prisma.review.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { rating: true }
  });

  for (const rating of ratings) {
    const candidate = candidateMap.get(rating.productId);
    if (!candidate) continue;
    const average = rating._avg.rating || 0;
    const confidence = Math.min(1, rating._count.rating / 5);
    candidate.sourceScores.review = (average / 5) * confidence;
    candidate.reasons.add('Positive customer ratings');
  }
};

const finalizeCandidates = async ({ candidates, limit, algorithm, surface, userId, sessionId }) => {
  await addReviewScores(candidates);

  const ranked = [...candidates.values()]
    .map((candidate) => {
      const score =
        candidate.sourceScores.content * HYBRID_WEIGHTS.content +
        candidate.sourceScores.collaborative * HYBRID_WEIGHTS.collaborative +
        candidate.sourceScores.popularity * HYBRID_WEIGHTS.popularity +
        candidate.sourceScores.review * HYBRID_WEIGHTS.review;

      return {
        product: candidate.product,
        score,
        reasons: [...candidate.reasons].slice(0, 3),
        sourceScores: candidate.sourceScores
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const log = await prisma.recommendationLog.create({
    data: {
      userId: userId || null,
      sessionId: sessionId || null,
      surface,
      algorithm,
      productIds: ranked.map((item) => item.product.id),
      events: {
        create: ranked.map((item) => ({
          productId: item.product.id,
          userId: userId || null,
          sessionId: sessionId || null,
          eventType: 'impression'
        }))
      }
    }
  });

  return {
    recommendationId: log.id,
    algorithm,
    recommendations: ranked
  };
};

export const getSimilarHybridRecommendations = async ({
  productId,
  limit = 8,
  userId,
  sessionId
}) => {
  const candidates = new Map();

  const [contentRows, collaborativeRows] = await Promise.all([
    getContentSimilarProducts({ productId, limit }),
    getCollaborativeSimilarProducts({ productId, limit })
  ]);

  const normalizedContent = normalize(contentRows);
  const normalizedCollaborative = normalize(collaborativeRows);

  for (const row of normalizedContent) {
    addCandidate(candidates, row.similarProduct, 'content', row.normalizedScore, 'Similar product details');
  }

  for (const row of normalizedCollaborative) {
    addCandidate(candidates, row.similarProduct, 'collaborative', row.normalizedScore, 'Frequently bought or viewed together');
  }

  const popularRows = await getPopularProducts({
    scope: 'trending',
    limit,
    excludeProductIds: [productId, ...candidates.keys()]
  });
  const normalizedPopular = normalize(popularRows);
  for (const row of normalizedPopular) {
    addCandidate(candidates, row.product, 'popularity', row.normalizedScore, row.reasons[0] || 'Trending product');
  }

  candidates.delete(productId);

  return finalizeCandidates({
    candidates,
    limit,
    algorithm: 'hybrid_similar_v1',
    surface: 'product_detail_similar',
    userId,
    sessionId
  });
};

export const getUserHybridRecommendations = async ({ userId, sessionId, limit = 12 }) => {
  const candidates = new Map();
  const recentInteractions = await prisma.recommendationInteraction.findMany({
    where: userId ? { userId } : { sessionId: sessionId || '' },
    orderBy: { createdAt: 'desc' },
    take: 8
  });

  const seenProductIds = [...new Set(recentInteractions.map((item) => item.productId))];

  for (const productId of seenProductIds.slice(0, 4)) {
    const [contentRows, collaborativeRows] = await Promise.all([
      getContentSimilarProducts({ productId, limit: 6 }),
      getCollaborativeSimilarProducts({ productId, limit: 6 })
    ]);

    for (const row of normalize(contentRows)) {
      addCandidate(candidates, row.similarProduct, 'content', row.normalizedScore, 'Based on products you explored');
    }

    for (const row of normalize(collaborativeRows)) {
      addCandidate(candidates, row.similarProduct, 'collaborative', row.normalizedScore, 'Customers with similar behavior also liked this');
    }
  }

  for (const productId of seenProductIds) {
    candidates.delete(productId);
  }

  const popularRows = await getPopularProducts({
    scope: 'trending',
    limit,
    excludeProductIds: [...seenProductIds, ...candidates.keys()]
  });

  for (const row of normalize(popularRows)) {
    addCandidate(candidates, row.product, 'popularity', row.normalizedScore, row.reasons[0] || 'Trending product');
  }

  return finalizeCandidates({
    candidates,
    limit,
    algorithm: 'hybrid_user_v1',
    surface: 'storefront_personalized',
    userId,
    sessionId
  });
};
