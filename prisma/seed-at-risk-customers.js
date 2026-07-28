/**
 * Seed script: Creates 50 at-risk customer records for the wholesaler
 * linked to databasemanagementoperatingsys@gmail.com.
 *
 * The analytics churn-risk heuristic flags customers as:
 *   - HIGH risk: 2+ orders AND >90 days since last order
 *   - MEDIUM risk: (2+ orders AND 45–90 days) OR (1 order AND >30 days)
 *
 * Run: node prisma/seed-at-risk-customers.js
 */

import { prisma } from '../src/config/db.js';

const WHOLESALER_EMAIL = 'databasemanagementoperatingsys@gmail.com';
const TOTAL_CUSTOMERS = 50;

// Helpers
function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(2);
}

const firstNames = [
  'Aarav',
  'Vivaan',
  'Aditya',
  'Vihaan',
  'Arjun',
  'Sai',
  'Reyansh',
  'Ayaan',
  'Krishna',
  'Ishaan',
  'Shaurya',
  'Atharv',
  'Advait',
  'Dhruv',
  'Kabir',
  'Ritvik',
  'Aarush',
  'Rudra',
  'Pranav',
  'Harsh',
  'Ananya',
  'Diya',
  'Myra',
  'Sara',
  'Aadhya',
  'Isha',
  'Kiara',
  'Zara',
  'Anika',
  'Riya',
  'Prisha',
  'Navya',
  'Tara',
  'Mira',
  'Aanya',
  'Pari',
  'Ahana',
  'Saanvi',
  'Kavya',
  'Ishita',
  'Rohan',
  'Kunal',
  'Mohit',
  'Vikram',
  'Tanvi',
  'Pooja',
  'Neha',
  'Rahul',
  'Amit',
  'Sneha',
];

const lastNames = [
  'Sharma',
  'Verma',
  'Gupta',
  'Singh',
  'Patel',
  'Kumar',
  'Jain',
  'Mehta',
  'Agarwal',
  'Mishra',
  'Reddy',
  'Nair',
  'Menon',
  'Iyer',
  'Rao',
  'Kapoor',
  'Bhat',
  'Desai',
  'Shah',
  'Thakur',
];

async function main() {
  console.log('🔍 Finding wholesaler...');

  const user = await prisma.user.findUnique({
    where: { email: WHOLESALER_EMAIL },
    include: { wholesalerProfile: true },
  });

  if (!user || !user.wholesalerProfile) {
    throw new Error(`Wholesaler not found for email: ${WHOLESALER_EMAIL}`);
  }

  const wholesalerId = user.wholesalerProfile.id;
  console.log(`✅ Found wholesaler: ${user.wholesalerProfile.businessName} (${wholesalerId})`);

  // Get or create a product for order items
  let product = await prisma.product.findFirst({ where: { wholesalerId } });

  if (!product) {
    console.log('📦 No existing product found, creating one...');
    product = await prisma.product.create({
      data: {
        wholesalerId,
        name: 'Sample Widget',
        price: 250,
        costPrice: 150,
        actualPrice: 300,
        sku: 'SEED-WIDGET-001',
        category: 'General',
        currentStock: 500,
      },
    });
  }

  console.log(`📦 Using product: ${product.name} (${product.id})`);
  console.log(`👥 Creating ${TOTAL_CUSTOMERS} at-risk customers with orders...\n`);

  let highCount = 0;
  let mediumCount = 0;

  for (let i = 0; i < TOTAL_CUSTOMERS; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const name = `${firstName} ${lastName}`;
    const email = `atrisk.seed.${i + 1}@fakecustomer.dev`;

    // Determine risk profile
    // ~20 high risk, ~30 medium risk
    const isHighRisk = i < 20;

    let orderCount;
    let lastOrderDaysAgo;

    if (isHighRisk) {
      // HIGH: 2+ orders, last order >90 days ago
      orderCount = randomInt(2, 5);
      lastOrderDaysAgo = randomInt(91, 200);
      highCount++;
    } else {
      // MEDIUM: either (2+ orders, 45-90 days) or (1 order, >30 days)
      const variant = i % 2 === 0;
      if (variant) {
        // 2+ orders, 45-90 days since last
        orderCount = randomInt(2, 4);
        lastOrderDaysAgo = randomInt(45, 90);
      } else {
        // 1 order, >30 days since last
        orderCount = 1;
        lastOrderDaysAgo = randomInt(31, 120);
      }
      mediumCount++;
    }

    // Create or upsert the customer
    const customer = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        name,
        email,
        password: '$2b$10$dummyHashForSeedDataOnly000000000000000000000000',
        role: 'CUSTOMER',
      },
    });

    // Create orders for this customer
    for (let o = 0; o < orderCount; o++) {
      // Space orders out: most recent one = lastOrderDaysAgo, older ones further back
      const orderDaysAgo = lastOrderDaysAgo + o * randomInt(15, 60);
      const qty = randomInt(1, 10);
      const unitPrice = randomDecimal(100, 800);
      const subtotal = +(unitPrice * qty).toFixed(2);

      await prisma.order.create({
        data: {
          sellerId: wholesalerId,
          buyerId: customer.id,
          status: 'DELIVERED',
          paymentMethod: 'COD',
          paymentStatus: 'PAID',
          totalAmount: subtotal,
          createdAt: daysAgo(orderDaysAgo),
          items: {
            create: {
              productId: product.id,
              quantity: qty,
              price: unitPrice,
              unitPriceAtPurchase: unitPrice,
              subtotalAtPurchase: subtotal,
            },
          },
        },
      });
    }

    const riskLabel = isHighRisk ? '🔴 HIGH' : '🟡 MEDIUM';
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(
        `  [${i + 1}/${TOTAL_CUSTOMERS}] ${name} — ${riskLabel} risk, ${orderCount} orders, last ${lastOrderDaysAgo}d ago`
      );
    }
  }

  console.log(`\n✅ Done! Created ${TOTAL_CUSTOMERS} at-risk customers.`);
  console.log(`   🔴 High risk: ${highCount}`);
  console.log(`   🟡 Medium risk: ${mediumCount}`);
  console.log(`\n💡 These will now appear in the "At-Risk Customers" panel on the Analytics page.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
