import { prisma } from '../config/db.js';

const tokenize = (text) => {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
};

const buildCorpus = (product) => {
  const parts = [
    product.name,
    product.category,
    product.description,
    product.sku,
    product.sizes?.join(' '),
    product.wholesaler?.businessName,
  ];

  return parts.filter(Boolean).join(' ');
};

const cosineSimilarity = (left, right) => {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  const terms = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const term of terms) {
    const a = left[term] || 0;
    const b = right[term] || 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }

  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
};

export const buildContentRecommendations = async ({ topK = 10 } = {}) => {
  const products = await prisma.product.findMany({
    include: {
      wholesaler: { select: { businessName: true } },
    },
  });

  if (products.length === 0) {
    return { productsProcessed: 0, similaritiesCreated: 0 };
  }

  const documents = products.map((product) => {
    const textCorpus = buildCorpus(product);
    const tokens = tokenize(textCorpus);
    return { product, textCorpus, tokens };
  });

  const documentFrequency = {};
  documents.forEach((doc) => {
    for (const term of new Set(doc.tokens)) {
      documentFrequency[term] = (documentFrequency[term] || 0) + 1;
    }
  });

  const vectors = documents.map((doc) => {
    const termFrequency = {};
    doc.tokens.forEach((term) => {
      termFrequency[term] = (termFrequency[term] || 0) + 1;
    });

    const vector = {};
    for (const [term, count] of Object.entries(termFrequency)) {
      const tf = count / doc.tokens.length;
      const idf = Math.log((documents.length + 1) / ((documentFrequency[term] || 0) + 1)) + 1;
      vector[term] = Number((tf * idf).toFixed(6));
    }

    return { productId: doc.product.id, textCorpus: doc.textCorpus, vector };
  });

  await prisma.$transaction(async (tx) => {
    for (const item of vectors) {
      await tx.productFeature.upsert({
        where: { productId: item.productId },
        update: {
          textCorpus: item.textCorpus,
          tfidfVector: item.vector,
          version: { increment: 1 },
        },
        create: {
          productId: item.productId,
          textCorpus: item.textCorpus,
          tfidfVector: item.vector,
        },
      });
    }

    await tx.productSimilarity.deleteMany({ where: { method: 'CONTENT' } });

    const similarityRows = [];
    for (const source of vectors) {
      const ranked = vectors
        .filter((candidate) => candidate.productId !== source.productId)
        .map((candidate) => ({
          productId: source.productId,
          similarProductId: candidate.productId,
          score: cosineSimilarity(source.vector, candidate.vector),
        }))
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((candidate, index) => ({
          ...candidate,
          method: 'CONTENT',
          rank: index + 1,
        }));

      similarityRows.push(...ranked);
    }

    if (similarityRows.length > 0) {
      await tx.productSimilarity.createMany({ data: similarityRows });
    }
  });

  const similaritiesCreated = vectors.length * Math.min(topK, Math.max(products.length - 1, 0));
  return { productsProcessed: products.length, similaritiesCreated };
};

export const getContentSimilarProducts = async ({ productId, limit = 8 }) => {
  return prisma.productSimilarity.findMany({
    where: {
      productId,
      method: 'CONTENT',
      similarProduct: { currentStock: { gt: 0 } },
    },
    include: {
      similarProduct: {
        include: {
          wholesaler: { select: { businessName: true } },
        },
      },
    },
    orderBy: { rank: 'asc' },
    take: limit,
  });
};

