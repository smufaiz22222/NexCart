const COMMENTS_BY_RATING = {
  5: [
    'Amazing quality! Highly recommend to everyone.',
    'Absolutely love it, exactly as described and shown.',
    'Exceptional value for money. Will definitely buy again!',
    'Super fast delivery and great build quality.',
    'Exceeded my expectations, works perfectly!',
    'Outstanding product. The materials feel premium and durable.',
    'Highly satisfied with this purchase. Worth every penny!',
    'Best in its category. Will be ordering more soon.',
  ],
  4: [
    'Really good product, works well for my daily needs.',
    'Satisfied with the purchase. Minor delay in shipping though.',
    'Good quality, but slightly on the expensive side.',
    'Decent item, fits well and looks quite good.',
    'Solid build. Very useful and functions as expected.',
    'Great design and style, though packaging could be improved.',
    'Overall a very nice product, would recommend to friends.',
    'Happy with the quality. Good customer service support.',
  ],
  3: [
    'Average product. It does the job but has some minor flaws.',
    'Okay quality, expected a bit more based on other reviews.',
    'It is fine, but nothing special or outstanding.',
    'Product is average, shipping was fast but item is just decent.',
    'Works okay, but the finish could have been cleaner.',
    'Mediocre value. It works but feels a bit lightweight.',
  ],
  2: [
    'Disappointed. Quality is below average and feels cheap.',
    'Not as pictured. Colors are slightly off and sizing is weird.',
    'Barely functions as expected. Might return this soon.',
    'Underwhelming performance. Not worth the retail price.',
  ],
  1: [
    'Terrible quality! Broke after just a day of use.',
    'Worst purchase ever, do not buy this product!',
    'Completely dissatisfied. Poor materials and design.',
    'Defective item received and customer service was unhelpful.',
  ],
};

function getRandomComment(rating) {
  const comments = COMMENTS_BY_RATING[rating] || COMMENTS_BY_RATING[5];
  return comments[Math.floor(Math.random() * comments.length)];
}

export default async function seedReviews(prisma, customers, products) {
  console.log('⭐ Seeding Ratings & Reviews...');

  if (!customers || customers.length === 0) {
    throw new Error('No customers provided for reviews seeding.');
  }

  if (!products || products.length === 0) {
    throw new Error('No products provided for reviews seeding.');
  }

  const reviewsToCreate = [];

  for (const product of products) {
    // Generate between 1 and 3 reviews per product
    const reviewCount = Math.floor(Math.random() * 3) + 1;

    // Pick unique customers for the same product's reviews
    const shuffledCustomers = [...customers].sort(() => 0.5 - Math.random());
    const selectedCustomers = shuffledCustomers.slice(0, reviewCount);

    for (const customer of selectedCustomers) {
      // Weight the ratings: 55% for 5-star, 30% for 4-star, 10% for 3-star, 3% for 2-star, 2% for 1-star
      const r = Math.random();
      let rating;

      if (r < 0.02) {
        rating = 1;
      } else if (r < 0.05) {
        rating = 2;
      } else if (r < 0.15) {
        rating = 3;
      } else if (r < 0.45) {
        rating = 4;
      } else {
        rating = 5;
      }

      const comment = getRandomComment(rating);

      reviewsToCreate.push({
        productId: product.id,
        userId: customer.id,
        rating,
        comment,
      });
    }
  }

  console.log(`  - Inserting ${reviewsToCreate.length} reviews in batch...`);
  await prisma.review.createMany({ data: reviewsToCreate });

  console.log(`✅ Successfully seeded ${reviewsToCreate.length} product ratings and reviews.`);
}
