import { prisma } from '../config/db.js';
import {
  computePlanPricing,
  ensureDefaultSubscriptionPlans,
  getCurrentSubscription,
  getTrialState,
  serializeSubscription,
} from '../services/subscriptionService.js';

const formatCurrencyValue = (value) => Number(value || 0);

const getReturnedAmount = (adjustments = []) =>
  adjustments.reduce((sum, adjustment) => {
    if (adjustment.type !== 'RETURN') return sum;
    return sum + formatCurrencyValue(adjustment.amount);
  }, 0);

const _buildOrderStatusSummary = (orders) => {
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

const _buildPaymentSummary = (orders) => {
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

const _buildMonthlyRevenue = (orders) => {
  const buckets = new Map();

  for (const order of orders) {
    const date = new Date(order.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = buckets.get(key) || { revenue: 0, orders: 0 };
    current.revenue += Math.max(
      0,
      formatCurrencyValue(order.totalAmount) - getReturnedAmount(order.adjustments)
    );
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

const buildAdminPlanCatalog = (plans = []) =>
  plans
    .filter((plan) => plan.code !== 'TRIAL')
    .map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description,
      price: Number(plan.price || 0),
      features: plan.features || {},
      purchaseOptions: [1, 3, 6, 12].map((months) => {
        const pricing = computePlanPricing(plan, months);
        return {
          months: pricing.months,
          label: pricing.label,
          baseAmount: pricing.baseAmount,
          discountPercent: pricing.discountPercent,
          finalAmount: pricing.finalAmount,
        };
      }),
    }));

let cachedOverview = null;
let cacheExpiry = 0;

export const invalidateOverviewCache = () => {
  cachedOverview = null;
  cacheExpiry = 0;
};

export const fetchFormattedWholesalersByIds = async (wholesalerIds) => {
  if (!wholesalerIds || wholesalerIds.length === 0) return [];

  const wholesalers = await prisma.wholesaler.findMany({
    where: { id: { in: wholesalerIds } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
      subscriptions: {
        include: { plan: true },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  const orderMap = {};
  wholesalerIds.forEach((id, index) => {
    orderMap[id] = index;
  });
  wholesalers.sort((a, b) => orderMap[a.id] - orderMap[b.id]);

  const productStatsMap = new Map();
  const orderStatsMap = new Map();

  const [pStats, oStats] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        "wholesalerId",
        COUNT("id")::int AS "productCount",
        COALESCE(SUM("currentStock"), 0)::int AS "inventoryUnits",
        COALESCE(SUM(CAST("currentStock" AS DECIMAL) * CAST("price" AS DECIMAL)), 0)::double precision AS "inventoryValue",
        SUM(CASE WHEN "currentStock" > 0 AND "currentStock" <= GREATEST(COALESCE("minStock", 0), 10) THEN 1 ELSE 0 END)::int AS "lowStockCount"
      FROM "Product"
      WHERE "wholesalerId" = ANY(${wholesalerIds})
      GROUP BY "wholesalerId"
    `,
    prisma.$queryRaw`
      SELECT
        o."sellerId" AS "wholesalerId",
        COUNT(o."id")::int AS "orderCount",
        COALESCE(SUM(
          GREATEST(0, CAST(o."totalAmount" AS DECIMAL) - COALESCE(adj."returnedAmount", 0))
        ), 0)::double precision AS "revenue"
      FROM "Order" o
      LEFT JOIN (
        SELECT "orderId", SUM(CAST("amount" AS DECIMAL)) AS "returnedAmount"
        FROM "OrderAdjustment"
        WHERE "type" = 'RETURN'
        GROUP BY "orderId"
      ) adj ON o."id" = adj."orderId"
      WHERE o."sellerId" = ANY(${wholesalerIds})
      GROUP BY o."sellerId"
    `,
  ]);

  for (const row of pStats) {
    productStatsMap.set(row.wholesalerId, row);
  }
  for (const row of oStats) {
    orderStatsMap.set(row.wholesalerId, row);
  }

  return wholesalers.map((wholesaler) => {
    const pRow = productStatsMap.get(wholesaler.id) || {
      productCount: 0,
      inventoryUnits: 0,
      inventoryValue: 0.0,
      lowStockCount: 0,
    };
    const oRow = orderStatsMap.get(wholesaler.id) || {
      orderCount: 0,
      revenue: 0.0,
    };

    return {
      id: wholesaler.id,
      businessName: wholesaler.businessName,
      ownerName: wholesaler.user.name,
      ownerEmail: wholesaler.user.email,
      joinedAt: wholesaler.user.createdAt,
      onboardingStatus: wholesaler.onboardingStatus,
      businessPhone: wholesaler.businessPhone,
      businessAddress: wholesaler.businessAddress,
      currentSubscription: serializeSubscription(getCurrentSubscription(wholesaler)),
      trialState: getTrialState(wholesaler),
      productCount: pRow.productCount,
      orderCount: oRow.orderCount,
      inventoryUnits: pRow.inventoryUnits,
      inventoryValue: Number(pRow.inventoryValue.toFixed(2)),
      revenue: Number(oRow.revenue.toFixed(2)),
      lowStockCount: pRow.lowStockCount,
    };
  });
};

const buildAdminOverview = async () => {
  const now = Date.now();
  if (cachedOverview && now < cacheExpiry) {
    return cachedOverview;
  }

  await ensureDefaultSubscriptionPlans(prisma);

  const [
    userGroups,
    totalWholesalers,
    totalProducts,
    totalOrders,
    lowStockProducts,
    outOfStockProducts,
    openIssues,
    pendingApplications,
    subscriptionPlans,
    activePaidSubscriptions,
    activeTrials,
    ordersSummaryData,
    totalInventoryValueResult,
    topWholesalersRows,
    overviewWholesalerIdsQuery,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    }),
    prisma.wholesaler.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.product.count({
      where: {
        currentStock: { gt: 0 },
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
        status: { in: ['OPEN', 'IN_REVIEW'] },
      },
    }),
    prisma.wholesaler.findMany({
      where: { onboardingStatus: { in: ['APPLIED', 'UNDER_REVIEW'] } },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { reviewSubmittedAt: 'asc' },
    }),
    prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.wholesalerSubscription.count({
      where: {
        status: 'ACTIVE',
        plan: { code: { not: 'TRIAL' } },
      },
    }),
    prisma.wholesalerSubscription.count({
      where: {
        status: 'ACTIVE',
        plan: { code: 'TRIAL' },
      },
    }),
    prisma.order.findMany({
      select: {
        status: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        adjustments: {
          where: { type: 'RETURN' },
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.$queryRaw`
      SELECT COALESCE(SUM("currentStock" * "price"), 0) AS "totalValue" FROM "Product"
    `,
    prisma.$queryRaw`
      SELECT
        w."id" AS "wholesalerId",
        COALESCE(SUM(
          GREATEST(0, CAST(o."totalAmount" AS DECIMAL) - COALESCE(adj."returnedAmount", 0))
        ), 0)::double precision AS "revenue"
      FROM "Wholesaler" w
      LEFT JOIN "Order" o ON w."id" = o."sellerId"
      LEFT JOIN (
        SELECT "orderId", SUM(CAST("amount" AS DECIMAL)) AS "returnedAmount"
        FROM "OrderAdjustment"
        WHERE "type" = 'RETURN'
        GROUP BY "orderId"
      ) adj ON o."id" = adj."orderId"
      GROUP BY w."id"
      ORDER BY "revenue" DESC
      LIMIT 5
    `,
    prisma.wholesaler.findMany({
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  let totalCustomers = 0;
  let totalSuperAdmins = 0;
  for (const group of userGroups) {
    if (group.role === 'CUSTOMER') totalCustomers = group._count._all;
    if (group.role === 'SUPER_ADMIN') totalSuperAdmins = group._count._all;
  }

  let totalRevenue = 0;
  const orderStatusCounts = {
    PENDING: 0,
    PROCESSING: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    RETURN_COMPLETED: 0,
  };
  const paymentStatusCounts = {
    PENDING: 0,
    PAID: 0,
    FAILED: 0,
    REFUND_PENDING: 0,
    REFUNDED: 0,
  };
  const monthlyBuckets = new Map();

  for (const order of ordersSummaryData) {
    const orderTotal = formatCurrencyValue(order.totalAmount);
    const orderReturnAmount = order.adjustments.reduce(
      (sum, adj) => sum + formatCurrencyValue(adj.amount),
      0
    );
    const netAmount = Math.max(0, orderTotal - orderReturnAmount);

    totalRevenue += netAmount;

    if (orderStatusCounts[order.status] !== undefined) {
      orderStatusCounts[order.status]++;
    }
    if (paymentStatusCounts[order.paymentStatus] !== undefined) {
      paymentStatusCounts[order.paymentStatus]++;
    }

    const date = new Date(order.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = monthlyBuckets.get(key) || { revenue: 0, orders: 0 };
    current.revenue += netAmount;
    current.orders += 1;
    monthlyBuckets.set(key, current);
  }

  const orderStatusSummary = Object.entries(orderStatusCounts).map(([status, count]) => ({
    status,
    count,
  }));
  const paymentSummary = Object.entries(paymentStatusCounts).map(([status, count]) => ({
    status,
    count,
  }));
  const monthlyRevenueSummary = [...monthlyBuckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([month, value]) => ({
      month,
      revenue: Number(value.revenue.toFixed(2)),
      orders: value.orders,
    }));

  const totalInventoryValue = Number(totalInventoryValueResult[0]?.totalValue || 0);

  const topWholesalerIds = topWholesalersRows.map((row) => row.wholesalerId);
  const overviewWholesalerIds = overviewWholesalerIdsQuery.map((w) => w.id);

  const [topWholesalers, wholesalersList] = await Promise.all([
    fetchFormattedWholesalersByIds(topWholesalerIds),
    fetchFormattedWholesalersByIds(overviewWholesalerIds),
  ]);

  const payload = {
    totals: {
      totalWholesalers,
      totalCustomers,
      totalSuperAdmins,
      totalProducts,
      totalOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      lowStockProducts,
      outOfStockProducts,
      openIssues,
      pendingApplications: pendingApplications.length,
      activePaidSubscriptions,
      activeTrials,
    },
    charts: {
      orderStatus: orderStatusSummary,
      paymentStatus: paymentSummary,
      monthlyRevenue: monthlyRevenueSummary,
    },
    topWholesalers,
    wholesalers: wholesalersList,
    pendingApplications,
    subscriptionPlans: buildAdminPlanCatalog(subscriptionPlans),
  };

  cachedOverview = payload;
  cacheExpiry = Date.now() + 60000; // 60 seconds

  return payload;
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
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).trim() : '';

    const where = {};
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [wholesalersQuery, totalCount] = await Promise.all([
      prisma.wholesaler.findMany({
        where,
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.wholesaler.count({ where }),
    ]);

    const wholesalerIds = wholesalersQuery.map((w) => w.id);
    const formattedWholesalers = await fetchFormattedWholesalersByIds(wholesalerIds);

    res.status(200).json({
      count: totalCount,
      wholesalers: formattedWholesalers,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
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
            adjustments: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
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
        subscriptions: {
          include: { plan: true },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        },
        subscriptionPayments: {
          include: {
            plan: {
              select: {
                id: true,
                code: true,
                name: true,
                price: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Wholesaler not found' });
    }

    const totalRevenue = tenant.orders.reduce(
      (sum, order) =>
        sum +
        Math.max(0, formatCurrencyValue(order.totalAmount) - getReturnedAmount(order.adjustments)),
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
        businessPhone: tenant.businessPhone,
        businessAddress: tenant.businessAddress,
        taxId: tenant.taxId,
        onboardingStatus: tenant.onboardingStatus,
        rejectionReason: tenant.rejectionReason,
        joinedAt: tenant.user.createdAt,
        trialStartedAt: tenant.trialStartedAt,
        trialEndsAt: tenant.trialEndsAt,
        trialUsedAt: tenant.trialUsedAt,
        currentSubscription: serializeSubscription(getCurrentSubscription(tenant)),
        subscriptionPayments: tenant.subscriptionPayments.map((payment) => ({
          ...payment,
          baseAmount: Number(payment.baseAmount || 0),
          finalAmount: Number(payment.finalAmount || 0),
          amount: Number(payment.finalAmount || 0),
        })),
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

export const getPendingWholesalerApplications = async (_req, res) => {
  try {
    const wholesalers = await prisma.wholesaler.findMany({
      where: { onboardingStatus: { in: ['APPLIED', 'UNDER_REVIEW'] } },
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
      },
      orderBy: { reviewSubmittedAt: 'asc' },
    });

    res.status(200).json({ applications: wholesalers });
  } catch (error) {
    console.error('Get Pending Applications Error:', error);
    res.status(500).json({ error: 'Failed to fetch wholesaler applications' });
  }
};

export const approveWholesalerApplication = async (req, res) => {
  try {
    const { wholesalerId } = req.params;

    const wholesaler = await prisma.wholesaler.update({
      where: { id: wholesalerId },
      data: {
        onboardingStatus: 'APPROVED',
        approvedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    invalidateOverviewCache();
    res.status(200).json({ wholesaler });
  } catch (error) {
    console.error('Approve Wholesaler Application Error:', error);
    res.status(500).json({ error: 'Failed to approve wholesaler application' });
  }
};

export const rejectWholesalerApplication = async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { reason } = req.body || {};

    const wholesaler = await prisma.wholesaler.update({
      where: { id: wholesalerId },
      data: {
        onboardingStatus: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: String(reason || '').trim() || 'Application details need revision.',
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    invalidateOverviewCache();
    res.status(200).json({ wholesaler });
  } catch (error) {
    console.error('Reject Wholesaler Application Error:', error);
    res.status(500).json({ error: 'Failed to reject wholesaler application' });
  }
};

export const updateWholesalerLifecycle = async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { action } = req.body || {};

    if (!['suspend', 'reactivate'].includes(action)) {
      return res.status(400).json({ error: 'Invalid lifecycle action' });
    }

    const updated = await prisma.wholesaler.update({
      where: { id: wholesalerId },
      data:
        action === 'suspend'
          ? {
              onboardingStatus: 'SUSPENDED',
              suspendedAt: new Date(),
            }
          : {
              onboardingStatus: 'ACTIVE',
              suspendedAt: null,
              activatedAt: new Date(),
            },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    invalidateOverviewCache();
    res.status(200).json({ wholesaler: updated });
  } catch (error) {
    console.error('Update Wholesaler Lifecycle Error:', error);
    res.status(500).json({ error: 'Failed to update wholesaler lifecycle' });
  }
};

export const getAdminSubscriptionPlans = async (_req, res) => {
  try {
    await ensureDefaultSubscriptionPlans(prisma);
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    res.status(200).json({ plans: buildAdminPlanCatalog(plans) });
  } catch (error) {
    console.error('Get Admin Subscription Plans Error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
};

export const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      include: {
        plan: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        usedBy: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ coupons });
  } catch (error) {
    console.error('Get Coupons Error:', error);
    res.status(500).json({ error: 'Failed to fetch coupons.' });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const { code, planId, durationDays, expiryDate } = req.body || {};

    if (!code || !planId || !durationDays || !expiryDate) {
      return res
        .status(400)
        .json({ error: 'All fields (code, planId, durationDays, expiryDate) are required.' });
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists.' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        planId,
        durationDays: parseInt(durationDays, 10),
        expiryDate: new Date(expiryDate),
      },
      include: { plan: true },
    });

    res.status(201).json({
      message: 'Coupon created successfully.',
      coupon,
    });
  } catch (error) {
    console.error('Create Coupon Error:', error);
    res.status(500).json({ error: 'Failed to create coupon.' });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found.' });
    }

    if (coupon.isUsed) {
      return res.status(400).json({ error: 'Cannot delete a coupon that has already been used.' });
    }

    await prisma.coupon.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Coupon deleted successfully.' });
  } catch (error) {
    console.error('Delete Coupon Error:', error);
    res.status(500).json({ error: 'Failed to delete coupon.' });
  }
};
