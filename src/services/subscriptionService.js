import crypto from 'crypto';
import Razorpay from 'razorpay';

export const SUPPORT_CONTACT = {
  phone: process.env.SUPPORT_PHONE || '+91 98765 43210',
  email: process.env.SUPPORT_EMAIL || 'support@nexcart.local',
};

const DURATION_DISCOUNTS = {
  1: 0,
  3: 5,
  6: 10,
  12: 20,
};

const PLAN_DEFINITIONS = [
  {
    code: 'TRIAL',
    name: '2-Day Free Trial',
    description: 'One-time seller trial with premium features unlocked for two days.',
    price: 0,
    sortOrder: 0,
    features: {
      analytics: true,
      recommendations: true,
      advisor: true,
      khatta: true,
    },
  },
  {
    code: 'STANDARD',
    name: 'Standard',
    description: 'Core growth tools with advanced analytics and recommendation insights.',
    price: 1499,
    sortOrder: 1,
    features: {
      analytics: true,
      recommendations: true,
      advisor: false,
      khatta: false,
    },
  },
  {
    code: 'PREMIUM',
    name: 'Premium',
    description: 'Full seller intelligence stack with AI advisor and AI khatta support.',
    price: 2999,
    sortOrder: 2,
    features: {
      analytics: true,
      recommendations: true,
      advisor: true,
      khatta: true,
    },
  },
];

const ACCESSIBLE_SELLER_STATUSES = new Set(['APPROVED', 'ACTIVE', 'PAST_DUE']);
const MANUAL_ACTIVATION_ALLOWED_STATUSES = new Set(['APPROVED', 'ACTIVE', 'PAST_DUE', 'SUSPENDED']);

const toNumber = (value) => Number(Number(value || 0).toFixed(2));

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const buildRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const error = new Error('Razorpay is not configured on the server');
    error.statusCode = 500;
    throw error;
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const ensureValidDuration = (durationMonths) => {
  const months = Number(durationMonths);
  if (!DURATION_DISCOUNTS[months]) {
    if (months !== 1) {
      const error = new Error('Unsupported subscription duration');
      error.statusCode = 400;
      throw error;
    }
  }
  return months;
};

export const ensureDefaultSubscriptionPlans = async (db) => {
  await Promise.all(
    PLAN_DEFINITIONS.map((plan) =>
      db.subscriptionPlan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          features: plan.features,
          sortOrder: plan.sortOrder,
          isActive: true,
        },
        create: {
          code: plan.code,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          features: plan.features,
          sortOrder: plan.sortOrder,
          isActive: true,
        },
      })
    )
  );
};

export const computePlanPricing = (plan, durationMonths) => {
  const months = ensureValidDuration(durationMonths);
  const monthlyPrice = toNumber(plan.price);
  const baseAmount = toNumber(monthlyPrice * months);
  const discountPercent = DURATION_DISCOUNTS[months] ?? 0;
  const finalAmount = toNumber(baseAmount * ((100 - discountPercent) / 100));

  return {
    months,
    monthlyPrice,
    baseAmount,
    discountPercent,
    finalAmount,
    label: `${months} month${months > 1 ? 's' : ''}`,
  };
};

const getEffectiveSubscriptionStatus = (subscription) => {
  if (!subscription) return null;

  const now = new Date();
  const endsAt = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  if (subscription.status === 'ACTIVE' && endsAt && now > endsAt) {
    return subscription.plan?.code === 'TRIAL' ? 'EXPIRED' : 'PAST_DUE';
  }

  return subscription.status;
};

export const serializeSubscription = (subscription) => {
  if (!subscription) return null;

  const effectiveStatus = getEffectiveSubscriptionStatus(subscription);

  return {
    id: subscription.id,
    status: effectiveStatus,
    durationMonths: subscription.durationMonths,
    billingCycle: subscription.billingCycle,
    purchaseMethod: subscription.purchaseMethod,
    startedAt: subscription.startedAt,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    plan: subscription.plan
      ? {
          id: subscription.plan.id,
          code: subscription.plan.code,
          name: subscription.plan.name,
          description: subscription.plan.description,
          price: toNumber(subscription.plan.price),
          features: subscription.plan.features || {},
        }
      : null,
  };
};

