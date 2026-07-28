/**
 * seedInteractions.js
 * Seeds realistic RecommendationInteraction data across all customers & products,
 * then rebuilds all three recommendation models (collaborative, content, popularity).
 *
 * Run: node scripts/seedInteractions.js
 */

import { prisma, getPrismaClient } from '../src/config/db.js';
import { buildCollaborativeRecommendations } from '../src/services/collaborativeFilteringService.js';
import { buildContentRecommendations } from '../src/services/contentRecommendationService.js';

// ── Config ──────────────────────────────────────────────────────────────────
const DAYS_BACK = 60; // spread interactions over last 60 days
const VIEWS_PER_USER = 40; // products each user views
const WISHLIST_RATIO = 0.25; // 25% of viewed → wishlisted
const CART_RATIO = 0.4; // 40% of viewed → carted
const PURCHASE_RATIO = 0.3; // 30% of carted → purchased
const REVIEW_RATIO = 0.5; // 50% of purchased → reviewed
const BATCH_SIZE = 500; // createMany batch size

// ── Helpers ──────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

/** Random timestamp between `daysAgo` days ago and now */
const randomDate = (daysAgo = DAYS_BACK) => {
  const msAgo = rand(0, daysAgo * 24 * 60 * 60 * 1000);
  return new Date(Date.now() - msAgo);
};

/** Pick `n` random items from array */
const sample = (arr, n) => shuffle([...arr]).slice(0, Math.min(n, arr.length));

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📦 Fetching customers and products...');

  const [customers, products] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: { id: true },
    }),
    prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      select: { id: true, price: true },
    }),
  ]);

  if (customers.length === 0) throw new Error('No CUSTOMER users found. Seed users first.');
  if (products.length === 0) throw new Error('No products with stock found.');

  console.log(`✅ Found ${customers.length} customers and ${products.length} products.`);

  const productIds = products.map((p) => p.id);
  const priceMap = Object.fromEntries(products.map((p) => [p.id, p.price]));

  // Collect all rows before bulk-inserting
  const viewRows = [];
  const wishlistRows = [];
  const cartRows = [];
  const purchaseRows = [];
  const reviewRows = [];

  for (const { id: userId } of customers) {
    // Each user views a random subset of products
    const viewed = sample(productIds, rand(Math.floor(VIEWS_PER_USER * 0.5), VIEWS_PER_USER));
    const wishlisted = sample(viewed, Math.floor(viewed.length * WISHLIST_RATIO));
    const carted = sample(viewed, Math.floor(viewed.length * CART_RATIO));
    const purchased = sample(carted, Math.floor(carted.length * PURCHASE_RATIO));
    const reviewed = sample(purchased, Math.floor(purchased.length * REVIEW_RATIO));

    for (const productId of viewed) {
      viewRows.push({
        userId,
        productId,
        action: 'view',
        quantity: 1,
        source: 'seed',
        metadata: {},
        createdAt: randomDate(),
      });
    }

    for (const productId of wishlisted) {
      wishlistRows.push({
        userId,
        productId,
        action: 'wishlist',
        quantity: 1,
        source: 'seed',
        metadata: {},
        createdAt: randomDate(),
      });
    }

    for (const productId of carted) {
      const qty = rand(1, 5);
      cartRows.push({
        userId,
        productId,
        action: 'cart',
        quantity: qty,
        source: 'seed',
        metadata: {},
        createdAt: randomDate(),
      });
    }

    for (const productId of purchased) {
      const qty = rand(1, 3);
      purchaseRows.push({
        userId,
        productId,
        action: 'purchase',
        quantity: qty,
        source: 'seed',
        metadata: { orderItemPrice: String(priceMap[productId] ?? 0) },
        createdAt: randomDate(),
      });
    }

    for (const productId of reviewed) {
      reviewRows.push({
        userId,
        productId,
        action: 'review',
        quantity: 1,
        source: 'seed',
        metadata: { rating: rand(3, 5) },
        createdAt: randomDate(),
      });
    }
  }

  const allRows = [...viewRows, ...wishlistRows, ...cartRows, ...purchaseRows, ...reviewRows];
  console.log(`\n📊 Interaction breakdown:`);
  console.log(`   views:     ${viewRows.length}`);
  console.log(`   wishlist:  ${wishlistRows.length}`);
  console.log(`   cart:      ${cartRows.length}`);
  console.log(`   purchases: ${purchaseRows.length}`);
  console.log(`   reviews:   ${reviewRows.length}`);
  console.log(`   TOTAL:     ${allRows.length}\n`);

  // Bulk insert in batches
  let inserted = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    await prisma.recommendationInteraction.createMany({ data: batch });
    inserted += batch.length;
    process.stdout.write(`\r   Inserted ${inserted} / ${allRows.length} interactions...`);
  }
  console.log('\n✅ All interactions inserted.\n');

  // ── Rebuild recommendation models ────────────────────────────────────────
  console.log('🔄 Rebuilding collaborative filtering model...');
  const colResult = await buildCollaborativeRecommendations({ topK: 15 });
  console.log(
    `   ✅ Collaborative: ${colResult.productsProcessed} products, ${colResult.similaritiesCreated} similarities.\n`
  );

  console.log('🔄 Rebuilding content-based model...');
  try {
    const contentResult = await buildContentRecommendations({ topK: 15 });
    console.log(`   ✅ Content-Based: done.`, contentResult ?? '');
  } catch (e) {
    console.warn('   ⚠️  Content-based rebuild skipped:', e.message);
  }

  console.log(
    '\n🎉 Recommendation seeding complete! Run the recommendation job scripts to rebuild popularity.'
  );
}

main()
  .catch((e) => {
    console.error('\n❌ Error:', e);
    process.exit(1);
  })
  .finally(() => getPrismaClient().$disconnect());
