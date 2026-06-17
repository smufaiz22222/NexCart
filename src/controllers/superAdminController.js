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

const buildAdminOverview = async () => {
  await ensureDefaultSubscriptionPlans(prisma);

  const [
    users,
    wholesalers,
    products,
    orders,
    lowStockProducts,
    outOfStockProducts,
    openIssues,
    pendingApplications,
    subscriptionPlans,
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
            adjustments: {
              select: {
                amount: true,
                type: true,
              },
            },
          },
        },
        subscriptions: {
          include: { plan: true },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
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
        adjustments: {
          select: {
            amount: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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
  ]);

  const totalCustomers = users.filter((user) => user.role === 'CUSTOMER').length;
  const totalSuperAdmins = users.filter((user) => user.role === 'SUPER_ADMIN').length;
  const totalRevenue = orders.reduce(
    (sum, order) =>
      sum +
      Math.max(0, formatCurrencyValue(order.totalAmount) - getReturnedAmount(order.adjustments)),
    0
  );
  const totalInventoryValue = products.reduce(
    (sum, product) => sum + product.currentStock * Number(product.price || 0),
    0
  );

  const wholesalerDirectory = wholesalers.map((wholesaler) => {
    const revenue = wholesaler.orders.reduce(
      (sum, order) =>
        sum +
        Math.max(0, formatCurrencyValue(order.totalAmount) - getReturnedAmount(order.adjustments)),
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
      onboardingStatus: wholesaler.onboardingStatus,
      businessPhone: wholesaler.businessPhone,
      businessAddress: wholesaler.businessAddress,
      currentSubscription: serializeSubscription(getCurrentSubscription(wholesaler)),
      trialState: getTrialState(wholesaler),
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
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      lowStockProducts,
      outOfStockProducts,
      openIssues,
      pendingApplications: pendingApplications.length,
      activePaidSubscriptions: wholesalerDirectory.filter(
        (item) =>
          item.currentSubscription?.status === 'ACTIVE' &&
          item.currentSubscription?.plan?.code !== 'TRIAL'
      ).length,
      activeTrials: wholesalerDirectory.filter(
        (item) =>
          item.currentSubscription?.status === 'ACTIVE' &&
          item.currentSubscription?.plan?.code === 'TRIAL'
      ).length,
    },
    charts: {
      orderStatus: buildOrderStatusSummary(orders),
      paymentStatus: buildPaymentSummary(orders),
      monthlyRevenue: buildMonthlyRevenue(orders),
    },
    topWholesalers,
    wholesalers: wholesalerDirectory,
    pendingApplications,
    subscriptionPlans: buildAdminPlanCatalog(subscriptionPlans),
  };
};

export const getGlobalStats = async (_req, res) => {
  try {
    const payload = await buildAdminOverview();
    res.status(200).json(payload);
  } catch (error) {
    console.error('Global Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch global admin stats' });
  }
};

export const getAllWholesalers = async (_req, res) => {
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
      return res.status(400).json({ error: 'All fields (code, planId, durationDays, expiryDate) are required.' });
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
