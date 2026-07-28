import {
  WholesalerBillingHero,
  WholesalerFeatureAccessGrid,
  WholesalerFreeTrialCard,
  WholesalerPlanCatalog,
  WholesalerUpgradeCard,
  WholesalerCouponCard,
  WholesalerCurrentSubscriptionCard,
  WholesalerPaymentSupportCard,
  WholesalerBillingHistoryCard,
} from '../components/wholesaler/WholesalerBillingComponents';
import {
  useWholesalerBillingState,
  formatDateTime,
} from '../components/wholesaler/useWholesalerBillingState';

export default function WholesalerBilling() {
  const {
    user,
    supportCardRef,
    showSupportContact,
    selectedDurations,
    setCoupon,
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
  } = useWholesalerBillingState();

  return (
    <div className="space-y-8 text-white">
      {/* Page Hero */}
      <WholesalerBillingHero summary={summary} user={user} />

      {error ? (
        <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {/* Feature Access Section */}
      <WholesalerFeatureAccessGrid currentFeatures={currentFeatures} />

      {/* Plans & Billing Section */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-1 w-6 rounded-full bg-amber-500/60" />
          <h2 className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
            Plans &amp; Billing
          </h2>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] items-start">
          {/* Left Column: Trial + Plan Catalog */}
          <div className="space-y-6">
            <WholesalerFreeTrialCard
              trialPlan={trialPlan}
              trialMeta={trialMeta}
              busyAction={busyAction}
              handleStartTrial={handleStartTrial}
              formatDateTime={formatDateTime}
            />

            <WholesalerPlanCatalog
              paidPlans={paidPlans}
              summary={summary}
              isLoading={isLoading}
              selectedDurations={selectedDurations}
              handleDurationChange={handleDurationChange}
              resolvePurchaseOption={resolvePurchaseOption}
              handleRazorpayPurchase={handleRazorpayPurchase}
              handleSupportRequest={handleSupportRequest}
              busyAction={busyAction}
              supportContact={supportContact}
            />
          </div>

          {/* Right Column: Upgrade + Coupon + Subscription + Support + History */}
          <div className="space-y-6">
            <WholesalerUpgradeCard
              upgradeDetails={upgradeDetails}
              handleUpgradePurchase={handleUpgradePurchase}
              busyAction={busyAction}
            />

            <WholesalerCouponCard
              couponCode={couponCode}
              setCoupon={setCoupon}
              busyAction={busyAction}
              handleValidateCoupon={handleValidateCoupon}
              couponError={couponError}
              validatedCoupon={validatedCoupon}
              handleActivateCoupon={handleActivateCoupon}
            />

            <WholesalerCurrentSubscriptionCard summary={summary} formatDateTime={formatDateTime} />

            <WholesalerPaymentSupportCard
              supportCardRef={supportCardRef}
              showSupportContact={showSupportContact}
              supportContact={supportContact}
            />

            <WholesalerBillingHistoryCard payments={payments} />
          </div>
        </div>
      </section>
    </div>
  );
}
