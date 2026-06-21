import { prisma } from '../config/db.js';
import {
  buildSellerPlansResponse,
  buildWholesalerAccessSummary,
  createCheckoutForSubscription,
  ensureDefaultSubscriptionPlans,
  startFreeTrial,
  verifyCheckoutPayment,
  validateCouponCode,
  activateCouponSubscription,
  checkAndExpireSubscription,
} from '../services/subscriptionService.js';

export const getSubscriptionPlans = async (req, res) => {
  try {
    const payload = await buildSellerPlansResponse(prisma, req.user.wholesalerId);
    res.status(200).json(payload);
  } catch (error) {
    console.error('Get Subscription Plans Error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to load subscription plans.',
    });
  }
};

export const getSubscriptionSummary = async (req, res) => {
  try {
    await ensureDefaultSubscriptionPlans(prisma);
    const wholesaler = await prisma.wholesaler.findUnique({
      where: { id: req.user.wholesalerId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!wholesaler) {
      return res.status(404).json({ error: 'Wholesaler not found' });
    }

    const syncedWholesaler = await checkAndExpireSubscription(prisma, wholesaler);

    res.status(200).json(buildWholesalerAccessSummary(syncedWholesaler));
  } catch (error) {
    console.error('Get Subscription Summary Error:', error);
    res.status(500).json({ error: 'Failed to load subscription summary.' });
  }
};

export const getSubscriptionPayments = async (req, res) => {
  try {
    const payments = await prisma.subscriptionPayment.findMany({
      where: { wholesalerId: req.user.wholesalerId },
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
      take: 20,
    });

    res.status(200).json({
      payments: payments.map((payment) => ({
        ...payment,
        baseAmount: Number(payment.baseAmount || 0),
        finalAmount: Number(payment.finalAmount || 0),
        amount: Number(payment.finalAmount || 0),
      })),
    });
  } catch (error) {
    console.error('Get Subscription Payments Error:', error);
    res.status(500).json({ error: 'Failed to load billing history.' });
  }
};

export const createSubscriptionCheckout = async (req, res) => {
  try {
    const payload = await createCheckoutForSubscription(
      prisma,
      req.user.wholesalerId,
      req.body || {}
    );
    res.status(200).json(payload);
  } catch (error) {
    console.error('Create Subscription Checkout Error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to create subscription checkout.',
    });
  }
};

export const verifySubscriptionCheckout = async (req, res) => {
  try {
    await verifyCheckoutPayment(prisma, req.user.wholesalerId, req.body || {});

    const wholesaler = await prisma.wholesaler.findUnique({
      where: { id: req.user.wholesalerId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    const summary = buildWholesalerAccessSummary(wholesaler);

    res.status(200).json(summary);
  } catch (error) {
    console.error('Verify Subscription Checkout Error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to verify subscription payment.',
    });
  }
};

export const startSubscriptionTrial = async (req, res) => {
  try {
    await startFreeTrial(prisma, req.user.wholesalerId);

    const wholesaler = await prisma.wholesaler.findUnique({
      where: { id: req.user.wholesalerId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    const summary = buildWholesalerAccessSummary(wholesaler);
    res.status(200).json(summary);
  } catch (error) {
    console.error('Start Subscription Trial Error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to start free trial.',
    });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body || {};
    const details = await validateCouponCode(prisma, code);
    res.status(200).json(details);
  } catch (error) {
    console.error('Validate Coupon Error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to validate coupon code.',
    });
  }
};

export const activateCoupon = async (req, res) => {
  try {
    const { code } = req.body || {};
    await activateCouponSubscription(prisma, req.user.wholesalerId, code);

    const wholesaler = await prisma.wholesaler.findUnique({
      where: { id: req.user.wholesalerId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    res.status(200).json({
      message: 'Subscription activated successfully.',
      ...buildWholesalerAccessSummary(wholesaler),
    });
  } catch (error) {
    console.error('Activate Coupon Error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to activate coupon subscription.',
    });
  }
};
