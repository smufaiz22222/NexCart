import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';

const DEMO_PASSWORD = '1234';
const CUSTOMER_COUNT = 40;
const LOOKBACK_DAYS = 60;
const RANDOM_SEED = 20260606;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const FIRST_NAMES = [
  'Aarav',
  'Diya',
  'Kabir',
  'Meera',
  'Rohan',
  'Anaya',
  'Ishaan',
  'Kiara',
  'Vivaan',
  'Saanvi',
  'Aditya',
  'Myra',
  'Reyansh',
  'Aditi',
  'Arjun',
  'Tara',
  'Veer',
  'Riya',
  'Krish',
  'Naina',
  'Yash',
  'Pooja',
  'Manav',
  'Siya',
];

const LAST_NAMES = [
  'Sharma',
  'Patel',
  'Khan',
  'Gupta',
  'Reddy',
  'Mehta',
  'Kapoor',
  'Nair',
  'Jain',
  'Bose',
  'Singh',
  'Joshi',
  'Das',
  'Rao',
  'Mishra',
  'Malhotra',
];

const REVIEW_COMMENTS = [
  'Great value for the price.',
  'Exactly what I expected.',
  'Quality feels solid and reliable.',
  'Would happily buy this again.',
  'Good fit for everyday use.',
  'Packaging and delivery were both smooth.',
  'Looks premium and performs well.',
  'Comfortable and worth recommending.',
];

const COHORTS = [
  {
    name: 'tech_enthusiasts',
    primaryCategories: ['Mobile', 'Computing', 'Audio', 'Wearables', 'Components'],
    secondaryCategories: ['Home Tech', 'Accessories', 'Cameras'],
    familyKeys: [
      'smartphones',
      'laptops',
      'audio',
      'wearables',
      'components',
      'monitors',
      'cables',
    ],
  },
  {
    name: 'office_home_utility',
    primaryCategories: ['Computing', 'Home Tech', 'Accessories', 'Storage'],
    secondaryCategories: ['Audio', 'Mobile', 'Bags'],
    familyKeys: ['monitors', 'storage', 'chargers', 'routers', 'smart_home', 'webcams', 'bags'],
  },
  {
    name: 'casual_apparel',
    primaryCategories: ['Tops', 'Outerwear', 'Bottoms', 'Shoes'],
    secondaryCategories: ['Fashion Accessories', 'Bags'],
    familyKeys: ['tees', 'hoodies', 'jeans', 'chinos', 'shorts', 'shoes', 'socks'],
  },
  {
    name: 'fashion_accessory',
    primaryCategories: ['Dresses', 'Tops', 'Fashion Accessories', 'Bags', 'Shoes'],
    secondaryCategories: ['Outerwear', 'Bottoms'],
    familyKeys: ['dresses', 'tops', 'sunglasses', 'belts', 'bags', 'shoes', 'jackets'],
  },
];

