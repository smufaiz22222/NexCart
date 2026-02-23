import { prisma } from '../config/db.js';

// --- CREATE PRODUCT ---
// Inside your create product function
export const createProduct = async (req, res) => {
  try {
    const { name, sku, price, costPrice, currentStock, minStock, description, imageUrl } = req.body;
    const wholesalerId = req.user.wholesalerId;

    const newProduct = await prisma.product.create({
      data: {
        wholesalerId,
        name,
        sku,
        description,
        imageUrl,
        price: parseFloat(price),
        costPrice: parseFloat(costPrice || 0),
        currentStock: parseInt(currentStock || 0),
        minStock: parseInt(minStock || 10)
      }
    });

    res.status(201).json({ message: 'Product created', product: newProduct });
  } catch (error) {
    console.error("PRODUCT CREATE ERROR:", error); // <-- This prints the real error to your terminal
    res.status(500).json({ error: 'Failed to create product' });
  }
};
// --- GET WHOLESALER'S PRODUCTS ---
export const getProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;

    // Fetch ONLY the products belonging to the logged-in wholesaler
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
// --- GET ALL PRODUCTS FOR MARKETPLACE ---
export const getMarketplaceProducts = async (req, res) => {
  try {
    // Fetch all products that have stock > 0
    const products = await prisma.product.findMany({
      where: { currentStock: { gt: 0 } },
      include: { 
        wholesaler: {
          select: { businessName: true } // Include the shop name so buyers know who they are buying from
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ count: products.length, products });
  } catch (error) {
    console.error('Marketplace Products Error:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace products' });
  }
};