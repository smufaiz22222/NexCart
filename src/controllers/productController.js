import { prisma } from '../config/db.js';
import { queueProductRecommendationUpdate } from '../services/contentRecommendationService.js';

const normalizeProductInput = (body) => ({
  name: body.name,
  sku: body.sku,
  description: body.description || null,
  imageUrl: body.imageUrl || null,
  category: body.category || undefined,
  price: parseFloat(body.price),
  costPrice: parseFloat(body.costPrice || 0),
  currentStock: parseInt(body.currentStock || 0, 10),
  minStock: parseInt(body.minStock || 10, 10),
});

const decorateProductForMarketplace = (product) => {
  const ratings = product.reviews || [];
  const reviewCount = ratings.length;
  const ratingAverage = reviewCount
    ? Number((ratings.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1))
    : 0;
  const originalPrice = Number((product.price * 1.18).toFixed(2));
  const discountPercent =
    originalPrice > product.price
      ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
      : 0;

  return {
    ...product,
    ratingAverage,
    reviewCount,
    originalPrice,
    discountPercent,
  };
};

export const createProduct = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const productData = normalizeProductInput(req.body);

    const newProduct = await prisma.product.create({
      data: {
        wholesalerId,
        ...productData,
      },
    });

    // Trigger asynchronous, non-blocking real-time recommendation updates
    queueProductRecommendationUpdate(newProduct.id);

    res.status(201).json({ message: 'Product created', product: newProduct });
  } catch (error) {
    console.error('PRODUCT CREATE ERROR:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};
export const getProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;

    const products = await prisma.product.findMany({
      where: { wholesalerId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ count: products.length, products });
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};
export const getMarketplaceProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      include: {
        wholesaler: {
          select: { businessName: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res
      .status(200)
      .json({ count: products.length, products: products.map(decorateProductForMarketplace) });
  } catch (error) {
    console.error('Marketplace fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace products' });
  }
};
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: req.user?.role === 'WHOLESALER' ? { id, wholesalerId: req.user.wholesalerId } : { id },
      include: {
        wholesaler: { select: { businessName: true } },
        reviews: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        priceTiers: {
          orderBy: { minQuantity: 'asc' },
        },
      },
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.status(200).json(decorateProductForMarketplace(product));
  } catch (error) {
    console.error('Get Product Error:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const wholesalerId = req.user.wholesalerId;
    const existingProduct = await prisma.product.findFirst({
      where: { id, wholesalerId },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productData = normalizeProductInput(req.body);
    const stockChange = productData.currentStock - existingProduct.currentStock;

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: productData,
      });

      if (stockChange !== 0) {
        await tx.inventoryLog.create({
          data: {
            wholesalerId,
            productId: id,
            changeAmount: stockChange,
            reason: 'MANUAL_ADJUSTMENT',
          },
        });
      }

      return product;
    });

    // Trigger asynchronous, non-blocking real-time recommendation updates
    queueProductRecommendationUpdate(updatedProduct.id);

    res.status(200).json({ message: 'Product updated', product: updatedProduct });
  } catch (error) {
    console.error('Update Product Error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};
export const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Please provide a rating between 1 and 5' });
    }

    const review = await prisma.review.create({
      data: {
        productId: id,
        userId,
        rating: Number(rating),
        comment,
      },
    });

    res.status(201).json({ message: 'Review added successfully!', review });
  } catch (error) {
    console.error('Add Review Error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};
