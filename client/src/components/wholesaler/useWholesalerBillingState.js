import { useEffect, useMemo, useRef, useState, useReducer } from 'react';
import { Activity, BrainCircuit, Camera, Sparkles } from 'lucide-react';
import apiClient from '../../api/axios';
import useAuthStore from '../../store/authStore';

export const featureMeta = {
  advisor: { label: 'Business Advisor', icon: BrainCircuit },
  khatta: { label: 'AI Khatta', icon: Camera },
  analytics: { label: 'Advanced Analytics', icon: Activity },
  recommendations: { label: 'Recommendation Insights', icon: Sparkles },
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString() : 'Not scheduled';

const initialBillingState = {
  plans: [],
  summary: null,
  payments: [],
  supportContact: null,
  isLoading: true,
  busyAction: '',
  error: '',
  upgradeDetails: null,
};

function billingReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: '' };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        plans: action.payload.plans,
        summary: action.payload.summary,
        payments: action.payload.payments,
        supportContact: action.payload.supportContact,
      };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_BUSY':
      return { ...state, busyAction: action.payload, error: '' };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_UPGRADE_DETAILS':
      return { ...state, upgradeDetails: action.payload };
    case 'UPDATE_SUMMARY':
      return { ...state, summary: action.payload };
    default:
      return state;
  }
}

