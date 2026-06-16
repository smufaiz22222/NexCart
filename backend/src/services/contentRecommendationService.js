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
    product.wholesaler?.businessName
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
      wholesaler: { select: { businessName: true } }
    }
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
          version: { increment: 1 }
        },
        create: {
          productId: item.productId,
          textCorpus: item.textCorpus,
          tfidfVector: item.vector
        }
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
          score: cosineSimilarity(source.vector, candidate.vector)
        }))
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((candidate, index) => ({
          ...candidate,
          method: 'CONTENT',
          rank: index + 1
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
