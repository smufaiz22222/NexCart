import 'dotenv/config';
import { prisma } from '../src/config/db.js';

const TOTAL_PRODUCTS = 6000;
const BATCH_SIZE = 500;

const CATEGORY_SUBCATEGORIES = {
  Electronics: [
    'Mobile Phones',
    'Laptops & Computers',
    'Tablets',
    'Headphones & Earbuds',
    'Cameras & Photography',
    'Smart Watches',
    'Televisions',
    'Speakers & Audio',
    'Gaming Accessories',
    'Cables & Adapters',
  ],
  Apparel: [
    "Men's Clothing",
    "Women's Clothing",
    "Kids' Clothing",
    'Footwear',
    'Watches',
    'Sunglasses',
    'Handbags & Wallets',
    'Jewellery',
    'Ethnic Wear',
    'Winter Wear',
  ],
  'Home & Kitchen': [
    'Kitchen Appliances',
    'Cookware & Dining',
    'Home Decor',
    'Bedding & Mattresses',
    'Lighting',
    'Storage & Organization',
    'Cleaning Supplies',
    'Furniture',
    'Garden & Outdoor',
    'Smart Home',
  ],
  Beauty: [
    'Skincare',
    'Haircare',
    'Makeup',
    'Fragrances',
    'Bath & Body',
    "Men's Grooming",
    'Oral Care',
    'Health & Wellness',
    'Beauty Appliances',
    'Luxury Beauty',
  ],
  Sports: [
    'Cricket',
    'Fitness & Gym',
    'Football',
    'Badminton',
    'Cycling',
    'Running Shoes',
    'Camping & Hiking',
    'Yoga & Meditation',
    'Swimming',
    'Sports Nutrition',
  ],
  Books: [
    'Fiction',
    'Non-Fiction',
    'Academic & Textbooks',
    "Children's Books",
    'Comics & Manga',
    'Self Help',
    'Notebooks & Diaries',
    'Pens & Writing',
    'Art Supplies',
    'Office Stationery',
  ],
  'Toys & Games': [
    'Action Figures',
    'Board Games',
    'Building Blocks',
    'Dolls & Playsets',
    'Educational Toys',
    'Remote Control Toys',
    'Puzzles',
    'Outdoor Play',
    'Card Games',
    'Plush Toys',
  ],
  Grocery: [
    'Snacks & Beverages',
    'Staples & Cooking',
    'Dairy & Eggs',
    'Fruits & Vegetables',
    'Packaged Foods',
    'Organic & Natural',
    'Tea & Coffee',
    'Spices & Masalas',
    'Chocolates & Sweets',
    'International Foods',
  ],
  Automotive: [
    'Car Accessories',
    'Bike Accessories',
    'Car Electronics',
    'Tyres & Rims',
    'Oils & Lubricants',
    'Helmets & Gear',
    'Car Care',
    'Tools & Equipment',
    'Interior Accessories',
    'GPS & Navigation',
  ],
  'Pet Supplies': [
    'Dog Food',
    'Cat Food',
    'Pet Toys',
    'Grooming',
    'Beds & Furniture',
    'Collars & Leashes',
    'Aquarium Supplies',
    'Bird Supplies',
    'Health & Hygiene',
    'Training & Travel',
  ],
  'Office Supplies': [
    'Notebooks & Paper',
    'Pens & Markers',
    'Desk Organizers',
    'Printers & Ink',
    'Office Furniture',
    'Presentation Supplies',
    'Sticky Notes & Labels',
    'Filing & Storage',
    'Scissors & Cutters',
    'Desk Lamps',
  ],
};

