import { prisma } from '../config/db.js';

const formatCurrencyValue = (value) => Number(value || 0);

const buildOrderStatusSummary = (orders) => {
  const summary = {
    PENDING: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    RETURN_COMPLETED: 0,
  };

  for (const order of orders) {
    summary[order.status] = (summary[order.status] || 0) + 1;
  }

  return Object.entries(summary).map(([status, count]) => ({
    status,
    count,
  }));
};

const buildPaymentSummary = (orders) => {
  const summary = {
    PENDING: 0,
    PAID: 0,
    FAILED: 0,
    REFUND_PENDING: 0,
    REFUNDED: 0,
  };

  for (const order of orders) {
    summary[order.paymentStatus] = (summary[order.paymentStatus] || 0) + 1;
  }

  return Object.entries(summary).map(([status, count]) => ({
    status,
    count,
  }));
};

const buildMonthlyRevenue = (orders) => {
  const buckets = new Map();

  for (const order of orders) {
    const date = new Date(order.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = buckets.get(key) || { revenue: 0, orders: 0 };
    current.revenue += formatCurrencyValue(order.totalAmount);
    current.orders += 1;
    buckets.set(key, current);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([month, value]) => ({
      month,
      revenue: Number(value.revenue.toFixed(2)),
      orders: value.orders,
    }));
};

const buildAdminOverview = async () => {
  const [
    users,
    wholesalers,
    products,
    orders,
    revenueAggregate,
    lowStockProducts,
    outOfStockProducts,
    openIssues,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.wholesaler.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        products: {
          select: {
            id: true,
            currentStock: true,
            minStock: true,
            price: true,
          },
        },
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        currentStock: true,
        minStock: true,
        price: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.product.count({
      where: {
        currentStock: {
          gt: 0,
        },
        OR: [
          { minStock: { gt: 0 }, currentStock: { lte: 10 } },
          { minStock: { lte: 10 }, currentStock: { lte: 10 } },
        ],
      },
    }),
    prisma.product.count({
      where: { currentStock: 0 },
    }),
    prisma.orderIssue.count({
      where: {
        status: {
          in: ['OPEN', 'IN_REVIEW'],
        },
      },
    }),
  ]);

  const totalCustomers = users.filter((user) => user.role === 'CUSTOMER').length;
  const totalSuperAdmins = users.filter((user) => user.role === 'SUPER_ADMIN').length;
  const totalInventoryValue = products.reduce(
    (sum, product) => sum + product.currentStock * Number(product.price || 0),
    0
  );

  const wholesalerDirectory = wholesalers.map((wholesaler) => {
    const revenue = wholesaler.orders.reduce(
      (sum, order) => sum + formatCurrencyValue(order.totalAmount),
      0
    );
    const inventoryUnits = wholesaler.products.reduce(
      (sum, product) => sum + product.currentStock,
      0
    );
    const inventoryValue = wholesaler.products.reduce(
      (sum, product) => sum + product.currentStock * Number(product.price || 0),
      0
    );
    const lowStockCount = wholesaler.products.filter(
      (product) =>
        product.currentStock > 0 && product.currentStock <= Math.max(product.minStock || 0, 10)
    ).length;

    return {
      id: wholesaler.id,
      businessName: wholesaler.businessName,
      ownerName: wholesaler.user.name,
      ownerEmail: wholesaler.user.email,
      joinedAt: wholesaler.user.createdAt,
      productCount: wholesaler.products.length,
      orderCount: wholesaler.orders.length,
      inventoryUnits,
      inventoryValue: Number(inventoryValue.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
      lowStockCount,
    };
  });

  const topWholesalers = [...wholesalerDirectory]
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);

  return {
    totals: {
      totalWholesalers: wholesalers.length,
      totalCustomers,
      totalSuperAdmins,
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue: formatCurrencyValue(revenueAggregate._sum.totalAmount),
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      lowStockProducts,
      outOfStockProducts,
      openIssues,
    },
    charts: {
      orderStatus: buildOrderStatusSummary(orders),
      paymentStatus: buildPaymentSummary(orders),
      monthlyRevenue: buildMonthlyRevenue(orders),
    },
    topWholesalers,
    wholesalers: wholesalerDirectory,
  };
};

export const getGlobalStats = async (req, res) => {
  try {
    const payload = await buildAdminOverview();
    res.status(200).json(payload);
  } catch (error) {
    console.error('Global Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch global admin stats' });
  }
};

export const getAllWholesalers = async (req, res) => {
  try {
    const payload = await buildAdminOverview();

    res.status(200).json({
      count: payload.wholesalers.length,
      wholesalers: payload.wholesalers,
      topWholesalers: payload.topWholesalers,
    });
  } catch (error) {
    console.error('Get All Wholesalers Error:', error);
    res.status(500).json({ error: 'Failed to fetch wholesalers' });
  }
};

export const getTenantData = async (req, res) => {
  try {
    const { wholesalerId } = req.params;

    const tenant = await prisma.wholesaler.findUnique({
      where: { id: wholesalerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            category: true,
            currentStock: true,
            minStock: true,
            price: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        orders: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
        inventoryLogs: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Wholesaler not found' });
    }

    const totalRevenue = tenant.orders.reduce(
      (sum, order) => sum + formatCurrencyValue(order.totalAmount),
      0
    );
    const inventoryValue = tenant.products.reduce(
      (sum, product) => sum + product.currentStock * Number(product.price || 0),
      0
    );
    const inventoryRisk = tenant.products
      .filter((product) => product.currentStock <= Math.max(product.minStock || 0, 10))
      .sort((left, right) => left.currentStock - right.currentStock)
      .slice(0, 8);

    res.status(200).json({
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        ownerName: tenant.user.name,
        ownerEmail: tenant.user.email,
        joinedAt: tenant.user.createdAt,
        metrics: {
          productCount: tenant.products.length,
          orderCount: tenant.orders.length,
          revenue: Number(totalRevenue.toFixed(2)),
          inventoryValue: Number(inventoryValue.toFixed(2)),
        },
        recentOrders: tenant.orders.map((order) => ({
          id: order.id,
          buyerName: order.buyer.name,
          buyerEmail: order.buyer.email,
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: formatCurrencyValue(order.totalAmount),
          createdAt: order.createdAt,
        })),
        inventoryRisk,
        recentLedgerEntries: tenant.ledgerEntries.map((entry) => ({
          id: entry.id,
          description: entry.description,
          amount: formatCurrencyValue(entry.amount),
          referenceId: entry.referenceId,
          createdAt: entry.createdAt,
        })),
        recentInventoryLogs: tenant.inventoryLogs.map((log) => ({
          id: log.id,
          productName: log.product.name,
          changeAmount: log.changeAmount,
          reason: log.reason,
          createdAt: log.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get Tenant Data Error:', error);
    res.status(500).json({ error: 'Failed to fetch wholesaler details' });
  }
};
