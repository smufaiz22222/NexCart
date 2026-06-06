import { prisma } from '../config/db.js';

export const createProduct = async (req, res) => {
  try {
    // 1. UPDATED: Extracted 'category' from the frontend request
    const { name, sku, category, price, costPrice, currentStock, minStock, description, imageUrl } = req.body;
    const wholesalerId = req.user.wholesalerId;

    const newProduct = await prisma.product.create({
      data: {
        wholesalerId,
        name,
        sku,
        description,
        imageUrl,
        // 2. UPDATED: Save the category. If it's blank, send undefined so Prisma uses @default("General")
        category: category || undefined, 
        price: parseFloat(price),
        costPrice: parseFloat(costPrice || 0),
        currentStock: parseInt(currentStock || 0),
        minStock: parseInt(minStock || 10)
      }
    });

    res.status(201).json({ message: 'Product created', product: newProduct });
  } catch (error) {
    console.error("PRODUCT CREATE ERROR:", error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};
export const getProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;

    const products = await prisma.product.findMany({
      where: { wholesalerId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ count: products.length, products });
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};
export const getMarketplaceProducts = async (req, res) => {
  console.log('Fetching marketplace products...');
  try {
    const products = await prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      include: { 
        wholesaler: {
          select: { businessName: true }
        } 
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Marketplace products:', products);
    res.status(200).json({ count: products.length, products });
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to fetch marketplace products' });
  }
};
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        wholesaler: { select: { businessName: true } },
        reviews: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    console.error('Get Product Error:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
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
        comment
      }
    });

    res.status(201).json({ message: 'Review added successfully!', review });
  } catch (error) {
    console.error('Add Review Error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
};
