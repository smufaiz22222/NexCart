import { prisma } from '../config/db.js';

/**
 * GET /api/deals/daily
 *
 * Returns up to 6 "Deal of the Day" products using strict seller rotation.
 * - Picks sellers who were featured longest ago (or never)
 * - From each seller, picks the product with the highest discount percentage
 * - Updates lastFeaturedDate so every seller gets a turn before any repeats
 */
export const getDailyDeals = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find wholesalers who have at least one in-stock discounted product (actualPrice > price)
    // Order by lastFeaturedDate ASC (nulls first = never featured get priority)
    const eligibleWholesalers = await prisma.wholesaler.findMany({
      where: {
        onboardingStatus: 'ACTIVE',
        products: {
          some: {
            currentStock: { gt: 0 },
            actualPrice: { gt: 0 },
          },
        },
      },
      select: {
        id: true,
        lastFeaturedDate: true,
      },
      orderBy: {
        lastFeaturedDate: { sort: 'asc', nulls: 'first' },
      },
      take: 6,
    });

    if (eligibleWholesalers.length === 0) {
      return res.status(200).json({ deals: [], rotatedAt: today.toISOString() });
    }

    const wholesalerIds = eligibleWholesalers.map((w) => w.id);

    // For each selected wholesaler, find their products with discounts and pick the best one
    const products = await prisma.product.findMany({
      where: {
        wholesalerId: { in: wholesalerIds },
        currentStock: { gt: 0 },
        actualPrice: { gt: 0 },
      },
      include: {
        wholesaler: {
          select: { id: true, businessName: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    // Group by seller and pick highest discount from each
    const sellerBestDeal = {};
    for (const product of products) {
      // Only consider products where actualPrice > price (actual discount exists)
      if (product.actualPrice <= product.price) continue;

      const discountPercent = Math.round(
        ((product.actualPrice - product.price) / product.actualPrice) * 100
      );
      const sellerId = product.wholesalerId;

      if (!sellerBestDeal[sellerId] || discountPercent > sellerBestDeal[sellerId].discountPercent) {
        sellerBestDeal[sellerId] = { ...product, discountPercent };
      }
    }

    // Build final deals array in the priority order (wholesalers sorted by lastFeaturedDate)
    const deals = [];
    for (const wId of wholesalerIds) {
      if (sellerBestDeal[wId]) {
        const product = sellerBestDeal[wId];
        const ratings = product.reviews || [];
        const reviewCount = ratings.length;
        const ratingAverage = reviewCount
          ? Number((ratings.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
          : 0;

        deals.push({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.actualPrice,
          discountPercent: product.discountPercent,
          imageUrl: product.imageUrl,
          category: product.category,
          currentStock: product.currentStock,
          wholesaler: product.wholesaler,
          ratingAverage,
          reviewCount,
        });
      }
    }

    // Update lastFeaturedDate for the featured sellers (only if they actually have a deal shown)
    const featuredSellerIds = deals.map((d) => d.wholesaler.id);
    if (featuredSellerIds.length > 0) {
      await prisma.wholesaler.updateMany({
        where: { id: { in: featuredSellerIds } },
        data: { lastFeaturedDate: today },
      });
    }

    res.status(200).json({ deals, rotatedAt: today.toISOString() });
  } catch (error) {
    console.error('Daily deals fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch daily deals' });
  }
};
