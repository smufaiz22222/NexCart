import express from 'express';
import { prisma } from '../config/db.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
};

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

router.get('/advisor-context', authenticate, requireWholesaler, async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;
    const { start, end } = getCurrentMonthRange();

    const [products, orders] = await Promise.all([
      prisma.product.findMany({
        where: { wholesalerId },
        select: {
          id: true,
          category: true,
          currentStock: true,
          minStock: true,
          _count: {
            select: { orderItems: true }
          }
        }
      }),
      prisma.order.findMany({
        where: { sellerId: wholesalerId },
        select: {
          buyerId: true,
          totalAmount: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              product: {
                select: { category: true }
              }
            }
          }
        }
      })
    ]);

    const monthlySales = orders
      .filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= start && createdAt < end;
      })
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    const lowStockProducts = products.filter(
      (product) => product.currentStock > 0 && product.currentStock < product.minStock
    ).length;

    const unsoldInventory = products.filter((product) => (product._count?.orderItems || 0) === 0).length;

    const categorySales = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const category = item.product?.category || 'General';
        categorySales[category] = (categorySales[category] || 0) + item.quantity;
      });
    });

    const topSellingCategory = Object.entries(categorySales).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const buyerOrderCounts = {};
    orders.forEach((order) => {
      if (!order.buyerId) return;
      buyerOrderCounts[order.buyerId] = (buyerOrderCounts[order.buyerId] || 0) + 1;
    });

    const distinctBuyers = Object.keys(buyerOrderCounts).length;
    const repeatBuyers = Object.values(buyerOrderCounts).filter((count) => count > 1).length;
    const repeatCustomerRate = distinctBuyers > 0
      ? Number((((repeatBuyers / distinctBuyers) * 100)).toFixed(2))
      : 0;

    res.json({
      monthlySales: Number(monthlySales.toFixed(2)),
      lowStockProducts,
      unsoldInventory,
      topSellingCategory,
      repeatCustomerRate,
      totalProducts: products.length,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Advisor Context Error:', error);
    res.status(500).json({ error: 'Failed to fetch advisor context' });
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
