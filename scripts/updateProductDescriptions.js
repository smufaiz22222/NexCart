import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const OPENERS = [
  (sub, cat) => `This ${sub.toLowerCase()} is a standout pick in our ${cat} range`,
  (sub, cat) => `Built for buyers who need dependable ${sub.toLowerCase()}, this ${cat} item`,
  (sub, cat) => `A trusted choice among our ${cat} catalog, this ${sub.toLowerCase()}`,
  (sub, cat) => `Sourced for retailers stocking up on ${sub.toLowerCase()}, this item`,
  (sub, cat) =>
    `Designed with everyday demand in mind, this ${sub.toLowerCase()} from our ${cat} lineup`,
  (sub, cat) =>
    `A reliable addition to any ${cat.toLowerCase()} storefront, this ${sub.toLowerCase()}`,
];

const FEATURES = {
  Electronics: [
    'stable performance under continuous use',
    'energy-efficient components',
    'fast connectivity and low latency',
    'a sleek, modern build',
    'reinforced ports and connectors',
    'compatibility with major accessories and standards',
  ],
  Apparel: [
    'breathable, comfortable fabric',
    'reinforced stitching for long-term wear',
    'a fit that works across body types',
    'colorfast dyes that resist fading',
    'a tailored, contemporary cut',
    'machine-washable, low-maintenance care',
  ],
  'Home & Kitchen': [
    'sturdy, food-safe materials',
    'easy-clean surfaces',
    'space-saving design for modern homes',
    'heat and stain resistance',
    'a finish that complements most interiors',
    'ergonomic handles and controls',
  ],
  Beauty: [
    'dermatologically tested ingredients',
    'a lightweight, non-greasy formula',
    'long-lasting results with regular use',
    'suitability for daily routines',
    'a pleasant, non-overpowering fragrance',
    'formulation free from harsh additives',
  ],
  Sports: [
    'lightweight materials built for movement',
    'reinforced grip and stability',
    'sweat and weather resistance',
    'a design tested for competitive and casual play',
    'shock-absorbing construction',
    'durability across repeated training sessions',
  ],
  Books: [
    'quality print and binding',
    'content curated for a wide readership',
    'a format convenient for shelving and display',
    'pages suited for extended reading sessions',
    'packaging that protects against shelf wear',
    'a cover finish that resists fading',
  ],
  'Toys & Games': [
    'child-safe, non-toxic materials',
    'parts built to withstand rough play',
    'engaging design that encourages creativity',
    'easy-to-follow instructions for all ages',
    'vivid colors and durable finishes',
    'compact packaging for easy retail display',
  ],
  Grocery: [
    'freshness-sealed packaging',
    'consistent quality across batches',
    'ingredients sourced from trusted suppliers',
    'a shelf life suited for bulk stocking',
    'clear labeling for easy inventory tracking',
    'flavor and quality consistent with market standards',
  ],
  Automotive: [
    'construction built for daily wear and tear',
    'compatibility with standard vehicle fittings',
    'weatherproof materials for outdoor use',
    'installation that fits most common models',
    'durability tested for rough road conditions',
    'a finish resistant to corrosion and rust',
  ],
  'Pet Supplies': [
    'materials safe for regular pet contact',
    'a design suited for daily use and cleaning',
    'durability against chewing and rough handling',
    'comfort-focused construction for pets of all sizes',
    'non-toxic, vet-friendly materials',
    'easy maintenance for busy pet owners',
  ],
  'Office Supplies': [
    'construction suited for daily office use',
    'a design that keeps workspaces organized',
    'durability for repeated handling',
    'a finish that stays professional over time',
    'compatibility with standard office setups',
    'materials chosen for long-term reliability',
  ],
};

const CLOSERS = [
  (minOrderQty) =>
    `Available for wholesale ordering with a minimum order quantity of ${minOrderQty} unit${minOrderQty > 1 ? 's' : ''}, and ready for quick dispatch to retail partners.`,
  (minOrderQty) =>
    `Stocked for bulk purchase (min. ${minOrderQty} unit${minOrderQty > 1 ? 's' : ''} per order), making it a strong fit for retailers restocking fast-moving inventory.`,
  (minOrderQty) =>
    `Offered at wholesale pricing tiers with a minimum order of ${minOrderQty} unit${minOrderQty > 1 ? 's' : ''}, ideal for B2B buyers scaling their catalog.`,
  (minOrderQty) =>
    `Ships in bulk-ready packaging, with orders starting from ${minOrderQty} unit${minOrderQty > 1 ? 's' : ''}, suited for both retail and distribution partners.`,
];

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function pickTwoDistinct(arr, seedA, seedB) {
  const a = arr[seedA % arr.length];
  let bIdx = seedB % arr.length;
  if (arr[bIdx] === a) bIdx = (bIdx + 1) % arr.length;
  return [a, arr[bIdx]];
}

function buildDescription(product, index) {
  const { category, subcategory, sizes, minOrderQty } = product;
  const sub = subcategory || category;
  const opener = pick(OPENERS, index)(sub, category);
  const featureList = FEATURES[category] || FEATURES.Electronics;
  const [featA, featB] = pickTwoDistinct(featureList, index * 7 + 1, index * 13 + 3);
  const closer = pick(CLOSERS, index * 5 + 2)(minOrderQty || 1);

  const sizeLine =
    Array.isArray(sizes) && sizes.length > 0
      ? ` Available in sizes ${sizes.join(', ')} to match varied customer needs.`
      : '';

  return `${opener}, offering ${featA} and ${featB}.${sizeLine} ${closer}`;
}

async function main() {
  console.log('📝 Fetching all products...');
  const { rows: products } = await pool.query(
    `SELECT id, category, subcategory, sizes, "minOrderQty" FROM "Product" ORDER BY "createdAt" ASC`
  );
  console.log(`   Found ${products.length} products.`);

  const BATCH_SIZE = 500;
  let updated = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const ids = [];
    const descriptions = [];

    chunk.forEach((product, idx) => {
      ids.push(product.id);
      descriptions.push(buildDescription(product, i + idx));
    });

    await pool.query(
      `UPDATE "Product" AS p
       SET description = v.description
       FROM (SELECT unnest($1::text[]) AS id, unnest($2::text[]) AS description) AS v
       WHERE p.id = v.id`,
      [ids, descriptions]
    );

    updated += chunk.length;
    console.log(`   - Updated ${updated}/${products.length}`);
  }

  console.log(`✅ Descriptions updated for ${updated} products.`);
  await pool.end();
}

main().catch((error) => {
  console.error('❌ Failed to update descriptions:', error);
  process.exit(1);
});
