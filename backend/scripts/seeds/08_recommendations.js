export default async function seedRecommendations(prisma, customers, products) {
  console.log('🤖 Seeding AI Recommendation Engine metrics and features...');

  const customerUsers = customers.filter((c) => c.role === 'CUSTOMER');

  // 1. Seed Product Features (ProductFeature) for all products
  console.log('  - Populating product text corpora and TF-IDF features...');
  const featuresToCreate = products.map((p) => {
    const textCorpus = `${p.name} ${p.description || ''} ${p.category}`.toLowerCase();

    // Generate simple mock TF-IDF vector
    const words = textCorpus.split(/\s+/).filter((w) => w.length > 3);
    const tfidfVector = {};
    words.forEach((w, idx) => {
      tfidfVector[w] = Math.round((1.0 / (idx + 1)) * 100) / 100;
    });

    const mockEmbedding = Array.from(
      { length: 5 },
      () => Math.round((Math.random() * 2 - 1) * 100) / 100
    );

    return {
      productId: p.id,
      textCorpus,
      tfidfVector,
      embedding: mockEmbedding,
    };
  });

  // Prisma createMany does not support nested features sometimes or is faster with standard createMany
  await prisma.productFeature.createMany({ data: featuresToCreate });

  // 2. Seed Content-based Similarities (ProductSimilarity)
  console.log('  - Seeding mock content-based product similarities...');
  const similaritiesToCreate = [];

  // Group products by category to seed similarities within the same category
  const productsByCategory = new Map();
  for (const product of products) {
    const list = productsByCategory.get(product.category) || [];
    list.push(product);
    productsByCategory.set(product.category, list);
  }

  for (const product of products) {
    const sameCategoryList = productsByCategory.get(product.category) || [];
    const otherProducts = sameCategoryList.filter((p) => p.id !== product.id);

    // Pick up to 3 similar products in the same category
    const shuffledOthers = [...otherProducts].sort(() => 0.5 - Math.random());
    const selectedOthers = shuffledOthers.slice(0, Math.min(3, shuffledOthers.length));

    selectedOthers.forEach((other, index) => {
      similaritiesToCreate.push({
        productId: product.id,
        similarProductId: other.id,
        method: 'CONTENT',
        score: Math.round((0.65 + Math.random() * 0.3) * 100) / 100,
        rank: index + 1,
      });
    });
  }

  await prisma.productSimilarity.createMany({ data: similaritiesToCreate });

  // 3. Seed Recommendation Logs, Events and Interactions
  console.log('  - Seeding recommendation impression logs and click events...');

  for (let i = 0; i < 20; i++) {
    const customer = customerUsers[i % customerUsers.length];

    // Pick 5 random products recommended
    const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
    const recommended = shuffledProducts.slice(0, 5);
    const recommendedIds = recommended.map((p) => p.id);

    const log = await prisma.recommendationLog.create({
      data: {
        userId: customer.id,
        surface: i % 2 === 0 ? 'storefront_personalized' : 'product_detail_similar',
        algorithm: i % 2 === 0 ? 'hybrid_user_v1' : 'hybrid_similar_v1',
        productIds: recommendedIds,
        isEvaluation: false,
      },
    });

    // Log impression events for all recommended products
    const impressions = recommended.map((p) => ({
      recommendationLogId: log.id,
      productId: p.id,
      userId: customer.id,
      eventType: 'impression',
    }));
    await prisma.recommendationEvent.createMany({ data: impressions });

    // 50% chance the user clicked on one of the recommended products
    if (Math.random() > 0.5) {
      const clickedProduct = recommended[0];
      await prisma.recommendationEvent.create({
        data: {
          recommendationLogId: log.id,
          productId: clickedProduct.id,
          userId: customer.id,
          eventType: 'click',
        },
      });

      // 40% chance they added to cart after click
      if (Math.random() > 0.6) {
        await prisma.recommendationEvent.create({
          data: {
            recommendationLogId: log.id,
            productId: clickedProduct.id,
            userId: customer.id,
            eventType: 'cart',
          },
        });

        // 20% chance they purchased
        if (Math.random() > 0.8) {
          await prisma.recommendationEvent.create({
            data: {
              recommendationLogId: log.id,
              productId: clickedProduct.id,
              userId: customer.id,
              eventType: 'purchase',
            },
          });
        }
      }
    }
  }

  // 4. Seed Recommendation Interactions (RecommendationInteraction)
  console.log('  - Seeding customer storefront interactions...');
  const interactionsToCreate = [];
  const actions = ['view', 'wishlist', 'cart', 'purchase', 'review'];

  for (let i = 0; i < 40; i++) {
    const customer = customerUsers[Math.floor(Math.random() * customerUsers.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const action = actions[i % actions.length];

    interactionsToCreate.push({
      userId: customer.id,
      productId: product.id,
      action,
      quantity: action === 'purchase' ? Math.floor(Math.random() * 2) + 1 : 1,
      source: i % 2 === 0 ? 'storefront' : 'direct',
      metadata: { referrer: i % 2 === 0 ? 'campaign_spring' : 'search_bar' },
    });
  }
  await prisma.recommendationInteraction.createMany({ data: interactionsToCreate });

  // 5. Seed Evaluation Reports (RecommendationEvaluationReport)
  console.log('  - Seeding evaluation reports...');
  await prisma.recommendationEvaluationReport.create({
    data: {
      reportType: 'offline',
      k: 5,
      metrics: { precision: 0.44, recall: 0.39, ndcg: 0.48 },
      notes: 'Offline TF-IDF content similarity evaluation run.',
    },
  });
  await prisma.recommendationEvaluationReport.create({
    data: {
      reportType: 'online',
      k: 10,
      metrics: { ctr: 0.082, conversion_rate: 0.024 },
      notes: 'A/B test evaluation run on personalization algorithm.',
    },
  });

  console.log('✅ Successfully seeded all recommendation logs, features, events, and reports.');
}
