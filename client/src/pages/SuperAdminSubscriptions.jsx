import { Building2, LoaderCircle } from 'lucide-react';
import {
  SuperAdminSubscriptionHeader,
  SuperAdminSubscriptionDirectory,
  SuperAdminSubscriptionOverviewTab,
  SuperAdminSubscriptionCouponsTab,
  SuperAdminSubscriptionHistoryTab,
} from '../components/admin/SuperAdminSubscriptionComponents';
import {
  useSuperAdminSubscriptions,
  filters,
  generateRandomCouponCode,
} from '../components/admin/useSuperAdminSubscriptions';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

const formatDate = (value) => {
  if (!value) return 'N/A';
  return dateFormatter.format(new Date(value));
};

export default function SuperAdminSubscriptions() {
  const {
    wholesalers,
    plans,
    setSelectedWholesalerId,
    selectedTenant,
    searchValue,
    setSearchValue,
    selectedFilter,
    setSelectedFilter,
    activeTab,
    setActiveTab,
    coupons,
    couponForm,
    setCouponForm,
    isCreatingCoupon,
    isLoading,
    isTenantLoading,
    couponColumnVisibility,
    setCouponColumnVisibility,
    couponRowSelection,
    setCouponRowSelection,
    couponPagination,
    setCouponPagination,
    couponSorting,
    setCouponSorting,
    couponGlobalFilter,
    setCouponGlobalFilter,
    couponColumns,
    filteredWholesalers,
    activeWholesalerId,
    handleCreateCoupon,
    paidActive,
    trialActive,
    pastDue,
    error,
  } = useSuperAdminSubscriptions();

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-[#2B3139] bg-[#1E2329] px-5 py-4 text-[#F0B90B]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading subscriptions workspace</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SuperAdminSubscriptionHeader
        paidActive={paidActive}
        trialActive={trialActive}
        pastDue={pastDue}
        totalWholesalers={wholesalers.length}
      />

      {error ? (
        <div className="rounded-lg border border-[#F6465D]/30 bg-[#F6465D]/5 px-4 py-3 text-sm text-[#F6465D]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] xl:grid-cols-[0.8fr_1.2fr]">
        <SuperAdminSubscriptionDirectory
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          filters={filters}
          filteredWholesalers={filteredWholesalers}
          activeWholesalerId={activeWholesalerId}
          setSelectedWholesalerId={setSelectedWholesalerId}
        />

        <section className="rounded-xl border border-[#2B3139] bg-[#12161C] p-5 min-h-[500px] flex flex-col">
          {isTenantLoading ? (
            <div className="flex flex-1 items-center justify-center text-[#F0B90B] min-h-[400px]">
              <div className="flex flex-col items-center gap-2">
                <LoaderCircle className="h-8 w-8 animate-spin" />
                <p className="text-xs font-medium text-[#848E9C]">Syncing records...</p>
              </div>
            </div>
          ) : selectedTenant ? (
            <div className="space-y-5 flex-1 flex flex-col">
              <div className="rounded-lg border border-[#2B3139] bg-[#1E2329] p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#848E9C]">
                      <Building2 className="h-3.5 w-3.5" />
                      Wholesaler Account
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-[#EAECEF]">
                      {selectedTenant.businessName}
                    </h2>
                    <p className="mt-0.5 text-sm text-[#5E6673]">
                      {selectedTenant.ownerEmail} · Owner: {selectedTenant.ownerName || 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`text-[10px] font-semibold uppercase rounded-md px-2 py-1 ${
                        selectedTenant.onboardingStatus === 'ACTIVE'
                          ? 'bg-[#0ECB81]/10 text-[#0ECB81]'
                          : 'bg-[#F0B90B]/10 text-[#F0B90B]'
                      }`}
                    >
                      {selectedTenant.onboardingStatus}
                    </span>
                    {selectedTenant.currentSubscription && (
                      <span
                        className={`text-[10px] font-semibold uppercase rounded-md px-2 py-1 ${
                          selectedTenant.currentSubscription.status === 'ACTIVE'
                            ? 'bg-[#0ECB81]/10 text-[#0ECB81]'
                            : 'bg-[#F6465D]/10 text-[#F6465D]'
                        }`}
                      >
                        {selectedTenant.currentSubscription.plan?.name} ·{' '}
                        {selectedTenant.currentSubscription.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#1E2329] border border-[#2B3139] max-w-md shrink-0">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'coupons', label: 'Coupons' },
                  { id: 'history', label: 'Payments' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 rounded-md py-2 px-3 text-xs font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-[#2B3139] text-[#F0B90B]'
                        : 'text-[#5E6673] hover:text-[#848E9C]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1">
                {activeTab === 'overview' && (
                  <SuperAdminSubscriptionOverviewTab
                    selectedTenant={selectedTenant}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                  />
                )}

                {activeTab === 'coupons' && (
                  <SuperAdminSubscriptionCouponsTab
                    couponForm={couponForm}
                    setCouponForm={setCouponForm}
                    generateRandomCouponCode={generateRandomCouponCode}
                    plans={plans}
                    handleCreateCoupon={handleCreateCoupon}
                    isCreatingCoupon={isCreatingCoupon}
                    coupons={coupons}
                    couponColumns={couponColumns}
                    couponSorting={couponSorting}
                    setCouponSorting={setCouponSorting}
                    couponPagination={couponPagination}
                    setCouponPagination={setCouponPagination}
                    couponGlobalFilter={couponGlobalFilter}
                    setCouponGlobalFilter={setCouponGlobalFilter}
                    couponColumnVisibility={couponColumnVisibility}
                    setColumnVisibility={setCouponColumnVisibility}
                    couponRowSelection={couponRowSelection}
                    setRowSelection={setCouponRowSelection}
                  />
                )}

                {activeTab === 'history' && (
                  <SuperAdminSubscriptionHistoryTab
                    selectedTenant={selectedTenant}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] text-center p-8 rounded-lg border border-dashed border-[#2B3139]">
              <Building2 className="h-10 w-10 text-[#5E6673] mb-3" />
              <h3 className="text-base font-bold text-[#EAECEF]">No Merchant Selected</h3>
              <p className="mt-2 text-sm text-[#5E6673] max-w-sm">
                Select a wholesaler from the directory to view subscription details.
              </p>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