export function useWholesalerBillingState() {
  const { user, setUser } = useAuthStore();
  const supportCardRef = useRef(null);
  const [billingState, dispatchBilling] = useReducer(billingReducer, initialBillingState);
  const [showSupportContact, setShowSupportContact] = useState(false);
  const [selectedDurations, setSelectedDurations] = useState({});
  const [coupon, setCoupon] = useState({
    code: '',
    validated: null,
    error: '',
  });

  const { plans, summary, payments, supportContact, isLoading, busyAction, error, upgradeDetails } =
    billingState;

  const { code: couponCode, validated: validatedCoupon, error: couponError } = coupon;

  const refreshBilling = async () => {
    try {
      dispatchBilling({ type: 'FETCH_START' });
      const [plansResponse, summaryResponse, paymentsResponse] = await Promise.all([
        apiClient.get('/subscriptions/plans'),
        apiClient.get('/subscriptions/me'),
        apiClient.get('/subscriptions/payments'),
      ]);

      const loadedPlans = plansResponse.data.plans || [];
      const loadedSummary = summaryResponse.data;
      dispatchBilling({
        type: 'FETCH_SUCCESS',
        payload: {
          plans: loadedPlans,
          summary: loadedSummary,
          payments: paymentsResponse.data.payments || [],
          supportContact: plansResponse.data.supportContact || loadedSummary.supportContact || null,
        },
      });
      setSelectedDurations((current) => {
        const next = { ...current };
        loadedPlans.forEach((plan) => {
          if (!next[plan.id] && plan.purchaseOptions?.[0]?.months) {
            next[plan.id] = plan.purchaseOptions[0].months;
          }
        });
        return next;
      });

      if (
        loadedSummary?.subscription?.plan?.code === 'STANDARD' &&
        loadedSummary?.subscription?.status === 'ACTIVE'
      ) {
        try {
          const upgradeResponse = await apiClient.get('/subscriptions/upgrade-details');
          dispatchBilling({ type: 'SET_UPGRADE_DETAILS', payload: upgradeResponse.data });
        } catch (upgradeErr) {
          console.error('Failed to load upgrade details:', upgradeErr);
          dispatchBilling({ type: 'SET_UPGRADE_DETAILS', payload: null });
        }
      } else {
        dispatchBilling({ type: 'SET_UPGRADE_DETAILS', payload: null });
      }
    } catch (fetchError) {
      console.error('Failed to load billing data:', fetchError);
      dispatchBilling({
        type: 'FETCH_ERROR',
        payload: fetchError.response?.data?.error || 'Failed to load billing data.',
      });
    }
  };

  useEffect(() => {
    refreshBilling();
  }, []);

  const currentFeatures = useMemo(
    () => summary?.featureAccess || user?.featureAccess || {},
    [summary, user]
  );
  const trialPlan = useMemo(() => plans.find((plan) => plan.code === 'TRIAL') || null, [plans]);
  const paidPlans = useMemo(() => plans.filter((plan) => plan.code !== 'TRIAL'), [plans]);
  const trialMeta = summary?.trialState || trialPlan?.trialMeta || null;

  const updateSessionFromBilling = (nextSummary) => {
    if (!user) return;

    const nextUser = {
      ...user,
      featureAccess: nextSummary.featureAccess,
      subscription: nextSummary.subscription,
      wholesalerProfile: {
        ...(user.wholesalerProfile || {}),
        onboardingStatus: nextSummary.onboardingStatus,
        rejectionReason: nextSummary.rejectionReason || null,
        trialStartedAt: nextSummary.trialState?.startedAt || null,
        trialEndsAt: nextSummary.trialState?.endsAt || null,
        trialUsedAt: nextSummary.trialState?.usedAt || null,
      },
    };

    setUser(nextUser);
    dispatchBilling({ type: 'UPDATE_SUMMARY', payload: nextSummary });
  };

  const resolvePurchaseOption = (plan) => {
    const durationMonths = selectedDurations[plan.id] || plan.purchaseOptions?.[0]?.months || 1;
    return (
      plan.purchaseOptions?.find((option) => option.months === durationMonths) ||
      plan.purchaseOptions?.[0] ||
      null
    );
  };

  const handleDurationChange = (planId, durationMonths) => {
    setSelectedDurations((current) => ({ ...current, [planId]: Number(durationMonths) }));
  };

  const handleRazorpayPurchase = async (plan) => {
    const selectedOption = resolvePurchaseOption(plan);
    if (!selectedOption) return;

    try {
      dispatchBilling({ type: 'SET_BUSY', payload: `razorpay:${plan.id}` });
      dispatchBilling({ type: 'SET_ERROR', payload: '' });

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        throw new Error('Failed to load Razorpay checkout.');
      }

      const checkoutResponse = await apiClient.post('/subscriptions/checkout', {
        planId: plan.id,
        durationMonths: selectedOption.months,
      });

      const { keyId, razorpayOrderId, amount, currency } = checkoutResponse.data;
      let razorpay;
      const handlePaymentFailed = async (event) => {
        try {
          razorpay.off('payment.failed', handlePaymentFailed);
        } catch {
          // ignore
        }
        dispatchBilling({
          type: 'SET_ERROR',
          payload: event.error?.description || 'Subscription payment failed.',
        });
        await refreshBilling();
      };

      razorpay = new window.Razorpay({
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'NexCart Seller Billing',
        description: `${plan.name} · ${selectedOption.label}`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            razorpay.off('payment.failed', handlePaymentFailed);
          } catch {
            // ignore
          }
          const verifyResponse = await apiClient.post('/subscriptions/verify', {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          updateSessionFromBilling(verifyResponse.data);
          await refreshBilling();
        },
        theme: {
          color: '#f59e0b',
        },
      });

      razorpay.on('payment.failed', handlePaymentFailed);

      razorpay.open();
    } catch (checkoutError) {
      console.error('Subscription checkout failed:', checkoutError);
      dispatchBilling({
        type: 'SET_ERROR',
        payload:
          checkoutError.response?.data?.error ||
          checkoutError.message ||
          'Failed to start billing checkout.',
      });
    } finally {
      dispatchBilling({ type: 'SET_BUSY', payload: '' });
    }
  };

  const handleUpgradePurchase = async () => {
    if (!upgradeDetails || !upgradeDetails.isEligible) return;

    try {
      dispatchBilling({ type: 'SET_BUSY', payload: 'upgrade:checkout' });
      dispatchBilling({ type: 'SET_ERROR', payload: '' });

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        throw new Error('Failed to load Razorpay checkout.');
      }

      const checkoutResponse = await apiClient.post('/subscriptions/checkout', {
        planId: upgradeDetails.targetPlan.id,
        isUpgrade: true,
      });

      const { keyId, razorpayOrderId, amount, currency } = checkoutResponse.data;
      let razorpay;
      const handlePaymentFailed = async (event) => {
        try {
          razorpay.off('payment.failed', handlePaymentFailed);
        } catch {
          // ignore
        }
        dispatchBilling({
          type: 'SET_ERROR',
          payload: event.error?.description || 'Upgrade payment failed.',
        });
        await refreshBilling();
      };

      razorpay = new window.Razorpay({
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'NexCart Seller Upgrade',
        description: `Upgrade to ${upgradeDetails.targetPlan.name} · ${upgradeDetails.remainingDays} days`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            razorpay.off('payment.failed', handlePaymentFailed);
          } catch {
            // ignore
          }
          const verifyResponse = await apiClient.post('/subscriptions/verify', {
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          updateSessionFromBilling(verifyResponse.data);
          await refreshBilling();
        },
        theme: {
          color: '#bc6c25',
        },
      });

      razorpay.on('payment.failed', handlePaymentFailed);

      razorpay.open();
    } catch (checkoutError) {
      console.error('Upgrade checkout failed:', checkoutError);
      dispatchBilling({
        type: 'SET_ERROR',
        payload:
          checkoutError.response?.data?.error ||
          checkoutError.message ||
          'Failed to start upgrade checkout.',
      });
    } finally {
      dispatchBilling({ type: 'SET_BUSY', payload: '' });
    }
  };

  const handleSupportRequest = () => {
    dispatchBilling({ type: 'SET_ERROR', payload: '' });
    setShowSupportContact(true);
    window.requestAnimationFrame(() => {
      supportCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleStartTrial = async () => {
    try {
      dispatchBilling({ type: 'SET_BUSY', payload: 'trial:start' });
      dispatchBilling({ type: 'SET_ERROR', payload: '' });
      const response = await apiClient.post('/subscriptions/trial/start');
      updateSessionFromBilling(response.data);
      await refreshBilling();
    } catch (trialError) {
      console.error('Failed to activate free trial:', trialError);
      dispatchBilling({
        type: 'SET_ERROR',
        payload: trialError.response?.data?.error || 'Failed to activate free trial.',
      });
    } finally {
      dispatchBilling({ type: 'SET_BUSY', payload: '' });
    }
  };

  const handleValidateCoupon = async () => {
    try {
      dispatchBilling({ type: 'SET_BUSY', payload: 'coupon:validate' });
      setCoupon((prev) => ({ ...prev, error: '' }));
      setCoupon((prev) => ({ ...prev, validated: null }));
      const response = await apiClient.post('/subscriptions/coupons/validate', {
        code: couponCode,
      });
      setCoupon((prev) => ({ ...prev, validated: response.data }));
    } catch (err) {
      setCoupon((prev) => ({
        ...prev,
        error: err.response?.data?.error || 'Invalid coupon code.',
      }));
    } finally {
      dispatchBilling({ type: 'SET_BUSY', payload: '' });
    }
  };

  const handleActivateCoupon = async () => {
    try {
      dispatchBilling({ type: 'SET_BUSY', payload: 'coupon:redeem' });
      setCoupon((prev) => ({ ...prev, error: '' }));
      const response = await apiClient.post('/subscriptions/coupons/activate', {
        code: couponCode,
      });
      updateSessionFromBilling(response.data);
      await refreshBilling();
      setCoupon({
        code: '',
        validated: null,
        error: '',
      });
    } catch (err) {
      setCoupon((prev) => ({
        ...prev,
        error: err.response?.data?.error || 'Failed to activate coupon subscription.',
      }));
    } finally {
      dispatchBilling({ type: 'SET_BUSY', payload: '' });
    }
  };

  return {
    user,
    supportCardRef,
    showSupportContact,
    selectedDurations,
    coupon,
    setCoupon,
    plans,
    summary,
    payments,
    supportContact,
    isLoading,
    busyAction,
    error,
    upgradeDetails,
    couponCode,
    validatedCoupon,
    couponError,
    currentFeatures,
    trialPlan,
    paidPlans,
    trialMeta,
    resolvePurchaseOption,
    handleDurationChange,
    handleRazorpayPurchase,
    handleUpgradePurchase,
    handleSupportRequest,
    handleStartTrial,
    handleValidateCoupon,
    handleActivateCoupon,
  };
}
