import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeIndianRupee,
  Building2,
  CalendarClock,
  Clock,
  CreditCard,
  FileText,
  History,
  Inbox,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/axios';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
};

const createDefaultStartDateTime = () => {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const filters = [
  { value: 'ALL', label: 'All Sellers' },
  { value: 'READY', label: 'Ready' },
  { value: 'PAID', label: 'Paid Active' },
  { value: 'TRIAL', label: 'Trial Active' },
  { value: 'PAST_DUE', label: 'Past Due' },
];

export default function SuperAdminSubscriptions() {
  const [wholesalers, setWholesalers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedWholesalerId, setSelectedWholesalerId] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'activate', 'payments'
  const [activationForm, setActivationForm] = useState({
    planId: '',
    durationMonths: 1,
    startDateTime: createDefaultStartDateTime(),
    activationNotes: '',
    externalReference: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isTenantLoading, setIsTenantLoading] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState('');

  const refreshWorkspace = async () => {
    const [wholesalersResponse, plansResponse] = await Promise.all([
      apiClient.get('/admin/wholesalers'),
      apiClient.get('/admin/subscriptions/plans'),
    ]);

    setWholesalers(wholesalersResponse.data.wholesalers || []);
    setPlans(plansResponse.data.plans || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        await refreshWorkspace();
      } catch (fetchError) {
        setError(fetchError.response?.data?.error || 'Failed to load subscriptions page.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const filteredWholesalers = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return wholesalers.filter((wholesaler) => {
      const matchesQuery =
        !query ||
        wholesaler.businessName?.toLowerCase().includes(query) ||
        wholesaler.ownerEmail?.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (selectedFilter === 'READY') {
        return ['APPROVED', 'ACTIVE', 'PAST_DUE', 'SUSPENDED'].includes(
          wholesaler.onboardingStatus
        );
      }

      if (selectedFilter === 'PAID') {
        return (
          wholesaler.currentSubscription?.status === 'ACTIVE' &&
          wholesaler.currentSubscription?.plan?.code !== 'TRIAL'
        );
      }

      if (selectedFilter === 'TRIAL') {
        return (
          wholesaler.currentSubscription?.status === 'ACTIVE' &&
          wholesaler.currentSubscription?.plan?.code === 'TRIAL'
        );
      }

      if (selectedFilter === 'PAST_DUE') {
        return (
          wholesaler.currentSubscription?.status === 'PAST_DUE' ||
          wholesaler.onboardingStatus === 'PAST_DUE'
        );
      }

      return true;
    });
  }, [searchValue, selectedFilter, wholesalers]);

  useEffect(() => {
    if (!selectedWholesalerId && filteredWholesalers.length > 0) {
      setSelectedWholesalerId(filteredWholesalers[0].id);
      return;
    }

    if (filteredWholesalers.length === 0) {
      setSelectedWholesalerId('');
      return;
    }

    const stillVisible = filteredWholesalers.some((item) => item.id === selectedWholesalerId);
    if (!stillVisible) {
      setSelectedWholesalerId(filteredWholesalers[0].id);
    }
  }, [filteredWholesalers, selectedWholesalerId]);

  useEffect(() => {
    if (!selectedWholesalerId) {
      setSelectedTenant(null);
      return;
    }

    const loadTenant = async () => {
      try {
        setIsTenantLoading(true);
        const response = await apiClient.get(`/admin/wholesalers/${selectedWholesalerId}`);
        setSelectedTenant(response.data.tenant);
      } catch (fetchError) {
        setError(fetchError.response?.data?.error || 'Failed to load seller subscription details.');
      } finally {
        setIsTenantLoading(false);
      }
    };

    loadTenant();
  }, [selectedWholesalerId]);

  useEffect(() => {
    if (!selectedTenant || plans.length === 0) return;

    const paidCurrentPlanId =
      selectedTenant.currentSubscription?.plan?.code !== 'TRIAL'
        ? selectedTenant.currentSubscription?.plan?.id
        : null;

    setActivationForm({
      planId: paidCurrentPlanId || plans[0]?.id || '',
      durationMonths:
        selectedTenant.currentSubscription?.durationMonths ||
        plans[0]?.purchaseOptions?.[0]?.months ||
        1,
      startDateTime: createDefaultStartDateTime(),
      activationNotes: '',
      externalReference: '',
    });
  }, [selectedTenant, plans]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === activationForm.planId) || plans[0] || null,
    [plans, activationForm.planId]
  );

  const selectedOption = useMemo(
    () =>
      selectedPlan?.purchaseOptions?.find(
        (option) => option.months === activationForm.durationMonths
      ) ||
      selectedPlan?.purchaseOptions?.[0] ||
      null,
    [selectedPlan, activationForm.durationMonths]
  );

  const validityPreview = useMemo(() => {
    if (!activationForm.startDateTime || !selectedOption) return 'Not scheduled';
    const start = new Date(activationForm.startDateTime);
    const end = new Date(start);
    end.setMonth(end.getMonth() + selectedOption.months);
    return formatDate(end);
  }, [activationForm.startDateTime, selectedOption]);

  const handleFieldChange = (field, value) => {
    setActivationForm((current) => ({
      ...current,
      [field]: field === 'durationMonths' ? Number(value) : value,
    }));
  };

  const handleActivate = async () => {
    if (!selectedTenant) return;

    try {
      setIsActivating(true);
      setError('');
      await apiClient.post(
        `/admin/wholesalers/${selectedTenant.id}/subscriptions/activate-direct`,
        {
          planId: activationForm.planId,
          durationMonths: activationForm.durationMonths,
          startDateTime: activationForm.startDateTime,
          activationNotes: activationForm.activationNotes || null,
          externalReference: activationForm.externalReference || null,
        }
      );

      toast.success('Subscription activated successfully!');
      await refreshWorkspace();
      const refreshed = await apiClient.get(`/admin/wholesalers/${selectedTenant.id}`);
      setSelectedTenant(refreshed.data.tenant);
      setActiveTab('overview');
    } catch (activationError) {
      const errMsg = activationError.response?.data?.error || 'Failed to activate subscription.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsActivating(false);
    }
  };

  const paidActive = wholesalers.filter(
    (item) =>
      item.currentSubscription?.status === 'ACTIVE' &&
      item.currentSubscription?.plan?.code !== 'TRIAL'
  ).length;
  const trialActive = wholesalers.filter(
    (item) =>
      item.currentSubscription?.status === 'ACTIVE' &&
      item.currentSubscription?.plan?.code === 'TRIAL'
  ).length;
  const pastDue = wholesalers.filter(
    (item) =>
      item.currentSubscription?.status === 'PAST_DUE' || item.onboardingStatus === 'PAST_DUE'
  ).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-[#d8ccb9] bg-white/70 px-5 py-4 text-[#8f5d31]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-[0.24em]">
            Loading subscriptions workspace
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <section className="overflow-hidden rounded-[32px] border border-[#d8ccb9] bg-[linear-gradient(135deg,#fffaf3_0%,#f0e3d0_58%,#e8d5b7_100%)] shadow-[0_26px_70px_rgba(57,45,29,0.12)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8ccb9] bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
              <ShieldCheck className="h-4 w-4" />
              Subscription Control Room
            </div>
            <h1 className="mt-5 max-w-2xl text-3xl font-black tracking-tight text-[#221c16] sm:text-5xl">
              Merchant plans, billing, and direct activations.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#5d5247] sm:text-base">
              Query any wholesaler account, inspect their current active plans, check details of
              past transactions, and perform manual activation overrides with real-time receipt
              previews.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TopCard title="Paid Active" value={paidActive} icon={CreditCard} accent="amber" />
            <TopCard title="Trial Active" value={trialActive} icon={Sparkles} accent="sky" />
            <TopCard title="Past Due" value={pastDue} icon={CalendarClock} accent="rose" />
            <TopCard
              title="Loaded Sellers"
              value={wholesalers.length}
              icon={Building2}
              accent="emerald"
            />
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[24px] border border-[#e6b6b0] bg-[#fff3f1] px-4 py-3 text-sm text-[#9d3b30]">
          {error}
        </div>
      ) : null}

      {/* Main Workspace Split layout */}
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] xl:grid-cols-[0.8fr_1.2fr]">
        {/* Left Side: Wholesaler Directory */}
        <section className="rounded-[30px] border border-[#d8ccb9] bg-[#fff9f1] p-6 shadow-[0_18px_45px_rgba(57,45,29,0.07)] lg:sticky lg:top-24 lg:self-start max-h-[85vh] flex flex-col">
          <div className="border-b border-[#eadfce] pb-5 shrink-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
              Directory Index
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#221c16]">
              Subscription Targets
            </h2>

            <div className="mt-4 rounded-2xl border border-[#eadfce] bg-[#fcf7f0] p-3 space-y-3">
              <label className="flex items-center gap-3 rounded-xl border border-[#eadfce] bg-white px-3 py-2.5">
                <Search className="h-4 w-4 text-[#8b7e70]" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search business or email"
                  className="w-full bg-transparent text-sm text-[#221c16] outline-none placeholder:text-[#8b7e70]"
                />
              </label>

              <div className="flex flex-wrap gap-1.5">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setSelectedFilter(filter.value)}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                      selectedFilter === filter.value
                        ? 'bg-[#221c16] text-[#f5efe4] shadow-sm'
                        : 'border border-[#d8ccb9] bg-white text-[#5d5247] hover:bg-white/90'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable List container */}
          <div className="mt-5 space-y-3 overflow-y-auto flex-1 pr-1">
            {filteredWholesalers.length > 0 ? (
              filteredWholesalers.map((wholesaler) => {
                const isSelected = wholesaler.id === selectedWholesalerId;
                return (
                  <button
                    key={wholesaler.id}
                    type="button"
                    onClick={() => setSelectedWholesalerId(wholesaler.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition duration-200 hover:scale-[1.01] ${
                      isSelected
                        ? 'border-[#bc6c25] bg-[#fff4e6] shadow-[0_12px_24px_rgba(188,108,37,0.08)]'
                        : 'border-[#eadfce] bg-[#fcf7f0] hover:border-[#d7c0a4] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black tracking-tight text-[#221c16] line-clamp-1">
                          {wholesaler.businessName}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6b6155] line-clamp-1">
                          {wholesaler.ownerEmail}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${
                          wholesaler.onboardingStatus === 'APPROVED' ||
                          wholesaler.onboardingStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : wholesaler.onboardingStatus === 'PAST_DUE'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {wholesaler.onboardingStatus}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/60 p-2 rounded-lg border border-[#efe4d3]">
                        <span className="text-[10px] text-[#8b7e70] font-medium block">
                          Active Plan
                        </span>
                        <span className="font-bold text-[#221c16] truncate block">
                          {wholesaler.currentSubscription?.plan?.name || 'None'}
                        </span>
                      </div>
                      <div className="bg-white/60 p-2 rounded-lg border border-[#efe4d3]">
                        <span className="text-[10px] text-[#8b7e70] font-medium block">Status</span>
                        <span className="font-bold text-[#221c16] truncate block">
                          {wholesaler.currentSubscription?.status || 'No record'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8ccb9] px-4 py-12 text-center text-[#6b6155]">
                <Inbox className="h-8 w-8 text-[#8b7e70] mb-2 opacity-50" />
                <p className="text-sm font-semibold">No Merchants Found</p>
                <p className="text-xs text-[#8b7e70] mt-1">
                  Try adapting your search or filter inputs.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Tabbed Subscription Console */}
        <section className="rounded-[30px] border border-[#d8ccb9] bg-[#fff9f1] p-6 shadow-[0_18px_45px_rgba(57,45,29,0.07)] min-h-[500px] flex flex-col">
          {isTenantLoading ? (
            <div className="flex flex-1 items-center justify-center text-[#8f5d31] min-h-[400px]">
              <div className="flex flex-col items-center gap-2">
                <LoaderCircle className="h-8 w-8 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Syncing Merchant Records...
                </p>
              </div>
            </div>
          ) : selectedTenant ? (
            <div className="space-y-6 flex-1 flex flex-col">
              {/* Wholesaler Header banner */}
              <div className="rounded-[28px] border border-[#eadfce] bg-[linear-gradient(135deg,#fffdf8_0%,#f8eddb_100%)] p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                      <Building2 className="h-3.5 w-3.5" />
                      Wholesaler Account
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[#221c16] md:text-3xl">
                      {selectedTenant.businessName}
                    </h2>
                    <p className="mt-1 text-sm text-[#6b6155]">
                      {selectedTenant.ownerEmail} · Owner: {selectedTenant.ownerName || 'N/A'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border ${
                        selectedTenant.onboardingStatus === 'APPROVED' ||
                        selectedTenant.onboardingStatus === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedTenant.onboardingStatus === 'PAST_DUE'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      Onboarding: {selectedTenant.onboardingStatus}
                    </span>
                    {selectedTenant.currentSubscription ? (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border ${
                          selectedTenant.currentSubscription.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        Plan: {selectedTenant.currentSubscription.plan?.name} ·{' '}
                        {selectedTenant.currentSubscription.status}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1 border bg-amber-50 text-amber-700 border-amber-200">
                        No Subscription
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#efe4d3]/60 border border-[#d8ccb9] max-w-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'overview'
                      ? 'bg-[#221c16] text-[#f5efe4] shadow-[0_4px_12px_rgba(34,28,22,0.15)]'
                      : 'text-[#5d5247] hover:bg-[#efe4d3]/80 hover:text-[#221c16]'
                  }`}
                >
                  Overview & Stats
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('activate')}
                  className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'activate'
                      ? 'bg-[#bc6c25] text-white shadow-[0_4px_12px_rgba(188,108,37,0.15)]'
                      : 'text-[#5d5247] hover:bg-[#efe4d3]/80 hover:text-[#221c16]'
                  }`}
                >
                  Manual Activation
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 rounded-xl py-2 px-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    activeTab === 'history'
                      ? 'bg-[#221c16] text-[#f5efe4] shadow-[0_4px_12px_rgba(34,28,22,0.15)]'
                      : 'text-[#5d5247] hover:bg-[#efe4d3]/80 hover:text-[#221c16]'
                  }`}
                >
                  Payment History
                </button>
              </div>

              {/* Tab Content Panel */}
              <div className="flex-1">
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Subscription & Trial grid */}
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8f5d31] mb-4">
                          <CreditCard className="h-4 w-4" />
                          Subscription Details
                        </div>
                        <div className="space-y-2.5">
                          <StateRow
                            label="Active Plan"
                            value={selectedTenant.currentSubscription?.plan?.name || 'Not active'}
                          />
                          <StateRow
                            label="Payment Status"
                            value={selectedTenant.currentSubscription?.status || 'No record'}
                          />
                          <StateRow
                            label="Starts At"
                            value={formatDate(
                              selectedTenant.currentSubscription?.currentPeriodStart
                            )}
                          />
                          <StateRow
                            label="Ends At"
                            value={formatDate(selectedTenant.currentSubscription?.currentPeriodEnd)}
                          />
                          <StateRow
                            label="Billing Cycle"
                            value={
                              selectedTenant.currentSubscription?.plan?.code === 'TRIAL'
                                ? '2-Day Trial'
                                : selectedTenant.currentSubscription?.durationMonths
                                  ? `${selectedTenant.currentSubscription.durationMonths} Month(s)`
                                  : 'N/A'
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8f5d31] mb-4">
                          <Sparkles className="h-4 w-4" />
                          Trial State
                        </div>
                        <div className="space-y-2.5">
                          <StateRow
                            label="Trial Active"
                            value={
                              selectedTenant.currentSubscription?.plan?.code === 'TRIAL' &&
                              selectedTenant.currentSubscription?.status === 'ACTIVE'
                                ? 'Running'
                                : 'No'
                            }
                          />
                          <StateRow
                            label="Trial Eligibility"
                            value={selectedTenant.trialUsedAt ? 'Used' : 'Eligible'}
                          />
                          <StateRow
                            label="Trial Starts"
                            value={
                              selectedTenant.trialEndsAt
                                ? formatDate(
                                    new Date(
                                      new Date(selectedTenant.trialEndsAt).getTime() -
                                        2 * 24 * 60 * 60 * 1000
                                    )
                                  )
                                : 'N/A'
                            }
                          />
                          <StateRow
                            label="Trial Ends"
                            value={formatDate(selectedTenant.trialEndsAt)}
                          />
                          <StateRow
                            label="Trial Used At"
                            value={formatDate(selectedTenant.trialUsedAt)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial stats */}
                    <div className="rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8f5d31] mb-4">
                        <Activity className="h-4 w-4" />
                        Merchant Financial Overview
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-white p-4 border border-[#eadfce] shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#8b7e70]">
                            Accumulated Revenue
                          </p>
                          <p className="mt-2 text-2xl font-black text-[#221c16]">
                            {formatCurrency(selectedTenant.metrics?.revenue || 0)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-4 border border-[#eadfce] shadow-sm">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#8b7e70]">
                            Total Inventory Value
                          </p>
                          <p className="mt-2 text-2xl font-black text-[#221c16]">
                            {formatCurrency(selectedTenant.metrics?.inventoryValue || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'activate' && (
                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] animate-fadeIn">
                    {/* Activation setup form */}
                    <div className="space-y-5 rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-5 shadow-sm">
                      <div>
                        <h3 className="text-lg font-black text-[#221c16]">
                          Direct Account Override
                        </h3>
                        <p className="text-xs text-[#6b6155] mt-1">
                          Activate a standard or premium license. Intended for support staff after
                          verifying offline check or bank wire details.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <AdminField label="Select Plan">
                          <select
                            value={activationForm.planId}
                            onChange={(event) => handleFieldChange('planId', event.target.value)}
                            className="h-11 w-full rounded-xl border border-[#d8ccb9] bg-white px-3 text-sm text-[#221c16] outline-none focus:border-[#bc6c25] transition"
                          >
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name}
                              </option>
                            ))}
                          </select>
                        </AdminField>

                        <AdminField label="Billing Cycle Options">
                          <select
                            value={activationForm.durationMonths}
                            onChange={(event) =>
                              handleFieldChange('durationMonths', event.target.value)
                            }
                            className="h-11 w-full rounded-xl border border-[#d8ccb9] bg-white px-3 text-sm text-[#221c16] outline-none focus:border-[#bc6c25] transition"
                          >
                            {(selectedPlan?.purchaseOptions || []).map((option) => (
                              <option
                                key={`${selectedPlan.id}-${option.months}`}
                                value={option.months}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </AdminField>

                        <AdminField label="Start DateTime">
                          <input
                            type="datetime-local"
                            value={activationForm.startDateTime}
                            onChange={(event) =>
                              handleFieldChange('startDateTime', event.target.value)
                            }
                            className="h-11 w-full rounded-xl border border-[#d8ccb9] bg-white px-3 text-sm text-[#221c16] outline-none focus:border-[#bc6c25] transition"
                          />
                        </AdminField>

                        <AdminField label="Reference Code">
                          <input
                            value={activationForm.externalReference}
                            onChange={(event) =>
                              handleFieldChange('externalReference', event.target.value)
                            }
                            placeholder="Bank reference, cash notes"
                            className="h-11 w-full rounded-xl border border-[#d8ccb9] bg-white px-3 text-sm text-[#221c16] outline-none placeholder:text-[#8b7e70] focus:border-[#bc6c25] transition"
                          />
                        </AdminField>
                      </div>

                      <AdminField label="Internal Activation Audit Notes">
                        <textarea
                          value={activationForm.activationNotes}
                          onChange={(event) =>
                            handleFieldChange('activationNotes', event.target.value)
                          }
                          rows={3}
                          placeholder="State reasoning, invoice/receipt numbers, or offline payment terms"
                          className="w-full rounded-xl border border-[#d8ccb9] bg-white px-3 py-2 text-sm text-[#221c16] outline-none placeholder:text-[#8b7e70] focus:border-[#bc6c25] transition resize-none"
                        />
                      </AdminField>
                    </div>

                    {/* Dark Receipt Preview Card */}
                    <div className="rounded-[28px] border border-[#bc6c25]/30 bg-[#221c16] p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#bc6c25]/10 rounded-full blur-2xl -mr-6 -mt-6"></div>

                      <div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-[#d7c0a4]">
                              Direct Billing
                            </p>
                            <h4 className="text-lg font-black tracking-tight text-white mt-1">
                              Invoice Receipt Preview
                            </h4>
                          </div>
                          <BadgeIndianRupee className="h-7 w-7 text-[#d7c0a4] opacity-80" />
                        </div>

                        <div className="space-y-3.5 my-5">
                          <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                            <span className="text-[#8b7e70] font-semibold">Wholesaler</span>
                            <span className="font-bold text-white text-right truncate max-w-[170px]">
                              {selectedTenant.businessName}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#8b7e70] font-semibold">Selected Tier</span>
                            <span className="font-bold text-white">
                              {selectedPlan?.name || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#8b7e70] font-semibold">Billing Rate</span>
                            <span className="font-bold text-white">
                              {formatCurrency(selectedPlan?.price || 0)} / mo
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#8b7e70] font-semibold">Term Duration</span>
                            <span className="font-bold text-white">
                              {selectedOption?.months || 1} Month(s)
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#8b7e70] font-semibold">Subtotal</span>
                            <span className="font-semibold text-[#f5efe4]">
                              {formatCurrency(selectedOption?.baseAmount || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#8b7e70] font-semibold">Package Discount</span>
                            <span className="font-bold text-[#dda15e]">
                              -{selectedOption?.discountPercent || 0}%
                            </span>
                          </div>

                          <div className="border-t border-dashed border-white/20 my-4"></div>

                          <div className="flex justify-between items-baseline py-1">
                            <span className="text-sm font-bold text-[#d7c0a4] uppercase tracking-wider">
                              Total Due
                            </span>
                            <span className="text-3xl font-black text-[#f5efe4]">
                              {formatCurrency(selectedOption?.finalAmount || 0)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs text-[#8b7e70] pt-2">
                            <span>Validity End Preview</span>
                            <span className="font-medium text-white">{validityPreview}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleActivate}
                        disabled={
                          !activationForm.planId || !activationForm.startDateTime || isActivating
                        }
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#bc6c25] py-3.5 px-4 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all duration-200 hover:bg-[#a05a1d] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isActivating ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Activating Override...
                          </>
                        ) : (
                          'Confirm & Activate Direct'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-[#221c16]">
                          Transaction & Audit History
                        </h3>
                        <p className="text-xs text-[#6b6155] mt-1">
                          Audit log of subscription invoices and manual overrides.
                        </p>
                      </div>
                      <span className="rounded-full bg-[#efe4d3] px-3.5 py-1 text-xs font-bold text-[#8f5d31] border border-[#d8ccb9]">
                        {(selectedTenant.subscriptionPayments || []).length} Payments
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                      {(selectedTenant.subscriptionPayments || []).length > 0 ? (
                        selectedTenant.subscriptionPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="rounded-2xl border border-[#eadfce] bg-[#fcf7f0] p-4 transition duration-150 hover:bg-white"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-black text-[#221c16]">
                                    {payment.plan?.name || 'Subscription Activation'}
                                  </p>
                                  <span className="inline-block text-[10px] font-bold text-[#8b7e70] border border-[#d8ccb9] px-2 py-0.5 rounded bg-white">
                                    {payment.durationMonths} Month(s)
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-[#6b6155]">
                                  {formatDate(payment.createdAt)}
                                </p>
                              </div>

                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize border ${
                                  payment.status === 'PAID' || payment.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {payment.status.toLowerCase()}
                              </span>
                            </div>

                            <div className="mt-3.5 grid gap-3 grid-cols-2 text-xs border-t border-[#eadfce] pt-3 text-[#5d5247]">
                              <div>
                                <span className="text-[#8b7e70] font-medium block">Method</span>
                                <span className="font-bold text-[#221c16]">
                                  {payment.purchaseMethod}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8b7e70] font-medium block">
                                  Amount Paid
                                </span>
                                <span className="font-bold text-[#221c16]">
                                  {formatCurrency(payment.finalAmount || payment.amount || 0)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8b7e70] font-medium block">Discount</span>
                                <span className="font-bold text-[#221c16]">
                                  {payment.discountPercent || 0}%
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8b7e70] font-medium block">
                                  Reference Code
                                </span>
                                <span className="font-bold text-[#221c16] truncate block max-w-[150px]">
                                  {payment.externalReference || payment.razorpayPaymentId || 'None'}
                                </span>
                              </div>
                            </div>

                            {payment.activationNotes && (
                              <div className="mt-3 bg-white/70 border border-[#efe4d3] rounded-xl p-3 text-xs text-[#6b6155] flex gap-2">
                                <FileText className="h-4 w-4 text-[#8f5d31] shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-[#8f5d31] block mb-0.5">
                                    Audit Note:
                                  </span>
                                  {payment.activationNotes}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center border border-dashed border-[#d8ccb9] rounded-2xl p-8 text-center text-[#6b6155] bg-white/50">
                          <History className="h-8 w-8 text-[#8b7e70] mb-2 opacity-50" />
                          <p className="text-sm font-semibold">No Payments Logged</p>
                          <p className="text-xs text-[#8b7e70] mt-1">
                            This seller does not have any manual or online payment logs on record.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white/40 rounded-[24px] border border-dashed border-[#d8ccb9] animate-fadeIn">
              <Building2 className="h-12 w-12 text-[#8f5d31] mb-4 opacity-75" />
              <h3 className="text-lg font-black text-[#221c16]">No Merchant Selected</h3>
              <p className="mt-2 text-sm text-[#6b6155] max-w-sm">
                Select a wholesaler from the directory on the left to verify active subscriptions,
                view invoicing logs, or perform manual override activations.
              </p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function TopCard({ title, value, icon: Icon, accent }) {
  const accents = {
    amber: 'bg-[#bc6c25] text-white',
    sky: 'bg-[#355070] text-white',
    rose: 'bg-[#9c6644] text-white',
    emerald: 'bg-[#386641] text-white',
  };

  return (
    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm hover:scale-[1.01] transition-all duration-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">{title}</p>
          <p className="mt-2.5 text-3xl font-black tracking-tight text-[#221c16]">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accents[accent] || 'bg-[#221c16]'}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function AdminField({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b7e70]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function StateRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#eadfce] bg-white px-3.5 py-2 text-sm shadow-sm">
      <span className="text-[#6b6155] font-medium">{label}</span>
      <span className="text-right font-bold text-[#221c16] truncate max-w-[200px]">{value}</span>
    </div>
  );
}
