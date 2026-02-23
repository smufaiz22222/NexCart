import { prisma } from '../config/db.js';

// --- ADJUST INVENTORY (IMMUTABLE LOGGING) ---
export const adjustStock = async (req, res) => {
  try {
    const { productId, changeAmount, reason } = req.body;
    const wholesalerId = req.user.wholesalerId;

    // 1. Validate inputs
    if (!productId || changeAmount === undefined || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. Ensure the product belongs to this wholesaler
    const product = await prisma.product.findFirst({
      where: { id: productId, wholesalerId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    // 3. Execute an atomic transaction for data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Create the immutable inventory log
      const log = await tx.inventoryLog.create({
        data: {
          wholesalerId,
          productId,
          changeAmount: parseInt(changeAmount, 10),
          reason // Must be SALE, REFUND, OCR_UPDATE, or MANUAL_ADJUSTMENT
        }
      });

      // Step B: Update the cached currentStock on the Product table
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: { increment: parseInt(changeAmount, 10) }
        }
      });

      return { log, updatedProduct };
    });

    res.status(200).json({ 
      message: 'Stock adjusted successfully', 
      data: result 
    });

  } catch (error) {
    console.error('Inventory Adjustment Error:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
};

// --- GET INVENTORY LOGS ---
export const getInventoryLogs = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const { productId } = req.query; // Optional filter by specific product

    // Build the query securely
    const query = { wholesalerId };
    if (productId) query.productId = productId;

    const logs = await prisma.inventoryLog.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, sku: true } } } // Join basic product info
    });

    res.status(200).json({ count: logs.length, logs });
  } catch (error) {
    console.error('Fetch Logs Error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory logs' });
  }
};