import express from 'express';
import { prisma } from '../config/db.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/advanced-summary', authenticate, requireWholesaler, async (req, res) => {
  const wholesalerId = req.user.wholesalerId;
  const { timeframe = 'monthly' } = req.query; // Get timeframe from frontend

  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: { wholesalerId },
      orderBy: { createdAt: 'asc' }
    });

    const products = await prisma.product.findMany({
      where: { wholesalerId }
    });

    // Group Sales & Profit dynamically
    const chartStats = entries.reduce((acc, entry) => {
      const date = new Date(entry.createdAt);
      let dateKey;

      // Format the date based on the chosen timeframe
      if (timeframe === 'daily') {
        dateKey = date.toLocaleDateString('default', { day: 'numeric', month: 'short' });
      } else if (timeframe === 'yearly') {
        dateKey = date.getFullYear().toString();
      } else { // default monthly
        dateKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      }
      
      if (!acc[dateKey]) {
        acc[dateKey] = { name: dateKey, revenue: 0, profit: 0 };
      }

      // Negative amount = Sale/Invoice
      if (entry.amount < 0) {
        const amount = Math.abs(Number(entry.amount));
        acc[dateKey].revenue += amount;
        
        // For now, using a mock 15% margin until you update your products' actual costPrices
        acc[dateKey].profit += amount * 0.15; 
      }
      return acc;
    }, {});

    // Identify Top Products
    const topProducts = products
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        price: p.price,
        sold: 100 - p.currentStock,
        profit: (100 - p.currentStock) * (p.price - p.costPrice) // NOW USING REAL PROFIT!
      }));

    res.json({
      chartData: Object.values(chartStats),
      topProducts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;