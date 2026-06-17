import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  BrainCircuit,
  Camera,
  CreditCard,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import apiClient from '../api/axios';
import useAuthStore from '../store/authStore';

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

const featureMeta = {
  advisor: { label: 'Business Advisor', icon: BrainCircuit },
  khatta: { label: 'AI Khatta', icon: Camera },
  analytics: { label: 'Advanced Analytics', icon: Activity },
  recommendations: { label: 'Recommendation Insights', icon: Sparkles },
};

const statusTone = {
  ACTIVE: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  APPROVED: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
  PAST_DUE: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
  APPLIED: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
  UNDER_REVIEW: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
  REJECTED: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
  SUSPENDED: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : 'Not scheduled');

export default function WholesalerBilling() {
  const { user, setUser } = useAuthStore();
  const supportCardRef = useRef(null);
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [supportContact, setSupportContact] = useState(null);
  const [showSupportContact, setShowSupportContact] = useState(false);
  const [selectedDurations, setSelectedDurations] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');

  const refreshBilling = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [plansResponse, summaryResponse, paymentsResponse] = await Promise.all([
        apiClient.get('/subscriptions/plans'),
        apiClient.get('/subscriptions/me'),
        apiClient.get('/subscriptions/payments'),
      ]);

      const loadedPlans = plansResponse.data.plans || [];
      setPlans(loadedPlans);
      setSummary(summaryResponse.data);
      setPayments(paymentsResponse.data.payments || []);
      setSupportContact(
        plansResponse.data.supportContact || summaryResponse.data.supportContact || null
      );
      setSelectedDurations((current) => {
        const next = { ...current };
        loadedPlans.forEach((plan) => {
          if (!next[plan.id] && plan.purchaseOptions?.[0]?.months) {
            next[plan.id] = plan.purchaseOptions[0].months;
          }
        });
        return next;
      });
    } catch (fetchError) {
      console.error('Failed to load billing data:', fetchError);
      setError(fetchError.response?.data?.error || 'Failed to load billing data.');
    } finally {
      setIsLoading(false);
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
      setBusyAction(`razorpay:${plan.id}`);
      setError('');

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        throw new Error('Failed to load Razorpay checkout.');
      }

      const checkoutResponse = await apiClient.post('/subscriptions/checkout', {
        planId: plan.id,
        durationMonths: selectedOption.months,
      });

      const { keyId, razorpayOrderId, amount, currency } = checkoutResponse.data;
      const razorpay = new window.Razorpay({
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'NexCart Seller Billing',
        description: `${plan.name} · ${selectedOption.label}`,
        order_id: razorpayOrderId,
        handler: async (response) => {
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

      razorpay.on('payment.failed', async (event) => {
        setError(event.error?.description || 'Subscription payment failed.');
        await refreshBilling();
      });

      razorpay.open();
    } catch (checkoutError) {
      console.error('Subscription checkout failed:', checkoutError);
      setError(
        checkoutError.response?.data?.error ||
          checkoutError.message ||
          'Failed to start billing checkout.'
      );
    } finally {
      setBusyAction('');
    }
  };

  const handleSupportRequest = () => {
    setError('');
    setShowSupportContact(true);
    window.requestAnimationFrame(() => {
      supportCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleStartTrial = async () => {
    try {
      setBusyAction('trial:start');
      setError('');
      const response = await apiClient.post('/subscriptions/trial/start');
      updateSessionFromBilling(response.data);
      await refreshBilling();
    } catch (trialError) {
      console.error('Failed to activate free trial:', trialError);
      setError(trialError.response?.data?.error || 'Failed to activate free trial.');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="space-y-6 text-white">
      <section className="overflow-hidden rounded-[30px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(135deg,_#171717,_#09090b)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
              Seller billing
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Choose a plan, lock a duration, and pay your way.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              Start a one-time 2-day free trial, activate paid subscriptions instantly through
              Razorpay, or use the support payment route for offline confirmation.
            </p>
          </div>
          <div
            className={`rounded-[24px] border px-5 py-4 ${statusTone[summary?.onboardingStatus || user?.wholesalerProfile?.onboardingStatus] || statusTone.APPLIED}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
              Current seller state
            </p>
            <p className="mt-2 text-xl font-black text-white">
              {summary?.onboardingStatus || user?.wholesalerProfile?.onboardingStatus || 'UNKNOWN'}
            </p>
            <p className="mt-2 text-sm text-white/75">
              {summary?.subscription?.plan?.name
                ? `${summary.subscription.plan.name}${summary.subscription.plan.code === 'TRIAL' ? ' · 2 days' : ` · ${summary.subscription.durationMonths || 1} month${summary.subscription.durationMonths > 1 ? 's' : ''}`}`
                : 'No active paid plan yet'}
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(featureMeta).map(([key, meta]) => {
          const Icon = meta.icon;
          const enabled = Boolean(currentFeatures[key]);
          return (
            <div
              key={key}
              className={`rounded-[24px] border p-5 ${enabled ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-zinc-800 bg-[#171717]'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
                    {meta.label}
                  </p>
                  <p
                    className={`mt-3 text-lg font-black ${enabled ? 'text-emerald-200' : 'text-white'}`}
                  >
                    {enabled ? 'Unlocked' : 'Locked'}
                  </p>
                </div>
                <div
                  className={`rounded-2xl border p-3 ${enabled ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {trialPlan ? (
            <div className="rounded-[28px] border border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_28%),linear-gradient(135deg,_#121a17,_#080b09)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-emerald-300/70">
                    Free trial
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">{trialPlan.name}</h2>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{trialPlan.description}</p>
                  <div className="mt-4 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                    <PriceRow label="Duration" value="2 days" />
                    <PriceRow
                      label="Status"
                      value={
                        trialMeta?.active
                          ? 'Active now'
                          : trialMeta?.used
                            ? 'Free trial utilised'
                            : 'Available'
                      }
                    />
                    <PriceRow label="Started" value={formatDateTime(trialMeta?.startedAt)} />
                    <PriceRow label="Valid Until" value={formatDateTime(trialMeta?.endsAt)} />
                  </div>
                </div>
                <div className="w-full max-w-sm rounded-[24px] border border-emerald-400/15 bg-black/20 p-4">
                  <div className="space-y-2 text-sm">
                    {Object.entries(trialPlan.features || {}).map(([key, enabled]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-3 py-2"
                      >
                        <span className="text-zinc-300">{featureMeta[key]?.label || key}</span>
                        <span className={enabled ? 'text-emerald-300' : 'text-zinc-500'}>
                          {enabled ? 'Included' : 'No'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleStartTrial}
                    disabled={Boolean(
                      trialMeta?.used || trialMeta?.active || busyAction === 'trial:start'
                    )}
                    className="mt-4 flex w-full items-center justify-center rounded-full bg-emerald-400 px-4 py-3 text-sm font-black text-[#111111] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {trialMeta?.active
                      ? 'Trial active'
                      : trialMeta?.used
                        ? 'Free trial utilised'
                        : busyAction === 'trial:start'
                          ? 'Starting free trial...'
                          : 'Start Free Trial'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-[28px] border border-zinc-800 bg-[#171717] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-white">Plan catalog</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Select duration first, then pay through Razorpay or open the support payment card
                  for Standard and Premium.
                </p>
              </div>
              {isLoading ? <Activity className="h-5 w-5 animate-pulse text-amber-400" /> : null}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {paidPlans.map((plan) => {
                const isCurrent =
                  summary?.subscription?.plan?.code === plan.code &&
                  summary?.subscription?.status === 'ACTIVE';
                const selectedOption = resolvePurchaseOption(plan);

                return (
                  <div
                    key={plan.id}
                    className={`rounded-[24px] border p-5 ${isCurrent ? 'border-amber-500/25 bg-amber-500/10' : 'border-zinc-800 bg-[#101010]'}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
                      {plan.code}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-white">{plan.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">{plan.description}</p>
                    <div className="mt-4 text-3xl font-black text-white">
                      ₹{Number(selectedOption?.finalAmount || plan.price || 0).toLocaleString()}
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {selectedOption?.label || '1 month'}
                      {selectedOption?.discountPercent
                        ? ` · ${selectedOption.discountPercent}% off`
                        : ''}
                    </p>

                    <div className="mt-5 rounded-[22px] border border-zinc-800 bg-black/20 p-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
                        Duration
                      </label>
                      <select
                        value={selectedDurations[plan.id] || selectedOption?.months || 1}
                        onChange={(event) => handleDurationChange(plan.id, event.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none"
                      >
                        {(plan.purchaseOptions || []).map((option) => (
                          <option key={`${plan.id}-${option.months}`} value={option.months}>
                            {option.label}{' '}
                            {option.discountPercent ? `(${option.discountPercent}% off)` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3 space-y-2 text-sm">
                        <PriceRow
                          label="Base total"
                          value={`₹${Number(selectedOption?.baseAmount || 0).toLocaleString()}`}
                        />
                        <PriceRow
                          label="Discount"
                          value={`${selectedOption?.discountPercent || 0}%`}
                        />
                        <PriceRow
                          label="Final total"
                          value={`₹${Number(selectedOption?.finalAmount || 0).toLocaleString()}`}
                          highlight
                        />
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      {Object.entries(plan.features || {}).map(([key, enabled]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/20 px-3 py-2 text-sm"
                        >
                          <span className="text-zinc-300">{featureMeta[key]?.label || key}</span>
                          <span className={enabled ? 'text-emerald-300' : 'text-zinc-500'}>
                            {enabled ? 'Included' : 'No'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 space-y-3">
                      <button
                        type="button"
                        onClick={() => handleRazorpayPurchase(plan)}
                        disabled={busyAction === `razorpay:${plan.id}` || isCurrent}
                        className="flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-black text-[#111111] transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        {isCurrent
                          ? 'Current plan'
                          : busyAction === `razorpay:${plan.id}`
                            ? 'Opening Razorpay...'
                            : 'Pay with Razorpay'}
                      </button>

                      <button
                        type="button"
                        onClick={handleSupportRequest}
                        className="flex w-full items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 px-4 py-3 text-sm font-black text-sky-100 transition hover:bg-sky-400/15"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Pay via Support
                      </button>

                      {supportContact ? (
                        <div className="flex items-center justify-center gap-3">
                          <a
                            href={`mailto:${supportContact.email}`}
                            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-400/15"
                            aria-label="Email support"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                          <a
                            href={`tel:${supportContact.phone.replace(/\s+/g, '')}`}
                            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-400/15"
                            aria-label="Call support"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-zinc-800 bg-[#171717] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <h2 className="text-xl font-black tracking-tight text-white">Current subscription</h2>
            <div className="mt-5 space-y-3">
              <InfoRow label="Plan" value={summary?.subscription?.plan?.name || 'Not activated'} />
              <InfoRow
                label="Duration"
                value={
                  summary?.subscription?.plan?.code === 'TRIAL'
                    ? '2 days'
                    : summary?.subscription?.durationMonths
                      ? `${summary.subscription.durationMonths} months`
                      : 'Not selected'
                }
              />
              <InfoRow label="Status" value={summary?.subscription?.status || 'Pending'} />
              <InfoRow
                label="Valid Until"
                value={
                  summary?.subscription?.currentPeriodEnd
                    ? formatDateTime(summary.subscription.currentPeriodEnd)
                    : 'Not scheduled'
                }
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-[#171717] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <div
              ref={supportCardRef}
              className={`rounded-[26px] border p-5 transition-all duration-300 ${
                showSupportContact
                  ? 'border-sky-400/25 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_34%),linear-gradient(135deg,_rgba(10,18,28,0.95),_rgba(8,12,18,0.92))] shadow-[0_20px_45px_rgba(8,47,73,0.28)]'
                  : 'border-zinc-800 bg-black/20'
              }`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-sky-200/80">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Payment Support
                  </div>
                  <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
                    Support payment card
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">
                    Reach support when you want to pay the super admin directly. No backend request
                    is created here. After payment confirmation, your subscription is activated
                    manually from the admin dashboard.
                  </p>
                  {showSupportContact ? (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      Support details opened below
                    </div>
                  ) : (
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
                      Click any plan&apos;s support button to jump here
                    </p>
                  )}
                </div>

                <div className="grid w-full gap-3 lg:max-w-sm">
                  <SupportContactCard
                    icon={Phone}
                    label="Call support"
                    value={supportContact?.phone || 'Not available'}
                    href={
                      supportContact?.phone
                        ? `tel:${supportContact.phone.replace(/\s+/g, '')}`
                        : null
                    }
                    tone="emerald"
                  />
                  <SupportContactCard
                    icon={Mail}
                    label="Email support"
                    value={supportContact?.email || 'Not available'}
                    href={supportContact?.email ? `mailto:${supportContact.email}` : null}
                    tone="sky"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-black tracking-tight text-white">
                Support payment route
              </h2>
              <div className="mt-5 space-y-3">
                <InfoRow label="Phone" value={supportContact?.phone || 'Not available'} />
                <InfoRow label="Email" value={supportContact?.email || 'Not available'} />
                <div className="rounded-[20px] border border-zinc-800 bg-black/20 p-4 text-sm text-zinc-400">
                  Use this option when you want to pay the super admin directly. Clicking `Pay via
                  Support` stays on this page and jumps to this card, while the round buttons give
                  you direct email and call actions.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-[#171717] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
            <h2 className="text-xl font-black tracking-tight text-white">Billing history</h2>
            <div className="mt-5 space-y-3">
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-[22px] border border-zinc-800 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {payment.plan?.name || 'Plan payment'} · {payment.durationMonths} month
                          {payment.durationMonths > 1 ? 's' : ''}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {new Date(payment.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                          payment.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : payment.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-300'
                              : 'bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <PriceRow label="Purchase Method" value={payment.purchaseMethod} />
                      <PriceRow
                        label="Base Amount"
                        value={`₹${Number(payment.baseAmount || 0).toLocaleString()}`}
                      />
                      <PriceRow label="Discount" value={`${payment.discountPercent || 0}%`} />
                      <PriceRow
                        label="Final Amount"
                        value={`₹${Number(payment.finalAmount || payment.amount || 0).toLocaleString()}`}
                        highlight
                      />
                      <PriceRow
                        label="Valid Until"
                        value={
                          payment.validUntil
                            ? new Date(payment.validUntil).toLocaleDateString()
                            : 'Pending activation'
                        }
                      />
                    </div>
                    {payment.failureReason ? (
                      <p className="mt-3 text-xs text-rose-300">{payment.failureReason}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-zinc-700 p-5 text-sm text-zinc-500">
                  No billing records yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-[20px] border border-zinc-800 bg-black/20 px-4 py-3 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function PriceRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className={highlight ? 'font-black text-amber-300' : 'font-semibold text-white'}>
        {value}
      </span>
    </div>
  );
}

function SupportContactCard({ icon: Icon, label, value, href, tone }) {
  const tones = {
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    sky: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  };

  const content = (
    <div
      className={`rounded-[22px] border p-4 transition ${tones[tone]} ${href ? 'hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">{label}</p>
          <p className="mt-2 break-all text-sm font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );

  if (!href) return content;
  return (
    <a href={href} className="block">
      {content}
    </a>
  );
}
