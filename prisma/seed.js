import { prisma } from '../src/config/db.js';
import cleanDb from '../scripts/seeds/01_clean.js';
import seedUsers from '../scripts/seeds/02_users.js';
import seedProducts from '../scripts/seeds/03_products.js';
import seedReviews from '../scripts/seeds/04_reviews.js';
import seedOrders from '../scripts/seeds/05_orders.js';
import seedIssues from '../scripts/seeds/06_issues.js';
import seedCheckout from '../scripts/seeds/07_checkout.js';
import seedRecommendations from '../scripts/seeds/08_recommendations.js';

async function main() {
  console.log('🌱 Starting comprehensive sequential database seeding...');
  const startTime = Date.now();

  // 1. Clean database
  await cleanDb(prisma);

  // 2. Seed users (including Super Admin)
  const { customers, wholesalers } = await seedUsers(prisma);

  // 3. Seed products & initial stocking inventory logs
  const products = await seedProducts(prisma, wholesalers);

  // 4. Seed reviews and ratings
  await seedReviews(prisma, customers, products);

  // 5. Seed orders, items, invoices, sales inventory logs, and initial credit ledgers
  const orders = await seedOrders(prisma, customers, products);

  // 6. Seed return/refund order issues
  await seedIssues(prisma, orders);

  // 7. Seed prepaid Razorpay checkout sessions
  await seedCheckout(prisma, customers);

  // 8. Seed AI recommendations data (features, similarities, CTR logs, events, interactions, evaluations)
  await seedRecommendations(prisma, customers, products);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Comprehensive sequential database seeding completed in ${duration}s!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