const FAMILY_SKUS = {
  smartphones: ['ELEC-001', 'ELEC-002'],
  laptops: ['ELEC-003', 'ELEC-004'],
  audio: ['ELEC-005', 'ELEC-006', 'ELEC-011'],
  wearables: ['ELEC-007', 'ELEC-008'],
  home_theater: ['ELEC-009', 'ELEC-010', 'ELEC-012'],
  peripherals: ['ELEC-013', 'ELEC-014', 'ELEC-015'],
  storage: ['ELEC-017', 'ELEC-018'],
  routers: ['ELEC-021', 'ELEC-022'],
  smart_home: ['ELEC-023', 'ELEC-024', 'ELEC-046', 'ELEC-047', 'ELEC-048', 'ELEC-049', 'ELEC-050'],
  cameras: ['ELEC-019', 'ELEC-020', 'ELEC-025', 'ELEC-026', 'ELEC-038', 'ELEC-039'],
  chargers: ['ELEC-029', 'ELEC-030', 'ELEC-031', 'ELEC-032', 'ELEC-033', 'ELEC-034'],
  monitors: ['ELEC-035', 'ELEC-036'],
  components: ['ELEC-040', 'ELEC-041', 'ELEC-042', 'ELEC-043', 'ELEC-044', 'ELEC-045'],
  tees: ['APP-051', 'APP-052', 'APP-053', 'APP-054'],
  tops: ['APP-055', 'APP-056', 'APP-057', 'APP-074', 'APP-075', 'APP-076', 'APP-081'],
  jackets: ['APP-058', 'APP-059', 'APP-060', 'APP-061', 'APP-062'],
  hoodies: ['APP-063', 'APP-064', 'APP-065'],
  jeans: ['APP-066', 'APP-067'],
  chinos: ['APP-068', 'APP-069', 'APP-070', 'APP-071'],
  shorts: ['APP-072', 'APP-073'],
  dresses: ['APP-077', 'APP-078', 'APP-079', 'APP-080'],
  knitwear: ['APP-082', 'APP-083'],
  hats: ['APP-084', 'APP-085'],
  belts: ['APP-086', 'APP-087'],
  shoes: ['APP-088', 'APP-089', 'APP-090', 'APP-091'],
  socks: ['APP-092', 'APP-093', 'APP-094'],
  accessories: ['APP-095', 'APP-096'],
  sunglasses: ['APP-097', 'APP-098'],
  bags: ['APP-099', 'APP-100'],
};

