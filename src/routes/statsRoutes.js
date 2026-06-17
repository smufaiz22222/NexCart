import express from 'express';
import { prisma } from '../config/db.js';
import {
  authenticate,
  requireWholesaler,
  requireWholesalerFeature,
} from '../middlewares/authMiddleware.js';
import { buildAnalyticsOverview } from '../services/analyticsOverviewService.js';

const router = express.Router();

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
};

const toNumber = (value) => Number(Number(value || 0).toFixed(2));

const getReturnedAmountByItemId = (adjustments = []) =>
  adjustments.reduce((map, adjustment) => {
    if (adjustment.type !== 'RETURN' || !adjustment.orderItemId) {
      return map;
    }

    map[adjustment.orderItemId] = toNumber(
      (map[adjustment.orderItemId] || 0) + Number(adjustment.amount || 0)
    );
    return map;
  }, {});

router.get('/wholesaler-summary', authenticate, requireWholesaler, async (req, res) => {
  try {
    const wholesalerId = req.user.wholesalerId;

    const entries = await prisma.ledgerEntry.findMany({
      where: { wholesalerId },
    });

    let totalCollection = 0;
    let netBalance = 0;

    entries.forEach((entry) => {
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
            select: { orderItems: true },
          },
        },
      }),
      prisma.order.findMany({
        where: { sellerId: wholesalerId },
        select: {
          buyerId: true,
          totalAmount: true,
          createdAt: true,
          adjustments: {
            select: {
              amount: true,
              type: true,
            },
          },
          items: {
            select: {
              status: true,
              quantity: true,
              id: true,
              returnedQuantity: true,
              returnStatus: true,
              product: {
                select: { category: true },
              },
            },
          },
        },
      }),
    ]);

    const monthlySales = orders
      .filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= start && createdAt < end;
      })
      .reduce(
        (sum, order) =>
          sum +
          Math.max(
            0,
            toNumber(order.totalAmount) -
              toNumber(
                (order.adjustments || []).reduce((adjustmentSum, adjustment) => {
                  if (adjustment.type !== 'RETURN') return adjustmentSum;
                  return adjustmentSum + Number(adjustment.amount || 0);
                }, 0)
              )
          ),
        0
      );

    const lowStockProducts = products.filter(
      (product) => product.currentStock > 0 && product.currentStock < product.minStock
    ).length;

    const unsoldInventory = products.filter(
      (product) => (product._count?.orderItems || 0) === 0
    ).length;

    const categorySales = {};
    orders.forEach((order) => {
      const returnedAmountByItemId = getReturnedAmountByItemId(order.adjustments || []);
      order.items
        .filter((item) => item.status !== 'CANCELLED')
        .forEach((item) => {
          const returnedQuantity =
            item.returnedQuantity && returnedAmountByItemId[item.id] !== undefined
              ? item.returnedQuantity
              : 0;
          const netQuantity = Math.max(0, item.quantity - returnedQuantity);
          if (netQuantity <= 0) return;

          const category = item.product?.category || 'General';
          categorySales[category] = (categorySales[category] || 0) + netQuantity;
        });
    });

    const topSellingCategory =
      Object.entries(categorySales).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const buyerOrderCounts = {};
    orders.forEach((order) => {
      if (!order.buyerId) return;
      buyerOrderCounts[order.buyerId] = (buyerOrderCounts[order.buyerId] || 0) + 1;
    });

    const distinctBuyers = Object.keys(buyerOrderCounts).length;
    const repeatBuyers = Object.values(buyerOrderCounts).filter((count) => count > 1).length;
    const repeatCustomerRate =
      distinctBuyers > 0 ? Number(((repeatBuyers / distinctBuyers) * 100).toFixed(2)) : 0;

    res.json({
      monthlySales: Number(monthlySales.toFixed(2)),
      lowStockProducts,
      unsoldInventory,
      topSellingCategory,
      repeatCustomerRate,
      totalProducts: products.length,
      generatedAt: new Date().toISOString(),
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
        items: { include: { product: true } },
        adjustments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const chartStats = {};
    const productStats = {};

    orders.forEach((order) => {
      const returnedAmountByItemId = getReturnedAmountByItemId(order.adjustments || []);
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

      order.items
        .filter((item) => item.status !== 'CANCELLED')
        .forEach((item) => {
          const returnedQuantity =
            item.returnedQuantity && returnedAmountByItemId[item.id] !== undefined
              ? item.returnedQuantity
              : 0;
          const qty = Math.max(0, item.quantity - returnedQuantity);
          if (qty <= 0) return;

          const price = parseFloat(item.unitPriceAtPurchase ?? item.price);
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
              profit: 0,
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
      topProducts,
    });
  } catch (error) {
    console.error('Advanced Summary Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get(
  '/analytics-overview',
  authenticate,
  requireWholesaler,
  requireWholesalerFeature('analytics'),
  async (req, res) => {
    try {
      const wholesalerId = req.user.wholesalerId;
      const timeframe = ['daily', 'monthly', 'yearly'].includes(req.query.timeframe)
        ? req.query.timeframe
        : 'monthly';

      const [products, orders] = await Promise.all([
        prisma.product.findMany({
          where: { wholesalerId },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            costPrice: true,
            currentStock: true,
          },
        }),
        prisma.order.findMany({
          where: { sellerId: wholesalerId },
          select: {
            id: true,
            buyerId: true,
            createdAt: true,
            buyer: {
              select: {
                name: true,
                email: true,
              },
            },
            items: {
              select: {
                id: true,
                productId: true,
                quantity: true,
                returnedQuantity: true,
                status: true,
                price: true,
                unitPriceAtPurchase: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    costPrice: true,
                    currentStock: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      res.json(buildAnalyticsOverview({ products, orders, timeframe }));
    } catch (error) {
      console.error('Analytics Overview Error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics overview' });
    }
  }
);

export default router;