export const getTrialState = (wholesaler) => {
  const now = new Date();
  const trialEndsAt = wholesaler?.trialEndsAt || null;
  const trialUsedAt = wholesaler?.trialUsedAt || null;
  const active = Boolean(trialEndsAt && now < new Date(trialEndsAt));

  return {
    available: !trialUsedAt,
    used: Boolean(trialUsedAt),
    active,
    startedAt: wholesaler?.trialStartedAt || null,
    endsAt: trialEndsAt,
    usedAt: trialUsedAt,
  };
};

const sortSubscriptionsForAccess = (subscriptions = []) =>
  subscriptions.slice().sort((left, right) => {
    const leftStatus = getEffectiveSubscriptionStatus(left);
    const rightStatus = getEffectiveSubscriptionStatus(right);

    const leftPriority =
      leftStatus === 'ACTIVE'
        ? 4
        : leftStatus === 'PAST_DUE'
          ? 3
          : leftStatus === 'PENDING'
            ? 2
            : 1;
    const rightPriority =
      rightStatus === 'ACTIVE'
        ? 4
        : rightStatus === 'PAST_DUE'
          ? 3
          : rightStatus === 'PENDING'
            ? 2
            : 1;

    if (leftPriority !== rightPriority) return rightPriority - leftPriority;

    return (
      new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt)
    );
  });

export const getCurrentSubscription = (wholesaler) => {
  const sorted = sortSubscriptionsForAccess(wholesaler?.subscriptions || []);
  return sorted[0] || null;
};

export const buildFeatureAccess = (wholesaler) => {
  const currentSubscription = getCurrentSubscription(wholesaler);
  const serialized = serializeSubscription(currentSubscription);
  const features = serialized?.status === 'ACTIVE' ? serialized.plan?.features || {} : {};

  return {
    billing: true,
    dashboard: true,
    account: true,
    analytics: Boolean(features.analytics),
    recommendations: Boolean(features.recommendations),
    advisor: Boolean(features.advisor),
    khatta: Boolean(features.khatta),
  };
};

export const buildWholesalerAccessSummary = (wholesaler) => {
  const currentSubscription = getCurrentSubscription(wholesaler);
  const trialState = getTrialState(wholesaler);

  return {
    onboardingStatus: wholesaler.onboardingStatus,
    rejectionReason: wholesaler.rejectionReason || null,
    subscription: serializeSubscription(currentSubscription),
    trialState,
    featureAccess: buildFeatureAccess(wholesaler),
    supportContact: SUPPORT_CONTACT,
  };
};

export const serializePlanForSeller = (plan, wholesaler) => {
  const base = {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    price: toNumber(plan.price),
    features: plan.features || {},
  };

  if (plan.code === 'TRIAL') {
    return {
      ...base,
      trialMeta: getTrialState(wholesaler),
    };
  }

  return {
    ...base,
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
  };
};

export const assertOperationalWholesaler = (wholesaler) => {
  if (!ACCESSIBLE_SELLER_STATUSES.has(wholesaler.onboardingStatus)) {
    const error = new Error('Wholesaler account is not operational yet.');
    error.statusCode = 403;
    throw error;
  }
};

export const assertManualActivationAllowed = (wholesaler) => {
  if (!MANUAL_ACTIVATION_ALLOWED_STATUSES.has(wholesaler.onboardingStatus)) {
    const error = new Error('This wholesaler is not eligible for manual subscription activation.');
    error.statusCode = 403;
    throw error;
  }
};

export const assertFeatureAccess = (wholesaler, feature) => {
  const featureAccess = buildFeatureAccess(wholesaler);
  if (!featureAccess[feature]) {
    const error = new Error(`Your current subscription does not include ${feature}.`);
    error.statusCode = 403;
    error.featureAccess = featureAccess;
    throw error;
  }
};

const expireCurrentSubscriptions = async (tx, wholesalerId) => {
  await tx.wholesalerSubscription.updateMany({
    where: {
      wholesalerId,
      status: { in: ['ACTIVE', 'PAST_DUE', 'PENDING'] },
    },
    data: { status: 'EXPIRED' },
  });
};