export const updateSingleProductContentRecommendations = async (productId, { topK = 10 } = {}) => {
  // 1. Fetch the target product
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      wholesaler: { select: { businessName: true } },
    },
  });
  if (!product) return { productId, similaritiesUpdated: 0 };

  // 2. Load all existing product features
  const existingFeatures = await prisma.productFeature.findMany();

  // 3. Compute document frequencies across all products
  const documentFrequency = {};

  // First, add all existing features to the count
  existingFeatures.forEach((feat) => {
    // If it's the product being updated, we will use its new corpus instead of old
    if (feat.productId === productId) return;
    const vectorTerms = Object.keys(feat.tfidfVector || {});
    for (const term of vectorTerms) {
      documentFrequency[term] = (documentFrequency[term] || 0) + 1;
    }
  });

  // Now build the new corpus/tokens for the updated product
  const textCorpus = buildCorpus(product);
  const tokens = tokenize(textCorpus);
  for (const term of new Set(tokens)) {
    documentFrequency[term] = (documentFrequency[term] || 0) + 1;
  }

  const hasExistingFeature = existingFeatures.some((f) => f.productId === productId);
  const totalDocs = hasExistingFeature ? existingFeatures.length : existingFeatures.length + 1;

  // 4. Compute TF-IDF vector for the updated product
  const termFrequency = {};
  tokens.forEach((term) => {
    termFrequency[term] = (termFrequency[term] || 0) + 1;
  });

  const newVector = {};
  for (const [term, count] of Object.entries(termFrequency)) {
    const tf = count / tokens.length;
    const idf = Math.log((totalDocs + 1) / ((documentFrequency[term] || 0) + 1)) + 1;
    newVector[term] = Number((tf * idf).toFixed(6));
  }

  // 5. Upsert the product feature for the updated product
  await prisma.productFeature.upsert({
    where: { productId },
    update: {
      textCorpus,
      tfidfVector: newVector,
      version: { increment: 1 },
    },
    create: {
      productId,
      textCorpus,
      tfidfVector: newVector,
    },
  });

  // 6. Compute similarities between the updated product and all other products
  const similaritiesToInsert = [];
  const otherSimilaritiesToUpdate = [];

  for (const feat of existingFeatures) {
    if (feat.productId === productId) continue;
    const score = cosineSimilarity(newVector, feat.tfidfVector);
    if (score > 0) {
      similaritiesToInsert.push({
        productId,
        similarProductId: feat.productId,
        score,
      });

      otherSimilaritiesToUpdate.push({
        productId: feat.productId,
        similarProductId: productId,
        score,
      });
    }
  }

  // Sort and pick topK similarities for the updated product
  const rankedSourceSimilarities = similaritiesToInsert
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item, index) => ({
      ...item,
      method: 'CONTENT',
      rank: index + 1,
    }));

  // Load all existing content similarities to check against other products in-memory
  const allSimilarities = await prisma.productSimilarity.findMany({
    where: { method: 'CONTENT' },
  });

  const simMap = new Map();
  allSimilarities.forEach((sim) => {
    if (!simMap.has(sim.productId)) {
      simMap.set(sim.productId, []);
    }
    simMap.get(sim.productId).push(sim);
  });

  const modifiedProductIds = new Set([productId]);
  const newSimilaritiesMap = new Map();
  newSimilaritiesMap.set(productId, rankedSourceSimilarities);

  for (const item of otherSimilaritiesToUpdate) {
    const existing = simMap.get(item.productId) || [];
    const hasAlreadyInSims = existing.some((e) => e.similarProductId === item.similarProductId);

    if (existing.length < topK || hasAlreadyInSims) {
      const filtered = existing.filter((e) => e.similarProductId !== item.similarProductId);
      const newSims = [
        ...filtered.map((e) => ({
          productId: e.productId,
          similarProductId: e.similarProductId,
          score: e.score,
        })),
        {
          productId: item.productId,
          similarProductId: item.similarProductId,
          score: item.score,
        },
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((s, idx) => ({
          ...s,
          method: 'CONTENT',
          rank: idx + 1,
        }));

      modifiedProductIds.add(item.productId);
      newSimilaritiesMap.set(item.productId, newSims);
    } else {
      const worst = existing[existing.length - 1];
      if (item.score > worst.score) {
        const newSims = [
          ...existing.slice(0, -1).map((e) => ({
            productId: e.productId,
            similarProductId: e.similarProductId,
            score: e.score,
          })),
          {
            productId: item.productId,
            similarProductId: item.similarProductId,
            score: item.score,
          },
        ]
          .sort((a, b) => b.score - a.score)
          .slice(0, topK)
          .map((s, idx) => ({
            ...s,
            method: 'CONTENT',
            rank: idx + 1,
          }));

        modifiedProductIds.add(item.productId);
        newSimilaritiesMap.set(item.productId, newSims);
      }
    }
  }

  // Flatten new similarities to write
  const allNewSimilarityRows = [];
  newSimilaritiesMap.forEach((sims) => {
    allNewSimilarityRows.push(...sims);
  });

  // Perform DB updates in transaction
  await prisma.$transaction(async (tx) => {
    // Delete old similarities for modified products
    if (modifiedProductIds.size > 0) {
      await tx.productSimilarity.deleteMany({
        where: {
          productId: { in: Array.from(modifiedProductIds) },
          method: 'CONTENT',
        },
      });
    }

    // Insert all new similarities in bulk
    if (allNewSimilarityRows.length > 0) {
      await tx.productSimilarity.createMany({
        data: allNewSimilarityRows,
      });
    }
  });

  return { productId, similaritiesUpdated: rankedSourceSimilarities.length };
};

const pendingProductIds = new Set();
let isProcessingQueue = false;

const processUpdateQueue = async () => {
  if (isProcessingQueue || pendingProductIds.size === 0) return;
  isProcessingQueue = true;

  // Get the next product ID to process
  const [productId] = pendingProductIds;
  pendingProductIds.delete(productId);

  try {
    const result = await updateSingleProductContentRecommendations(productId);
    console.log(`Real-time content recommendations updated for product ${productId}:`, result);
  } catch (error) {
    console.error(`Failed to update recommendations for product ${productId}:`, error);
  } finally {
    isProcessingQueue = false;
    processUpdateQueue();
  }
};

export const queueProductRecommendationUpdate = (productId) => {
  pendingProductIds.add(productId);
  processUpdateQueue();
};