const COHORT_SURFACE_ALGORITHMS = {
  storefront_trending: 'popularity_trending_v1',
  storefront_personalized: 'hybrid_user_v1',
  product_detail_similar: 'hybrid_similar_v1',
};

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffle(rng, items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function uniqueById(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function clampToBudget(product, budgetBand) {
  if (budgetBand === 'low') return product.price <= 120;
  if (budgetBand === 'medium') return product.price >= 25 && product.price <= 350;
  return product.price >= 60;
}

function categoryForProduct(product) {
  if (product.sku?.startsWith('ELEC')) {
    const name = product.name.toLowerCase();
    if (name.includes('smartphone') || name.includes('tablet') || name.includes('e-reader'))
      return 'Mobile';
    if (name.includes('laptop') || name.includes('monitor')) return 'Computing';
    if (
      name.includes('earbuds') ||
      name.includes('headphones') ||
      name.includes('speaker') ||
      name.includes('microphone') ||
      name.includes('home theater')
    )
      return 'Audio';
    if (name.includes('smartwatch') || name.includes('fitness tracker')) return 'Wearables';
    if (
      name.includes('router') ||
      name.includes('mesh') ||
      name.includes('smart plug') ||
      name.includes('smart bulb') ||
      name.includes('smart lock') ||
      name.includes('doorbell') ||
      name.includes('security camera') ||
      name.includes('thermostat') ||
      name.includes('robot vacuum')
    )
      return 'Home Tech';
    if (
      name.includes('camera') ||
      name.includes('webcam') ||
      name.includes('drone') ||
      name.includes('ring light') ||
      name.includes('tripod')
    )
      return 'Cameras';
    if (name.includes('ssd') || name.includes('hdd')) return 'Storage';
    if (
      name.includes('keyboard') ||
      name.includes('mouse') ||
      name.includes('hub') ||
      name.includes('charger') ||
      name.includes('cable') ||
      name.includes('power bank')
    )
      return 'Accessories';
    if (
      name.includes('graphics card') ||
      name.includes('cpu') ||
      name.includes('motherboard') ||
      name.includes('ram') ||
      name.includes('pc case') ||
      name.includes('power supply')
    )
      return 'Components';
    return 'Electronics';
  }

  const name = product.name.toLowerCase();
  if (name.includes('jacket')) return 'Outerwear';
  if (
    name.includes('hoodie') ||
    name.includes('sweatshirt') ||
    name.includes('shirt') ||
    name.includes('tee') ||
    name.includes('blouse') ||
    name.includes('cardigan') ||
    name.includes('turtleneck')
  )
    return 'Tops';
  if (
    name.includes('jeans') ||
    name.includes('pants') ||
    name.includes('joggers') ||
    name.includes('shorts') ||
    name.includes('skirt')
  )
    return 'Bottoms';
  if (name.includes('dress')) return 'Dresses';
  if (name.includes('sneakers') || name.includes('shoes') || name.includes('boots')) return 'Shoes';
  if (name.includes('backpack') || name.includes('duffel')) return 'Bags';
  if (
    name.includes('belt') ||
    name.includes('hat') ||
    name.includes('cap') ||
    name.includes('sock') ||
    name.includes('underwear') ||
    name.includes('scarf') ||
    name.includes('gloves') ||
    name.includes('sunglasses')
  )
    return 'Fashion Accessories';
  return 'Apparel';
}

function sizesForProduct(product, category) {
  if (category === 'Shoes') return ['7', '8', '9', '10', '11'];
  if (['Apparel', 'Outerwear', 'Tops', 'Bottoms', 'Dresses'].includes(category))
    return ['S', 'M', 'L', 'XL'];
  return [];
}

function createCustomers(rng) {
  return Array.from({ length: CUSTOMER_COUNT }, (_, index) => {
    const cohort = COHORTS[index % COHORTS.length];
    const budgetBand = ['low', 'medium', 'premium'][index % 3];
    const activityLevel = ['light', 'medium', 'heavy'][Math.floor(index / 4) % 3];
    const conversionTendency = ['browser', 'balanced', 'decisive'][Math.floor(index / 5) % 3];
    const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[index % LAST_NAMES.length]}`;
    const email =
      index === 0
        ? 'buyer@example.com'
        : `demo.customer${String(index + 1).padStart(2, '0')}@example.com`;

    return {
      name,
      email,
      cohort,
      budgetBand,
      activityLevel,
      conversionTendency,
      primaryCategories: cohort.primaryCategories,
      secondaryCategories: cohort.secondaryCategories,
      familyKeys: cohort.familyKeys,
      seedOffsetDays: randomInt(rng, 2, 12) + index,
    };
  });
}

function pickProductsForCategories(productsByCategory, categories, rng, count, budgetBand) {
  const pool = uniqueById(
    categories.flatMap((category) => productsByCategory.get(category) || [])
  ).filter((product) => clampToBudget(product, budgetBand));

  const selectedPool =
    pool.length >= count
      ? pool
      : uniqueById(categories.flatMap((category) => productsByCategory.get(category) || []));
  return shuffle(rng, selectedPool).slice(0, Math.min(count, selectedPool.length));
}

function chooseFamilyProducts({ familyProducts, rng, preferredCount, budgetBand }) {
  const filtered = familyProducts.filter((product) => clampToBudget(product, budgetBand));
  const pool = filtered.length >= preferredCount ? filtered : familyProducts;
  return shuffle(rng, pool).slice(0, Math.min(preferredCount, pool.length));
}

function buildShownProducts({
  targetProduct,
  cohort,
  familyMap,
  productsByCategory,
  rng,
  budgetBand,
  desiredCount = 8,
}) {
  const familyProducts = Object.values(familyMap)
    .filter((family) => family.some((product) => product.id === targetProduct.id))
    .flat();

  const categoryProducts = pickProductsForCategories(
    productsByCategory,
    [...cohort.primaryCategories, ...cohort.secondaryCategories],
    rng,
    desiredCount * 2,
    budgetBand
  );

  const combined = uniqueById([targetProduct, ...familyProducts, ...categoryProducts]);
  const extras = shuffle(
    rng,
    combined.filter((product) => product.id !== targetProduct.id)
  );
  return [targetProduct, ...extras].slice(0, Math.min(desiredCount, combined.length));
}

async function restoreStockFromInventoryLogs() {
  const soldInventory = await prisma.inventoryLog.groupBy({
    by: ['productId'],
    _sum: { changeAmount: true },
  });

  for (const row of soldInventory) {
    const netChange = row._sum.changeAmount || 0;
    if (netChange >= 0) continue;
    await prisma.product.update({
      where: { id: row.productId },
      data: { currentStock: { increment: Math.abs(netChange) } },
    });
  }
}

async function clearDemoData() {
  await restoreStockFromInventoryLogs();

  await prisma.recommendationEvent.deleteMany();
  await prisma.recommendationLog.deleteMany();
  await prisma.recommendationInteraction.deleteMany();
  await prisma.recommendationEvaluationReport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany({ where: { role: 'CUSTOMER' } });
}

async function ensureAccounts() {
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password: hashedPassword, role: 'SUPER_ADMIN', name: 'Recommendation Admin' },
    create: {
      name: 'Recommendation Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  const wholesalerCount = await prisma.wholesaler.count();
  if (wholesalerCount < 2) {
    throw new Error('Base product seed is required before running recommendation demo seed.');
  }
}

async function enrichProductMetadata() {
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true },
  });

  await prisma.$transaction(
    products.map((product) => {
      const category = categoryForProduct(product);
      return prisma.product.update({
        where: { id: product.id },
        data: {
          category,
          sizes: sizesForProduct(product, category),
        },
      });
    })
  );
}

async function createCustomerUsers(customerSpecs) {
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const customers = [];

  for (const spec of customerSpecs) {
    const user = await prisma.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        password: hashedPassword,
        role: 'CUSTOMER',
      },
    });

    customers.push({ ...spec, id: user.id });
  }

  return customers;
}

async function loadProductContext() {
  const products = await prisma.product.findMany({
    include: {
      wholesaler: { select: { id: true, businessName: true } },
    },
    orderBy: { sku: 'asc' },
  });

  if (products.length === 0) {
    throw new Error('No products found. Run the base seed before the recommendation demo seed.');
  }

  const bySku = new Map(products.map((product) => [product.sku, product]));
  const byCategory = new Map();
  for (const product of products) {
    const list = byCategory.get(product.category) || [];
    list.push(product);
    byCategory.set(product.category, list);
  }

  const families = Object.fromEntries(
    Object.entries(FAMILY_SKUS).map(([key, skus]) => [
      key,
      skus.map((sku) => bySku.get(sku)).filter(Boolean),
    ])
  );

  return { products, bySku, byCategory, families };
}

async function createRecommendationLogWithEvents({
  customer,
  targetProduct,
  shownProducts,
  surface,
  createdAt,
  clickAt,
  includeClick = true,
}) {
  const log = await prisma.recommendationLog.create({
    data: {
      userId: customer.id,
      surface,
      algorithm: COHORT_SURFACE_ALGORITHMS[surface],
      productIds: shownProducts.map((product) => product.id),
      isEvaluation: false,
      createdAt,
    },
  });

  await prisma.recommendationEvent.createMany({
    data: shownProducts.map((product, index) => ({
      recommendationLogId: log.id,
      productId: product.id,
      userId: customer.id,
      eventType: 'impression',
      createdAt: new Date(createdAt.getTime() + index * 2 * 60 * 1000),
    })),
  });

  if (includeClick) {
    await prisma.recommendationEvent.create({
      data: {
        recommendationLogId: log.id,
        productId: targetProduct.id,
        userId: customer.id,
        eventType: 'click',
        createdAt: clickAt,
      },
    });
  }

  return log;
}

async function createOrderWithAttribution({ customer, items, createdAt }) {
  const itemsBySeller = new Map();

  for (const item of items) {
    const sellerId = item.product.wholesaler.id;
    const current = itemsBySeller.get(sellerId) || [];
    current.push(item);
    itemsBySeller.set(sellerId, current);
  }

  for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
    const totalAmount = sellerItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const order = await prisma.order.create({
      data: {
        sellerId,
        buyerId: customer.id,
        status: pick(createRng(RANDOM_SEED + createdAt.getTime()), [
          'DELIVERED',
          'DELIVERED',
          'SHIPPED',
        ]),
        totalAmount,
        shippingAddress: `${customer.name}, Demo Address Lane, Bengaluru`,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 2 * HOUR_MS),
      },
    });

    await prisma.orderItem.createMany({
      data: sellerItems.map((item) => ({
        orderId: order.id,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      })),
    });

    await prisma.invoice.create({
      data: {
        wholesalerId: sellerId,
        orderId: order.id,
        amount: totalAmount,
        createdAt: new Date(createdAt.getTime() + HOUR_MS),
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        wholesalerId: sellerId,
        userId: customer.id,
        amount: -totalAmount,
        description: `Demo recommendation order ${order.id}`,
        referenceId: order.id,
        createdAt: new Date(createdAt.getTime() + HOUR_MS),
      },
    });

    await prisma.inventoryLog.createMany({
      data: sellerItems.map((item) => ({
        wholesalerId: sellerId,
        productId: item.product.id,
        changeAmount: -item.quantity,
        reason: 'SALE',
        createdAt: new Date(createdAt.getTime() + HOUR_MS),
      })),
    });

    for (const item of sellerItems) {
      await prisma.product.update({
        where: { id: item.product.id },
        data: { currentStock: { decrement: item.quantity } },
      });
    }
  }
}

async function main() {
  const rng = createRng(RANDOM_SEED);
  const now = new Date();
  const demoWindowStart = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS);

  console.log('Preparing deterministic recommendation demo data...');

  await ensureAccounts();
  await clearDemoData();
  await enrichProductMetadata();

  const customerSpecs = createCustomers(rng);
  const customers = await createCustomerUsers(customerSpecs);
  const { byCategory, families } = await loadProductContext();

  const familyList = Object.entries(families)
    .filter(([, products]) => products.length >= 2)
    .map(([key, products]) => ({ key, products }));

  const topSharedFamilies = [
    'smartphones',
    'audio',
    'routers',
    'chargers',
    'tees',
    'hoodies',
    'jeans',
    'shoes',
    'sunglasses',
    'bags',
  ];
  const coreProducts = uniqueById(topSharedFamilies.flatMap((key) => families[key] || []));

  let totalViews = 0;
  let totalClicks = 0;
  let totalCarts = 0;
  let totalPurchases = 0;

  for (const [index, customer] of customers.entries()) {
    const localRng = createRng(RANDOM_SEED + index * 97 + 11);
    const activityProfile =
      customer.activityLevel === 'light'
        ? { views: randomInt(localRng, 15, 22), extraLogs: 1 }
        : customer.activityLevel === 'medium'
          ? { views: randomInt(localRng, 23, 30), extraLogs: 2 }
          : { views: randomInt(localRng, 31, 40), extraLogs: 3 };
    const orderTarget =
      customer.conversionTendency === 'browser'
        ? 2
        : customer.conversionTendency === 'balanced'
          ? 3
          : 4;

    const preferredFamilies = shuffle(localRng, customer.familyKeys)
      .map((familyKey) => ({ key: familyKey, products: families[familyKey] || [] }))
      .filter((family) => family.products.length >= 2);

    const fallbackFamilies = shuffle(localRng, familyList).filter(
      (family) => !preferredFamilies.some((preferred) => preferred.key === family.key)
    );

    const anchorFamily = preferredFamilies[0] || fallbackFamilies[0];
    const anchorProducts = chooseFamilyProducts({
      familyProducts: anchorFamily.products,
      rng: localRng,
      preferredCount: 2,
      budgetBand: customer.budgetBand,
    });
    const firstPurchaseProduct = anchorProducts[0] || anchorFamily.products[0];
    const heldOutProduct = anchorProducts[1] || anchorFamily.products[1];

    const additionalPurchaseFamilies = [...preferredFamilies.slice(1), ...fallbackFamilies]
      .filter((family) => family.products.length > 0)
      .slice(0, Math.max(2, orderTarget));

    const browsingProducts = pickProductsForCategories(
      byCategory,
      [...customer.primaryCategories, ...customer.secondaryCategories],
      localRng,
      activityProfile.views,
      customer.budgetBand
    );

    const views = [];
    for (let viewIndex = 0; viewIndex < activityProfile.views; viewIndex += 1) {
      const viewedProduct = browsingProducts[viewIndex % browsingProducts.length];
      if (!viewedProduct) break;
      views.push({
        userId: customer.id,
        productId: viewedProduct.id,
        action: 'view',
        quantity: 1,
        source: viewIndex % 3 === 0 ? 'storefront' : 'product_detail',
        metadata: {
          cohort: customer.cohort.name,
          budgetBand: customer.budgetBand,
        },
        createdAt: new Date(
          demoWindowStart.getTime() +
            (customer.seedOffsetDays + viewIndex) * DAY_MS +
            randomInt(localRng, 1, 6) * HOUR_MS
        ),
      });
    }

    if (views.length > 0) {
      await prisma.recommendationInteraction.createMany({ data: views });
      totalViews += views.length;
    }

    const journeys = [];
    const firstJourneyTime = new Date(demoWindowStart.getTime() + customer.seedOffsetDays * DAY_MS);
    journeys.push({
      product: firstPurchaseProduct,
      surface: 'storefront_trending',
      createdAt: firstJourneyTime,
      clickAt: new Date(firstJourneyTime.getTime() + 45 * 60 * 1000),
      cartAt: new Date(firstJourneyTime.getTime() + 2 * HOUR_MS),
      purchaseAt: new Date(firstJourneyTime.getTime() + 28 * HOUR_MS),
    });

    const secondJourneyTime = new Date(firstJourneyTime.getTime() + 10 * DAY_MS);
    journeys.push({
      product: heldOutProduct,
      surface: 'product_detail_similar',
      createdAt: secondJourneyTime,
      clickAt: new Date(secondJourneyTime.getTime() + 35 * 60 * 1000),
      cartAt: new Date(secondJourneyTime.getTime() + 2 * HOUR_MS),
      purchaseAt: new Date(secondJourneyTime.getTime() + 30 * HOUR_MS),
    });

    additionalPurchaseFamilies
      .slice(0, Math.max(1, orderTarget - 1))
      .forEach((family, familyIndex) => {
        const chosen = chooseFamilyProducts({
          familyProducts: family.products,
          rng: localRng,
          preferredCount: 1,
          budgetBand: customer.budgetBand,
        })[0];
        if (!chosen) return;

        const offsetDays = 4 + familyIndex * 7 + randomInt(localRng, 0, 3);
        const createdAt = new Date(firstJourneyTime.getTime() + offsetDays * DAY_MS);
        journeys.push({
          product: chosen,
          surface: familyIndex % 2 === 0 ? 'storefront_personalized' : 'storefront_trending',
          createdAt,
          clickAt: new Date(createdAt.getTime() + 25 * 60 * 1000),
          cartAt: new Date(createdAt.getTime() + 90 * 60 * 1000),
          purchaseAt: new Date(createdAt.getTime() + 26 * HOUR_MS),
        });
      });

    const browsingOnlyProducts = shuffle(
      localRng,
      uniqueById([...coreProducts, ...browsingProducts])
    )
      .filter((product) => !journeys.some((journey) => journey.product.id === product.id))
      .slice(0, activityProfile.extraLogs + 1);

    for (const [browseIndex, product] of browsingOnlyProducts.entries()) {
      const createdAt = new Date(firstJourneyTime.getTime() + (browseIndex + 2) * 3 * DAY_MS);
      journeys.push({
        product,
        surface: browseIndex % 2 === 0 ? 'storefront_personalized' : 'storefront_trending',
        createdAt,
        clickAt: new Date(createdAt.getTime() + 20 * 60 * 1000),
        cartAt: null,
        purchaseAt: null,
      });
    }

    const orderBuckets = new Map();

    for (const [journeyIndex, journey] of journeys.entries()) {
      const shownProducts = buildShownProducts({
        targetProduct: journey.product,
        cohort: customer.cohort,
        familyMap: families,
        productsByCategory: byCategory,
        rng: localRng,
        budgetBand: customer.budgetBand,
        desiredCount: journey.surface === 'storefront_trending' ? 12 : 8,
      });

      const log = await createRecommendationLogWithEvents({
        customer,
        targetProduct: journey.product,
        shownProducts,
        surface: journey.surface,
        createdAt: journey.createdAt,
        clickAt: journey.clickAt,
        includeClick: true,
      });
      totalClicks += 1;

      await prisma.recommendationInteraction.create({
        data: {
          userId: customer.id,
          productId: journey.product.id,
          action: 'view',
          quantity: 1,
          source: journey.surface,
          recommendationId: log.id,
          metadata: {
            seededJourney: true,
            cohort: customer.cohort.name,
            journeyIndex,
          },
          createdAt: new Date(journey.clickAt.getTime() + 5 * 60 * 1000),
        },
      });
      totalViews += 1;

      if (journey.cartAt) {
        await prisma.recommendationInteraction.create({
          data: {
            userId: customer.id,
            productId: journey.product.id,
            action: 'cart',
            quantity: 1,
            source: journey.surface,
            recommendationId: log.id,
            metadata: {
              recommendationSource: journey.surface,
              seededJourney: true,
            },
            createdAt: journey.cartAt,
          },
        });

        await prisma.recommendationEvent.create({
          data: {
            recommendationLogId: log.id,
            productId: journey.product.id,
            userId: customer.id,
            eventType: 'cart',
            createdAt: new Date(journey.cartAt.getTime() + 5 * 60 * 1000),
          },
        });
        totalCarts += 1;
      }

      if (!journey.purchaseAt) continue;

      const orderKey = journey.purchaseAt.toISOString();
      const bucketItemsByProductId = new Map(
        (orderBuckets.get(orderKey) || []).map((item) => [item.product.id, item])
      );

      bucketItemsByProductId.set(journey.product.id, {
        product: journey.product,
        quantity: 1,
        recommendationId: log.id,
        purchaseAt: journey.purchaseAt,
      });

      if (journeyIndex % 3 === 0) {
        const companionProduct = shownProducts.find((product) => product.id !== journey.product.id);
        if (companionProduct && companionProduct.id !== journey.product.id) {
          bucketItemsByProductId.set(companionProduct.id, {
            product: companionProduct,
            quantity: 1,
            recommendationId: log.id,
            purchaseAt: journey.purchaseAt,
          });
        }
      }

      orderBuckets.set(orderKey, [...bucketItemsByProductId.values()]);
    }

    for (const items of orderBuckets.values()) {
      const createdAt = items[0].purchaseAt;
      await createOrderWithAttribution({
        customer,
        items,
        createdAt,
      });

      await prisma.recommendationInteraction.createMany({
        data: items.map((item) => ({
          userId: customer.id,
          productId: item.product.id,
          action: 'purchase',
          quantity: item.quantity,
          source: 'checkout',
          recommendationId: item.recommendationId,
          metadata: {
            orderSeeded: true,
            cohort: customer.cohort.name,
          },
          createdAt,
        })),
      });

      await prisma.recommendationEvent.createMany({
        data: items.map((item) => ({
          recommendationLogId: item.recommendationId,
          productId: item.product.id,
          userId: customer.id,
          eventType: 'purchase',
          createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
        })),
      });

      totalPurchases += items.length;

      const reviewCount = Math.min(items.length, randomInt(localRng, 0, 2));
      const reviewItems = shuffle(localRng, items).slice(0, reviewCount);
      for (const item of reviewItems) {
        await prisma.review.create({
          data: {
            productId: item.product.id,
            userId: customer.id,
            rating: pick(localRng, [4, 4, 5, 5, 5, 3]),
            comment: pick(localRng, REVIEW_COMMENTS),
            createdAt: new Date(createdAt.getTime() + randomInt(localRng, 2, 5) * DAY_MS),
          },
        });
      }
    }
  }

  console.log('Recommendation demo seed completed.', {
    customers: CUSTOMER_COUNT,
    views: totalViews,
    clicks: totalClicks,
    carts: totalCarts,
    purchases: totalPurchases,
  });
}

main()
  .catch((error) => {
    console.error('Recommendation demo seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