/** Keyword tags for category-compatible unique images via loremflickr */
const SUBCATEGORY_IMAGE_KEYWORDS = {
  'Mobile Phones': 'smartphone,mobile-phone',
  'Laptops & Computers': 'laptop,computer',
  Tablets: 'tablet,ipad',
  'Headphones & Earbuds': 'headphones,earbuds',
  'Cameras & Photography': 'camera,photography',
  'Smart Watches': 'smartwatch,watch',
  Televisions: 'television,tv',
  'Speakers & Audio': 'speaker,audio',
  'Gaming Accessories': 'gaming,gamepad',
  'Cables & Adapters': 'cables,usb',
  "Men's Clothing": 'mens-fashion,shirt',
  "Women's Clothing": 'womens-fashion,dress',
  "Kids' Clothing": 'kids-clothes,children',
  Footwear: 'shoes,sneakers',
  Watches: 'wristwatch,watch',
  Sunglasses: 'sunglasses,eyewear',
  'Handbags & Wallets': 'handbag,wallet',
  Jewellery: 'jewelry,necklace',
  'Ethnic Wear': 'saree,ethnic-wear',
  'Winter Wear': 'jacket,winter-coat',
  'Kitchen Appliances': 'kitchen-appliance,blender',
  'Cookware & Dining': 'cookware,pots',
  'Home Decor': 'home-decor,interior',
  'Bedding & Mattresses': 'bedding,mattress',
  Lighting: 'lamp,lighting',
  'Storage & Organization': 'storage,organizer',
  'Cleaning Supplies': 'cleaning,supplies',
  Furniture: 'furniture,sofa',
  'Garden & Outdoor': 'garden,plants',
  'Smart Home': 'smart-home,thermostat',
  Skincare: 'skincare,cosmetics',
  Haircare: 'haircare,shampoo',
  Makeup: 'makeup,cosmetics',
  Fragrances: 'perfume,fragrance',
  'Bath & Body': 'bath,soap',
  "Men's Grooming": 'grooming,razor',
  'Oral Care': 'toothbrush,dental',
  'Health & Wellness': 'wellness,vitamins',
  'Beauty Appliances': 'hairdryer,beauty',
  'Luxury Beauty': 'luxury-cosmetics,perfume',
  Cricket: 'cricket,bat',
  'Fitness & Gym': 'gym,dumbbell',
  Football: 'football,soccer',
  Badminton: 'badminton,racket',
  Cycling: 'bicycle,cycling',
  'Running Shoes': 'running-shoes,sneakers',
  'Camping & Hiking': 'camping,hiking',
  'Yoga & Meditation': 'yoga,meditation',
  Swimming: 'swimming,pool',
  'Sports Nutrition': 'protein,supplement',
  Fiction: 'book,novel',
  'Non-Fiction': 'books,reading',
  'Academic & Textbooks': 'textbook,study',
  "Children's Books": 'childrens-book,storybook',
  'Comics & Manga': 'comic,manga',
  'Self Help': 'self-help,book',
  'Notebooks & Diaries': 'notebook,diary',
  'Pens & Writing': 'pen,writing',
  'Art Supplies': 'art-supplies,paint',
  'Office Stationery': 'stationery,office',
  'Action Figures': 'action-figure,toy',
  'Board Games': 'board-game,game',
  'Building Blocks': 'lego,blocks',
  'Dolls & Playsets': 'doll,toy',
  'Educational Toys': 'educational-toy,kids',
  'Remote Control Toys': 'rc-car,toy',
  Puzzles: 'puzzle,jigsaw',
  'Outdoor Play': 'playground,kids-play',
  'Card Games': 'playing-cards,cards',
  'Plush Toys': 'plush-toy,teddy',
  'Snacks & Beverages': 'snacks,beverage',
  'Staples & Cooking': 'rice,cooking',
  'Dairy & Eggs': 'dairy,eggs',
  'Fruits & Vegetables': 'fruits,vegetables',
  'Packaged Foods': 'grocery,packaged-food',
  'Organic & Natural': 'organic-food,produce',
  'Tea & Coffee': 'coffee,tea',
  'Spices & Masalas': 'spices,masala',
  'Chocolates & Sweets': 'chocolate,sweets',
  'International Foods': 'asian-food,cuisine',
  'Car Accessories': 'car-accessories,automobile',
  'Bike Accessories': 'motorcycle,bike',
  'Car Electronics': 'car-stereo,dashboard',
  'Tyres & Rims': 'tire,wheel',
  'Oils & Lubricants': 'motor-oil,lubricant',
  'Helmets & Gear': 'helmet,motorcycle-helmet',
  'Car Care': 'car-wash,auto-care',
  'Tools & Equipment': 'tools,wrench',
  'Interior Accessories': 'car-interior,dashboard',
  'GPS & Navigation': 'gps,navigation',
  'Dog Food': 'dog-food,dog',
  'Cat Food': 'cat-food,cat',
  'Pet Toys': 'pet-toy,dog-toy',
  Grooming: 'pet-grooming,dog',
  'Beds & Furniture': 'pet-bed,dog-bed',
  'Collars & Leashes': 'dog-collar,leash',
  'Aquarium Supplies': 'aquarium,fish',
  'Bird Supplies': 'bird,parrot',
  'Health & Hygiene': 'pet-care,vet',
  'Training & Travel': 'pet-carrier,dog',
  'Notebooks & Paper': 'notebook,paper',
  'Pens & Markers': 'pens,markers',
  'Desk Organizers': 'desk-organizer,office',
  'Printers & Ink': 'printer,office',
  'Office Furniture': 'office-desk,chair',
  'Presentation Supplies': 'whiteboard,presentation',
  'Sticky Notes & Labels': 'sticky-notes,office',
  'Filing & Storage': 'file-cabinet,folders',
  'Scissors & Cutters': 'scissors,office',
  'Desk Lamps': 'desk-lamp,lamp',
};

