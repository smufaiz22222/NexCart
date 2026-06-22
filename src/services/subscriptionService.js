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
  const subscription = serializeSubscription(currentSubscription);

  let onboardingStatus = wholesaler.onboardingStatus;
  if (
    onboardingStatus === 'ACTIVE' &&
    (!subscription || subscription.status === 'EXPIRED' || subscription.status === 'PAST_DUE')
  ) {
    onboardingStatus = 'PAST_DUE';
  }

  return {
    onboardingStatus,
    rejectionReason: wholesaler.rejectionReason || null,
    subscription,
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
  durationDays = null,
  purchaseMethod,
  startDateTime,
  activationNotes = null,
  externalReference = null,
  paymentId = null,
  activatedByAdmin = false,
  isUpgrade = false,
}) => {
  const startAt = startDateTime ? new Date(startDateTime) : new Date();
  let endAt;
  let months;

  if (durationDays) {
    endAt = addDays(startAt, durationDays);
    months = Math.max(1, Math.round(durationDays / 30));
  } else {
    const pricing = computePlanPricing(plan, durationMonths || 1);
    endAt = plan.code === 'TRIAL' ? addDays(startAt, 2) : addMonths(startAt, pricing.months);
    months = plan.code === 'TRIAL' ? 1 : pricing.months;
  }

  await expireCurrentSubscriptions(tx, wholesaler.id);

  const subscription = await tx.wholesalerSubscription.create({
    data: {
      wholesalerId: wholesaler.id,
      planId: plan.id,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      durationMonths: months,
      purchaseMethod,
      activatedByAdmin,
      activationNotes,
      externalReference,
      startedAt: startAt,
      currentPeriodStart: startAt,
      currentPeriodEnd: endAt,
      autoRenews: false,
      isUpgrade,
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
        isUpgrade,
      },
    });
  }

  const wholesalerUpdate = {
    activatedAt: startAt,
    rejectedAt: null,
    rejectionReason: null,
    onboardingStatus: 'ACTIVE',
  };

  if (purchaseMethod === 'TRIAL') {
    wholesalerUpdate.trialStartedAt = startAt;
    wholesalerUpdate.trialEndsAt = endAt;
    wholesalerUpdate.trialUsedAt = new Date();
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
  { planId, durationMonths, isUpgrade }
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

  let finalAmount;
  let baseAmount;
  let discountPercent;
  let months;

  if (isUpgrade) {
    const upgradeDetails = await getSubscriptionUpgradeDetails(db, wholesalerId);
    if (!upgradeDetails.isEligible) {
      const error = new Error(upgradeDetails.reason);
      error.statusCode = 400;
      throw error;
    }
    finalAmount = upgradeDetails.diffAmount;
    baseAmount = upgradeDetails.diffAmount;
    discountPercent = 0;
    months = Math.max(1, Math.ceil(upgradeDetails.remainingDays / 30));
  } else {
    const pricing = computePlanPricing(plan, durationMonths);
    finalAmount = pricing.finalAmount;
    baseAmount = pricing.baseAmount;
    discountPercent = pricing.discountPercent;
    months = pricing.months;
  }

  const payment = await db.subscriptionPayment.create({
    data: {
      wholesalerId,
      planId: plan.id,
      purchaseMethod: 'RAZORPAY',
      status: 'PENDING',
      durationMonths: months,
      baseAmount,
      discountPercent,
      finalAmount,
      currency: 'INR',
      isUpgrade: isUpgrade || false,
    },
  });

  const razorpay = buildRazorpayClient();
  const order = await razorpay.orders.create({
    amount: Math.round(finalAmount * 100),
    currency: 'INR',
    receipt: `sub_${payment.id.slice(0, 18)}`,
    notes: {
      wholesalerId,
      planCode: plan.code,
      durationMonths: String(months),
      subscriptionPaymentId: payment.id,
      isUpgrade: isUpgrade ? 'true' : 'false',
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

    if (payment.isUpgrade) {
      const activeSub = await tx.wholesalerSubscription.findFirst({
        where: {
          wholesalerId,
          status: 'ACTIVE',
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      });

      let durationDays = null;
      if (activeSub) {
        const now = new Date();
        const currentPeriodEnd = new Date(activeSub.currentPeriodEnd);
        durationDays = Math.max(1, Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24)));
      }

      await createSubscriptionAudit({
        tx,
        wholesaler: payment.wholesaler,
        plan: payment.plan,
        durationMonths: payment.durationMonths,
        durationDays,
        purchaseMethod: 'RAZORPAY',
        paymentId: payment.id,
        isUpgrade: true,
        activationNotes: 'Upgraded to Premium via difference payment.',
      });
    } else {
      await createSubscriptionAudit({
        tx,
        wholesaler: payment.wholesaler,
        plan: payment.plan,
        durationMonths: payment.durationMonths,
        purchaseMethod: 'RAZORPAY',
        paymentId: payment.id,
      });
    }
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

export const validateCouponCode = async (db, code, wholesalerId = null) => {
  if (!code) {
    const error = new Error('Coupon code is required.');
    error.statusCode = 400;
    throw error;
  }

  const coupon = await db.coupon.findFirst({
    where: {
      code: {
        equals: code.trim(),
        mode: 'insensitive',
      },
    },
    include: { plan: true },
  });

  if (!coupon) {
    const error = new Error('Invalid coupon code.');
    error.statusCode = 404;
    throw error;
  }

  if (coupon.isUsed) {
    const error = new Error('This coupon has already been used.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date(coupon.expiryDate) < new Date()) {
    const error = new Error('This coupon has expired.');
    error.statusCode = 400;
    throw error;
  }

  if (coupon.isUpgrade && wholesalerId) {
    const wholesaler = await db.wholesaler.findUnique({
      where: { id: wholesalerId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    const activeSub = getCurrentSubscription(wholesaler);
    const status = getEffectiveSubscriptionStatus(activeSub);

    if (!activeSub || status !== 'ACTIVE' || activeSub.plan?.code !== 'STANDARD') {
      const error = new Error('This upgrade coupon is only valid for wholesalers with an active Standard subscription.');
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    id: coupon.id,
    code: coupon.code,
    durationDays: coupon.durationDays,
    expiryDate: coupon.expiryDate,
    isUpgrade: coupon.isUpgrade,
    plan: {
      id: coupon.plan.id,
      code: coupon.plan.code,
      name: coupon.plan.name,
      description: coupon.plan.description,
      features: coupon.plan.features || {},
    },
  };
};

export const activateCouponSubscription = async (db, wholesalerId, code) => {
  const couponDetails = await validateCouponCode(db, code, wholesalerId);

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
    const error = new Error('Wholesaler profile not found.');
    error.statusCode = 404;
    throw error;
  }

  const plan = await db.subscriptionPlan.findUnique({
    where: { id: couponDetails.plan.id },
  });

  let subscription;

  await db.$transaction(async (tx) => {
    // Double check used status inside transaction for concurrency safety
    const txCoupon = await tx.coupon.findUnique({
      where: { id: couponDetails.id },
    });

    if (txCoupon.isUsed) {
      const error = new Error('This coupon has already been used.');
      error.statusCode = 400;
      throw error;
    }

    // Mark coupon as used
    await tx.coupon.update({
      where: { id: couponDetails.id },
      data: {
        isUsed: true,
        usedById: wholesalerId,
        usedAt: new Date(),
      },
    });

    let durationDays = couponDetails.durationDays;
    let baseAmount = plan.price;
    let discountPercent = 100;
    let finalAmount = 0;

    if (couponDetails.isUpgrade) {
      const activeSub = getCurrentSubscription(wholesaler);
      if (activeSub) {
        const now = new Date();
        const currentPeriodEnd = new Date(activeSub.currentPeriodEnd);
        durationDays = Math.max(1, Math.ceil((currentPeriodEnd - now) / (1000 * 60 * 60 * 24)));
      }
      baseAmount = 0;
      discountPercent = 0;
      finalAmount = 0;
    }

    // Create free subscription payment record for audit log
    const payment = await tx.subscriptionPayment.create({
      data: {
        wholesalerId,
        planId: plan.id,
        purchaseMethod: 'COUPON',
        status: 'PAID',
        durationMonths: Math.max(1, Math.round(durationDays / 30)),
        baseAmount,
        discountPercent,
        finalAmount,
        currency: 'INR',
        paidAt: new Date(),
        activationNotes: couponDetails.isUpgrade
          ? `Upgraded to Premium via Coupon: ${couponDetails.code}`
          : `Coupon applied: ${couponDetails.code}`,
        externalReference: couponDetails.code,
        isUpgrade: couponDetails.isUpgrade || false,
      },
    });

    // Create the active subscription
    subscription = await createSubscriptionAudit({
      tx,
      wholesaler,
      plan,
      durationMonths: Math.max(1, Math.round(durationDays / 30)),
      durationDays: durationDays,
      purchaseMethod: 'COUPON',
      paymentId: payment.id,
      activationNotes: couponDetails.isUpgrade
        ? `Activated via Upgrade Coupon: ${couponDetails.code}`
        : `Activated via Coupon: ${couponDetails.code}`,
      externalReference: couponDetails.code,
      isUpgrade: couponDetails.isUpgrade || false,
    });
  });

  return subscription;
};

export const checkAndExpireSubscription = async (db, wholesaler) => {
  if (!wholesaler || !wholesaler.subscriptions) return wholesaler;

  const currentSubscription = getCurrentSubscription(wholesaler);
  if (!currentSubscription || currentSubscription.status !== 'ACTIVE') return wholesaler;

  const now = new Date();
  const endsAt = currentSubscription.currentPeriodEnd
    ? new Date(currentSubscription.currentPeriodEnd)
    : null;

  if (endsAt && now > endsAt) {
    const targetStatus = currentSubscription.plan?.code === 'TRIAL' ? 'EXPIRED' : 'PAST_DUE';

    await db.$transaction(async (tx) => {
      await tx.wholesalerSubscription.update({
        where: { id: currentSubscription.id },
        data: { status: targetStatus },
      });

      await tx.wholesaler.update({
        where: { id: wholesaler.id },
        data: { onboardingStatus: 'PAST_DUE' },
      });
    });

    return db.wholesaler.findUnique({
      where: { id: wholesaler.id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });
  }

  return wholesaler;
};

export const getSubscriptionUpgradeDetails = async (db, wholesalerId) => {
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

  const currentSub = getCurrentSubscription(wholesaler);
  const status = getEffectiveSubscriptionStatus(currentSub);

  if (!currentSub || status !== 'ACTIVE' || currentSub.plan?.code !== 'STANDARD') {
    return {
      isEligible: false,
      reason: 'Only wholesalers with an active Standard subscription can upgrade.',
    };
  }

  const now = new Date();
  const currentPeriodEnd = new Date(currentSub.currentPeriodEnd);
  const currentPeriodStart = new Date(currentSub.currentPeriodStart);

  const totalMs = currentPeriodEnd - currentPeriodStart;
  const remainingMs = currentPeriodEnd - now;

  if (remainingMs <= 0) {
    return {
      isEligible: false,
      reason: 'Your subscription has expired or is about to expire.',
    };
  }

  const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  const plans = await db.subscriptionPlan.findMany({
    where: { code: { in: ['STANDARD', 'PREMIUM'] } },
  });

  const standardPlan = plans.find((p) => p.code === 'STANDARD');
  const premiumPlan = plans.find((p) => p.code === 'PREMIUM');

  if (!standardPlan || !premiumPlan) {
    const error = new Error('Subscription plans are not fully configured.');
    error.statusCode = 500;
    throw error;
  }

  const lastPayment = await db.subscriptionPayment.findFirst({
    where: {
      subscriptionId: currentSub.id,
      status: 'PAID',
    },
    orderBy: { paidAt: 'desc' },
  });

  let paidAmount = 0;
  if (lastPayment) {
    paidAmount = Number(lastPayment.finalAmount);
  } else {
    paidAmount = computePlanPricing(standardPlan, currentSub.durationMonths).finalAmount;
  }

  const remainingStandardValue = Number((paidAmount * (remainingDays / totalDays)).toFixed(2));

  const premiumTotalValue = computePlanPricing(premiumPlan, currentSub.durationMonths).finalAmount;
  const premiumValueForRemaining = Number((premiumTotalValue * (remainingDays / totalDays)).toFixed(2));

  const diffAmount = Math.max(0, Number((premiumValueForRemaining - remainingStandardValue).toFixed(2)));

  return {
    isEligible: true,
    remainingDays,
    totalDays,
    diffAmount,
    currentPlan: {
      id: standardPlan.id,
      code: 'STANDARD',
      name: standardPlan.name,
    },
    targetPlan: {
      id: premiumPlan.id,
      code: 'PREMIUM',
      name: premiumPlan.name,
    },
  };
};
