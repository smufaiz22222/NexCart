import { prisma } from '../config/db.js';
import { queueProductRecommendationUpdate } from '../services/contentRecommendationService.js';
import { checkAndNotifyLowStock } from '../services/notificationService.js';

const isUniqueConstraintError = (error) => error?.code === 'P2002';

const normalizeProductInput = (body) => {
  const deliveryFee = body.deliveryFee;
  let parsedDeliveryFee = null;
  if (deliveryFee !== undefined && deliveryFee !== null && deliveryFee !== '') {
    parsedDeliveryFee = parseFloat(deliveryFee);
    if (isNaN(parsedDeliveryFee) || parsedDeliveryFee < 0) {
      const err = new Error('Delivery fee override must be a non-negative number');
      err.statusCode = 400;
      throw err;
    }
  }

  return {
    name: body.name,
    sku: body.sku,
    description: body.description || null,
    imageUrl: body.imageUrl || null,
    category: body.category || undefined,
    price: parseFloat(body.price),
    costPrice: parseFloat(body.costPrice || 0),
    currentStock: parseInt(body.currentStock || 0, 10),
    minStock: parseInt(body.minStock || 10, 10),
    deliveryFee: parsedDeliveryFee,
  };
};

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
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
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
    const page = parseInt(req.query.page, 10);
    const pageSize = parseInt(req.query.pageSize, 10) || 24;
    const search = req.query.search ? String(req.query.search).trim() : '';
    const category = req.query.category ? String(req.query.category).trim() : '';
    const sortBy = req.query.sortBy ? String(req.query.sortBy).trim() : '';

    const where = { currentStock: { gt: 0 } };

    if (category && category !== 'All') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { wholesaler: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const totalCount = await prisma.product.count({ where });

    let orderBy = [{ createdAt: 'desc' }];
    if (sortBy === 'topRated' || sortBy === 'topSelling') {
      orderBy = [
        {
          reviews: {
            _count: 'desc',
          },
        },
        { createdAt: 'desc' },
      ];
    }

    const findManyArgs = {
      where,
      include: {
        wholesaler: {
          select: { businessName: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy,
    };

    if (!isNaN(page) && page > 0) {
      findManyArgs.skip = (page - 1) * pageSize;
      findManyArgs.take = pageSize;
    }

    const [products, distinctCategories] = await Promise.all([
      prisma.product.findMany(findManyArgs),
      prisma.product.findMany({
        where: { currentStock: { gt: 0 } },
        distinct: ['category'],
        select: { category: true },
      }),
    ]);

    const categoriesList = [
      'All',
      ...new Set(distinctCategories.map((p) => p.category || 'General')),
    ];

    res.status(200).json({
      totalCount,
      page: isNaN(page) ? null : page,
      pageSize: isNaN(page) ? null : pageSize,
      totalPages: isNaN(page) ? null : Math.ceil(totalCount / pageSize),
      count: products.length,
      categories: categoriesList,
      products: products.map(decorateProductForMarketplace),
    });
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
        wholesaler: { select: { businessName: true, deliveryFee: true } },
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

    checkAndNotifyLowStock(id).catch((err) =>
      console.error('Failed to check low stock after product edit:', err)
    );

    res.status(200).json({ message: 'Product updated', product: updatedProduct });
  } catch (error) {
    console.error('Update Product Error:', error);
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
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

    const existingReview = await prisma.review.findFirst({
      where: {
        productId: id,
        userId,
      },
    });

    if (existingReview) {
      return res
        .status(409)
        .json({ error: 'You have already submitted a review for this product' });
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
    if (isUniqueConstraintError(error)) {
      return res
        .status(409)
        .json({ error: 'You have already submitted a review for this product' });
    }

    console.error('Add Review Error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};
