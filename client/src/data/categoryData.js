/**
 * Amazon-style category and subcategory hierarchy for NexCart storefront.
 * Each category has:
 * - name: Display name shown in UI
 * - dbCategory: The exact value stored in the Product.category field in the database
 * - slug: URL-friendly identifier
 * - icon: lucide-react icon key
 * - subcategories: Array of subcategory display names
 */

const categoryData = [
  {
    name: 'Electronics',
    dbCategory: 'Electronics',
    slug: 'electronics',
    icon: 'Smartphone',
    subcategories: [
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
  },
  {
    name: 'Fashion',
    dbCategory: 'Apparel',
    slug: 'fashion',
    icon: 'Shirt',
    subcategories: [
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
  },
  {
    name: 'Home & Kitchen',
    dbCategory: 'Home & Kitchen',
    slug: 'home-kitchen',
    icon: 'Home',
    subcategories: [
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
  },
  {
    name: 'Beauty & Personal Care',
    dbCategory: 'Beauty',
    slug: 'beauty',
    icon: 'Sparkles',
    subcategories: [
      'Skincare',
      'Haircare',
      'Makeup',
      'Fragrances',
      'Bath & Body',
      "Men's Grooming",
      'Oral Care',
      'Health & Wellness',
      'Appliances',
      'Luxury Beauty',
    ],
  },
  {
    name: 'Sports & Outdoors',
    dbCategory: 'Sports',
    slug: 'sports',
    icon: 'Dumbbell',
    subcategories: [
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
  },
  {
    name: 'Books & Stationery',
    dbCategory: 'Books',
    slug: 'books',
    icon: 'BookOpen',
    subcategories: [
      'Fiction',
      'Non-Fiction',
      'Academic & Textbooks',
      "Children's Books",
      'Comics & Manga',
      'Self Help',
      'Notebooks & Diaries',
      'Pens & Writing',
      'Art Supplies',
      'Office Supplies',
    ],
  },
  {
    name: 'Toys & Games',
    dbCategory: 'Toys & Games',
    slug: 'toys-games',
    icon: 'Baby',
    subcategories: [
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
  },
  {
    name: 'Grocery & Gourmet',
    dbCategory: 'Grocery',
    slug: 'grocery',
    icon: 'ShoppingBasket',
    subcategories: [
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
  },
  {
    name: 'Automotive',
    dbCategory: 'Automotive',
    slug: 'automotive',
    icon: 'Car',
    subcategories: [
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
  },
  {
    name: 'Pet Supplies',
    dbCategory: 'Pet Supplies',
    slug: 'pet-supplies',
    icon: 'PawPrint',
    subcategories: [
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
  },
  {
    name: 'Office Supplies',
    dbCategory: 'Office Supplies',
    slug: 'office',
    icon: 'Briefcase',
    subcategories: [
      'Notebooks & Paper',
      'Pens & Writing',
      'Desk Organizers',
      'Printers & Ink',
      'Office Furniture',
      'Presentation Supplies',
      'Sticky Notes & Labels',
      'Filing & Storage',
      'Scissors & Cutters',
      'Desk Lamps',
    ],
  },
];

export default categoryData;

/**
 * Flat list of all subcategory names for quick search/matching
 */
export const allSubcategories = categoryData.flatMap((cat) => cat.subcategories);

/**
 * Get the parent category for a given subcategory string
 */
export function getParentCategory(subcategoryName) {
  for (const cat of categoryData) {
    if (cat.subcategories.includes(subcategoryName)) {
      return cat;
    }
  }
  return null;
}

/**
 * Find a category by slug
 */
export function getCategoryBySlug(slug) {
  return categoryData.find((cat) => cat.slug === slug) || null;
}

/**
 * Get the DB category value from a display name
 */
export function getDbCategory(displayName) {
  const cat = categoryData.find((c) => c.name === displayName);
  return cat ? cat.dbCategory : displayName;
}