const createSubscriptionAudit = async ({
  tx,
  wholesaler,
  plan,
  durationMonths,
  purchaseMethod,
  startDateTime,
  activationNotes = null,
  externalReference = null,
  paymentId = null,
  activatedByAdmin = false,
}) => {
  const pricing = computePlanPricing(plan, durationMonths);
  const startAt = startDateTime ? new Date(startDateTime) : new Date();
  const endAt = plan.code === 'TRIAL' ? addDays(startAt, 2) : addMonths(startAt, pricing.months);

  await expireCurrentSubscriptions(tx, wholesaler.id);

  const subscription = await tx.wholesalerSubscription.create({
    data: {
      wholesalerId: wholesaler.id,
      planId: plan.id,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      durationMonths: plan.code === 'TRIAL' ? 1 : pricing.months,
      purchaseMethod,
      activatedByAdmin,
      activationNotes,
      externalReference,
      startedAt: startAt,
      currentPeriodStart: startAt,
      currentPeriodEnd: endAt,
      autoRenews: false,
    },
    include: { plan: true },
  });

  if (paymentId) {
    await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        subscriptionId: subscription.id,
        status: 'PAID',
        paidAt: new Date(),
        validUntil: endAt,
        activationNotes,
        externalReference,
      },
    });
  }

  const wholesalerUpdate = {
    activatedAt: startAt,
    rejectedAt: null,
    rejectionReason: null,
  };

  if (purchaseMethod === 'TRIAL') {
    wholesalerUpdate.trialStartedAt = startAt;
    wholesalerUpdate.trialEndsAt = endAt;
    wholesalerUpdate.trialUsedAt = new Date();
  } else if (
    wholesaler.onboardingStatus === 'APPROVED' ||
    wholesaler.onboardingStatus === 'PAST_DUE'
  ) {
    wholesalerUpdate.onboardingStatus = 'ACTIVE';
  }

  await tx.wholesaler.update({
    where: { id: wholesaler.id },
    data: wholesalerUpdate,
  });

  return subscription;
};

export const startFreeTrial = async (db, wholesalerId) => {
  await ensureDefaultSubscriptionPlans(db);

  const wholesaler = await db.wholesaler.findUnique({
    where: { id: wholesalerId },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  if (!wholesaler) {
    const error = new Error('Wholesaler not found');
    error.statusCode = 404;
    throw error;
  }

  if (wholesaler.trialUsedAt) {
    const error = new Error('Free trial already utilised for this account.');
    error.statusCode = 400;
    throw error;
  }

  const currentSubscription = serializeSubscription(getCurrentSubscription(wholesaler));
  if (currentSubscription?.status === 'ACTIVE' && currentSubscription.plan?.code !== 'TRIAL') {
    const error = new Error('A paid subscription is already active for this account.');
    error.statusCode = 400;
    throw error;
  }

  const trialPlan = await db.subscriptionPlan.findUnique({ where: { code: 'TRIAL' } });

  await db.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.create({
      data: {
        wholesalerId,
        planId: trialPlan.id,
        purchaseMethod: 'TRIAL',
        status: 'PAID',
        durationMonths: 1,
        baseAmount: 0,
        discountPercent: 0,
        finalAmount: 0,
        currency: 'INR',
        paidAt: new Date(),
      },
    });

    await createSubscriptionAudit({
      tx,
      wholesaler,
      plan: trialPlan,
      durationMonths: 1,
      purchaseMethod: 'TRIAL',
      paymentId: payment.id,
    });
  });
};

