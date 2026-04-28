import express from 'express';
import { prisma } from '../config/db.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/wholesaler-summary', authenticate, requireWholesaler, async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;

    const entries = await prisma.ledgerEntry.findMany({
      where: { wholesalerId }
    });

    let totalCollection = 0;
    let netBalance = 0;

    entries.forEach(entry => {
      const amount = parseFloat(entry.amount);
      netBalance += amount;
      if (amount > 0) {
        totalCollection += amount;
      }
    });

    const totalDebt = netBalance < 0 ? Math.abs(netBalance) : 0;

    res.json({ totalDebt, totalCollection });
  } catch (error) {
    console.error('Wholesaler Summary Error:', error);
    res.status(500).json({ error: 'Failed to fetch summary stats' });
  }
});

router.get('/advanced-summary', authenticate, requireWholesaler, async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const { timeframe = 'monthly' } = req.query;

    const orders = await prisma.order.findMany({
      where: { sellerId: wholesalerId },
      include: {
        items: { include: { product: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    const chartStats = {};
    const productStats = {};

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let dateKey;
      if (timeframe === 'daily') {
        dateKey = date.toLocaleDateString('default', { day: 'numeric', month: 'short' });
      } else if (timeframe === 'yearly') {
        dateKey = date.getFullYear().toString();
      } else {
        dateKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      }
      
      if (!chartStats[dateKey]) {
        chartStats[dateKey] = { name: dateKey, revenue: 0, profit: 0 };
      }

      order.items.forEach(item => {
        const qty = item.quantity;
        const price = parseFloat(item.price);
        const cost = item.product?.costPrice || 0;

        const revenue = price * qty;
        const profit = (price - cost) * qty;

        chartStats[dateKey].revenue += revenue;
        chartStats[dateKey].profit += profit;

        const pId = item.productId;
        if (!productStats[pId]) {
          productStats[pId] = {
            name: item.product?.name || 'Deleted Item',
            price: price,
            sold: 0,
            profit: 0
          };
        }
        productStats[pId].sold += qty;
        productStats[pId].profit += profit;
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    res.json({
      chartData: Object.values(chartStats),
      topProducts
    });
  } catch (error) {
    console.error('Advanced Summary Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
