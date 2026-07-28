import {
  WholesalerPayoutHeader,
  WholesalerBalanceOverview,
  WholesalerPayoutTargetCard,
  WholesalerWithdrawalRequestForm,
  WholesalerPayoutRulesCard,
  WholesalerPayoutHistoryTable,
} from '../components/wholesaler/WholesalerPayoutComponents';
import { useWholesalerPayoutsState } from '../components/wholesaler/useWholesalerPayoutsState';

export default function WholesalerPayouts() {
  const {
    amount,
    setAmount,
    supplierNotes,
    setSupplierNotes,
    settingsForm,
    setSettingsForm,
    isSavingSettings,
    handleSaveSettings,
    handleToggleSameAsB2B,
    summary,
    isSummaryLoading,
    isRequestsLoading,
    requestMutation,
    handleSubmit,
    hasBankDetails,
    requests,
    profile,
  } = useWholesalerPayoutsState();

  if (isSummaryLoading || isRequestsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 text-white font-sans">
      {/* Page Header */}
      <WholesalerPayoutHeader />

      {/* Balance Overview */}
      <WholesalerBalanceOverview summary={summary} />

      {/* Settlement & Withdrawal Section */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-1 w-6 rounded-full bg-amber-500/60" />
          <h2 className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
            Settlement &amp; Withdrawal
          </h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left/Middle Column: Target Card & Request Form */}
          <div className="space-y-8 lg:col-span-2">
            <WholesalerPayoutTargetCard
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              handleToggleSameAsB2B={handleToggleSameAsB2B}
              profile={profile}
              handleSaveSettings={handleSaveSettings}
              isSavingSettings={isSavingSettings}
            />

            <WholesalerWithdrawalRequestForm
              hasBankDetails={hasBankDetails}
              settingsForm={settingsForm}
              summary={summary}
              handleSubmit={handleSubmit}
              amount={amount}
              setAmount={setAmount}
              supplierNotes={supplierNotes}
              setSupplierNotes={setSupplierNotes}
              requestMutation={requestMutation}
            />
          </div>

          {/* Right Column: Payout Rules Card */}
          <WholesalerPayoutRulesCard />
        </div>
      </section>

      {/* Request History */}
      <WholesalerPayoutHistoryTable requests={requests} />
    </div>
  );
}