export const createCheckoutForSubscription = async (
  db,
  wholesalerId,
  { planId, durationMonths }
) => {
  await ensureDefaultSubscriptionPlans(db);

  const [wholesaler, plan] = await Promise.all([
    db.wholesaler.findUnique({ where: { id: wholesalerId } }),
    db.subscriptionPlan.findUnique({ where: { id: planId } }),
  ]);

  if (!wholesaler) {
    const error = new Error('Wholesaler not found');
    error.statusCode = 404;
    throw error;
  }

  if (!plan || plan.code === 'TRIAL') {
    const error = new Error('Choose a paid subscription plan.');
    error.statusCode = 400;
    throw error;
  }

  const pricing = computePlanPricing(plan, durationMonths);
  const payment = await db.subscriptionPayment.create({
    data: {
      wholesalerId,
      planId: plan.id,
      purchaseMethod: 'RAZORPAY',
      status: 'PENDING',
      durationMonths: pricing.months,
      baseAmount: pricing.baseAmount,
      discountPercent: pricing.discountPercent,
      finalAmount: pricing.finalAmount,
      currency: 'INR',
    },
  });

  const razorpay = buildRazorpayClient();
  const order = await razorpay.orders.create({
    amount: Math.round(pricing.finalAmount * 100),
    currency: 'INR',
    receipt: `sub_${payment.id.slice(0, 18)}`,
    notes: {
      wholesalerId,
      planCode: plan.code,
      durationMonths: String(pricing.months),
      subscriptionPaymentId: payment.id,
    },
  });

  await db.subscriptionPayment.update({
    where: { id: payment.id },
    data: { razorpayOrderId: order.id },
  });

  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId: order.id,
    amount: order.amount,
    currency: order.currency,
    paymentId: payment.id,
  };
};

export const verifyCheckoutPayment = async (
  db,
  wholesalerId,
  { razorpayOrderId, razorpayPaymentId, razorpaySignature }
) => {
  const payment = await db.subscriptionPayment.findFirst({
    where: { wholesalerId, razorpayOrderId },
    include: { plan: true, wholesaler: true },
  });

  if (!payment) {
    const error = new Error('Subscription checkout session not found.');
    error.statusCode = 404;
    throw error;
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    await db.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        failureReason: 'Invalid Razorpay signature',
        razorpayPaymentId,
        razorpaySignature,
      },
    });

    const error = new Error('Invalid Razorpay payment signature');
    error.statusCode = 400;
    throw error;
  }

  await db.$transaction(async (tx) => {
    await tx.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        razorpayPaymentId,
        razorpaySignature,
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    await createSubscriptionAudit({
      tx,
      wholesaler: payment.wholesaler,
      plan: payment.plan,
      durationMonths: payment.durationMonths,
      purchaseMethod: 'RAZORPAY',
      paymentId: payment.id,
    });
  });
};

export const activateSubscriptionManually = async (
  db,
  wholesalerId,
  { planId, durationMonths, startDateTime, activationNotes, externalReference }
) => {
  await ensureDefaultSubscriptionPlans(db);

  const wholesaler = await db.wholesaler.findUnique({
    where: { id: wholesalerId },
  });

  if (!wholesaler) {
    const error = new Error('Wholesaler not found');
    error.statusCode = 404;
    throw error;
  }

  assertManualActivationAllowed(wholesaler);

  const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.code === 'TRIAL') {
    const error = new Error('Manual activation supports Standard or Premium only.');
    error.statusCode = 400;
    throw error;
  }

  const pricing = computePlanPricing(plan, durationMonths);

  await db.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.create({
      data: {
        wholesalerId,
        planId: plan.id,
        purchaseMethod: 'ADMIN_MANUAL',
        status: 'PAID',
        durationMonths: pricing.months,
        baseAmount: pricing.baseAmount,
        discountPercent: pricing.discountPercent,
        finalAmount: pricing.finalAmount,
        currency: 'INR',
        paidAt: new Date(),
        activationNotes: activationNotes || null,
        externalReference: externalReference || null,
      },
    });

    await createSubscriptionAudit({
      tx,
      wholesaler,
      plan,
      durationMonths: pricing.months,
      purchaseMethod: 'ADMIN_MANUAL',
      paymentId: payment.id,
      startDateTime,
      activationNotes,
      externalReference,
      activatedByAdmin: true,
    });
  });
};

export const buildSellerPlansResponse = async (db, wholesalerId) => {
  await ensureDefaultSubscriptionPlans(db);

  const wholesaler = await db.wholesaler.findUnique({
    where: { id: wholesalerId },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      },
    },
  });

  const plans = await db.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return {
    plans: plans.map((plan) => serializePlanForSeller(plan, wholesaler)),
    supportContact: SUPPORT_CONTACT,
  };
};