const CATEGORY_FALLBACK_KEYWORDS = {
  Electronics: 'electronics,gadget',
  Apparel: 'fashion,clothing',
  'Home & Kitchen': 'kitchen,home',
  Beauty: 'beauty,cosmetics',
  Sports: 'sports,fitness',
  Books: 'books,reading',
  'Toys & Games': 'toys,games',
  Grocery: 'grocery,food',
  Automotive: 'car,automotive',
  'Pet Supplies': 'pets,animals',
  'Office Supplies': 'office,stationery',
};

const BRAND_PREFIXES = [
  'Pro',
  'Ultra',
  'Apex',
  'Prime',
  'Elite',
  'Aura',
  'Max',
  'Eco',
  'Nexus',
  'Zenith',
  'Optima',
  'Vortex',
  'Titan',
  'Starlight',
  'Velvet',
  'Urban',
  'Classic',
  'Grand',
  'Omni',
  'Nova',
];

const QUALITY_MODIFIERS = [
  'Heavy Duty',
  'Premium Quality',
  'Professional Series',
  'Ergonomic',
  'Compact',
  'Waterproof',
  'Wireless',
  'Organic',
  'High Performance',
  'Deluxe Edition',
  'Multi-Functional',
  'Portable',
  'Sleek & Durable',
  'Handcrafted',
  'Advanced Formula',
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBasePrice(category) {
  switch (category) {
    case 'Electronics':
      return getRandomNumber(150, 2500);
    case 'Apparel':
      return getRandomNumber(20, 350);
    case 'Home & Kitchen':
      return getRandomNumber(30, 800);
    case 'Beauty':
      return getRandomNumber(10, 180);
    case 'Sports':
      return getRandomNumber(25, 450);
    case 'Books':
      return getRandomNumber(8, 90);
    case 'Toys & Games':
      return getRandomNumber(12, 200);
    case 'Grocery':
      return getRandomNumber(5, 75);
    case 'Automotive':
      return getRandomNumber(35, 950);
    case 'Pet Supplies':
      return getRandomNumber(10, 140);
    case 'Office Supplies':
      return getRandomNumber(8, 250);
    default:
      return getRandomNumber(20, 200);
  }
}

function getSizes(category, subcategory) {
  if (category === 'Apparel') {
    if (subcategory === 'Footwear') return ['7', '8', '9', '10', '11', '12'];
    return ['S', 'M', 'L', 'XL', 'XXL'];
  }
  if (category === 'Sports' && subcategory === 'Running Shoes') {
    return ['7', '8', '9', '10', '11'];
  }
  return [];
}

/** Unique + category-compatible image URL per product index */
function getProductImageUrl(category, subcategory, productIndex) {
  const keywords =
    SUBCATEGORY_IMAGE_KEYWORDS[subcategory] ||
    CATEGORY_FALLBACK_KEYWORDS[category] ||
    'product,retail';
  // lock=N returns a deterministic unique photo for that lock id
  return `https://loremflickr.com/600/600/${keywords}?lock=${productIndex}`;
}

async function clearProductRelatedData() {
  console.log('🧹 Clearing product-related data (wholesalers preserved)...');

  // Order: deepest dependents first, then products (Restrict FKs block product delete)
  await prisma.disputeEvidence.deleteMany({});
  await prisma.disputeEvent.deleteMany({});
  await prisma.disputeInternalNote.deleteMany({});
  await prisma.disputeResolution.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.orderIssue.deleteMany({});
  await prisma.orderAdjustment.deleteMany({});
  await prisma.offlineSaleItem.deleteMany({});
  await prisma.offlinePurchaseItem.deleteMany({});
  await prisma.recommendationEvent.deleteMany({});
  await prisma.recommendationInteraction.deleteMany({});
  await prisma.productSimilarity.deleteMany({});
  await prisma.productFeature.deleteMany({});
  await prisma.productPriceTier.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.rfq.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.b2BCartItem.deleteMany({});
  await prisma.inventoryLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.product.deleteMany({});

  console.log('✅ All products and dependent rows removed.');
}

async function main() {
  console.log(`🚀 Seeding ${TOTAL_PRODUCTS} products onto existing wholesalers...`);
  const startTime = Date.now();

  const wholesalers = await prisma.wholesaler.findMany({
    select: { id: true, businessName: true },
  });

  if (wholesalers.length === 0) {
    throw new Error('No wholesalers found in the database. Create wholesalers first.');
  }

  console.log(`🏢 Found ${wholesalers.length} wholesaler(s):`);
  wholesalers.forEach((w, i) => console.log(`   ${i + 1}. ${w.businessName}`));

  await clearProductRelatedData();

  const categories = Object.keys(CATEGORY_SUBCATEGORIES);
  const productsPerCategory = Math.ceil(TOTAL_PRODUCTS / categories.length);
  const allProducts = [];
  let productCounter = 1;

  for (const category of categories) {
    const subcategories = CATEGORY_SUBCATEGORIES[category];
    const productsPerSubcategory = Math.ceil(productsPerCategory / subcategories.length);

    for (const subcategory of subcategories) {
      for (let i = 0; i < productsPerSubcategory; i++) {
        if (allProducts.length >= TOTAL_PRODUCTS) break;

        const wholesaler = getRandomItem(wholesalers);
        const prefix = getRandomItem(BRAND_PREFIXES);
        const modifier = getRandomItem(QUALITY_MODIFIERS);
        const price = getBasePrice(category);
        const costPrice = Math.round(price * (getRandomNumber(60, 80) / 100));
        const actualPrice = Math.round(price * (getRandomNumber(115, 140) / 100));
        const name = `${prefix} ${modifier} ${subcategory} #${productCounter}`;
        const sku = `SKU-${category.slice(0, 3).toUpperCase()}-${String(productCounter).padStart(5, '0')}`;

        allProducts.push({
          wholesalerId: wholesaler.id,
          name,
          description: `Wholesale-ready ${subcategory.toLowerCase()} in the ${category} category. Bulk-friendly pricing with verified quality for B2B buyers.`,
          price: parseFloat(price.toFixed(2)),
          costPrice: parseFloat(costPrice.toFixed(2)),
          actualPrice: parseFloat(actualPrice.toFixed(2)),
          sku,
          imageUrl: getProductImageUrl(category, subcategory, productCounter),
          category,
          subcategory,
          sizes: getSizes(category, subcategory),
          currentStock: getRandomNumber(30, 600),
          minStock: getRandomNumber(10, 50),
          isB2BEnabled: true,
          minOrderQty: getRandomNumber(1, 10),
          deliveryFee: getRandomNumber(0, 35),
        });

        productCounter++;
      }
      if (allProducts.length >= TOTAL_PRODUCTS) break;
    }
    if (allProducts.length >= TOTAL_PRODUCTS) break;
  }

  console.log(`⚡ Inserting ${allProducts.length} products in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const chunk = allProducts.slice(i, i + BATCH_SIZE);
    await prisma.product.createMany({ data: chunk });
    console.log(
      `   - Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allProducts.length / BATCH_SIZE)} (${chunk.length} products)`
    );
  }

  const counts = await prisma.product.groupBy({
    by: ['category'],
    _count: { _all: true },
  });
  const byWholesaler = await prisma.product.groupBy({
    by: ['wholesalerId'],
    _count: { _all: true },
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Done in ${duration}s`);
  console.log(`   Total products: ${allProducts.length}`);
  console.log('   Per category:');
  counts
    .sort((a, b) => a.category.localeCompare(b.category))
    .forEach((c) => console.log(`     - ${c.category}: ${c._count._all}`));
  console.log(`   Spread across ${byWholesaler.length} wholesaler(s)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
