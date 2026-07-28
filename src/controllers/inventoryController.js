import { prisma } from '../config/db.js';
import { checkAndNotifyLowStock } from '../services/notificationService.js';

export const adjustStock = async (req, res) => {
  try {
    const { productId, changeAmount, reason } = req.body;
    const wholesalerId = req.user.wholesalerId;

    if (!productId || changeAmount === undefined || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, wholesalerId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized' });
    }

    const parsedAmount = parseInt(changeAmount, 10);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ error: 'Invalid changeAmount value' });
    }

    if (product.currentStock + parsedAmount < 0) {
      return res.status(400).json({ error: 'Adjustment would result in negative stock' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.inventoryLog.create({
        data: {
          wholesalerId,
          productId,
          changeAmount: parsedAmount,
          reason,
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: { increment: parsedAmount },
        },
      });

      return { log, updatedProduct };
    });

    checkAndNotifyLowStock(productId).catch((err) =>
      console.error('Failed to check low stock after adjustment:', err)
    );

    res.status(200).json({
      message: 'Stock adjusted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Inventory Adjustment Error:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
};

export const getInventoryLogs = async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const { productId } = req.query;

    const query = { wholesalerId };
    if (productId) query.productId = productId;

    const logs = await prisma.inventoryLog.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, sku: true } } },
    });

    res.status(200).json({ count: logs.length, logs });
  } catch (error) {
    console.error('Fetch Logs Error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory logs' });
  }
};
