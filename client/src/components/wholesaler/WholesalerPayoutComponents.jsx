import { Link } from 'react-router-dom';
import {
  CreditCard,
  Landmark,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export function WholesalerPayoutHeader() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-white">Withdrawals & Payouts</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Monitor your earnings, view platform payouts, and request withdrawals to your registered
        bank account or UPI.
      </p>
    </div>
  );
}

export function WholesalerBalanceOverview({ summary }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-1 w-6 rounded-full bg-amber-500/60" />
        <h2 className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
          Balance Overview
        </h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Withdrawable Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <div className="absolute right-4 top-4 text-amber-500/20">
            <Landmark className="h-12 w-12" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Withdrawable Balance
          </p>
          <p className="mt-4 text-3xl font-black text-white">
            {summary?.withdrawableBalance?.toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
            })}
          </p>
          <div className="mt-2 text-xs text-zinc-500">Released after return window expires</div>
        </div>

        {/* Available Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <div className="absolute right-4 top-4 text-emerald-500/20">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Net Available Balance
          </p>
          <p className="mt-4 text-3xl font-black text-emerald-400">
            {summary?.availableBalance?.toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
            })}
          </p>
          <div className="mt-2 text-xs text-zinc-500">Includes pending withdrawal requests</div>
        </div>

        {/* Total Earned */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <div className="absolute right-4 top-4 text-zinc-500/20">
            <CreditCard className="h-12 w-12" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Cumulative Earnings
          </p>
          <p className="mt-4 text-3xl font-black text-white">
            {summary?.totalCumulativeEarnings?.toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
            })}
          </p>
          <div className="mt-2 text-xs text-zinc-500">Total completed e-commerce orders</div>
        </div>

        {/* Total Paid Out */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
          <div className="absolute right-4 top-4 text-blue-500/20">
            <Send className="h-12 w-12" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Total Settled Payouts
          </p>
          <p className="mt-4 text-3xl font-black text-white">
            {summary?.totalPaidPayouts?.toLocaleString('en-IN', {
              style: 'currency',
              currency: 'INR',
            })}
          </p>
          <div className="mt-2 text-xs text-zinc-500">Transferred to your bank/UPI</div>
        </div>
      </div>
    </section>
  );
}

export function WholesalerPayoutTargetCard({
  settingsForm,
  setSettingsForm,
  handleToggleSameAsB2B,
  profile,
  handleSaveSettings,
  isSavingSettings,
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Landmark className="h-5 w-5 text-amber-500" />
        Settlement Target Details
      </h2>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-400">
          Configure whether to use your B2B account or a separate custom account for platform
          cashouts.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/40">
        <div>
          <span className="text-sm font-semibold text-white block">
            Use B2B account for withdrawals
          </span>
          <span className="text-xs text-zinc-500 mt-0.5 block">
            Enable this to automatically use your B2B GST Bank &amp; UPI credentials for payouts.
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggleSameAsB2B}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            settingsForm.useSameAsB2B ? 'bg-amber-500' : 'bg-zinc-800'
          }`}
          aria-label={
            settingsForm.useSameAsB2B
              ? 'Use B2B account for withdrawals'
              : 'Use custom account for withdrawals'
          }
          aria-pressed={settingsForm.useSameAsB2B}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
              settingsForm.useSameAsB2B ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {settingsForm.useSameAsB2B ? (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Active B2B Settlement Details
            </span>
            <Link to="/wholesaler" className="text-xs font-bold text-amber-500 hover:underline">
              Configure B2B Settings
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-zinc-900/50 p-4 border border-zinc-800/40">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">
                Bank Transfer Target
              </span>
              {profile?.bankAccountNo ? (
                <div className="mt-2 text-sm text-zinc-200 space-y-1">
                  <p className="font-semibold">{profile.bankName || 'Partner Bank'}</p>
                  <p className="font-mono text-zinc-300">A/C: {profile.bankAccountNo}</p>
                  <p className="font-mono text-xs text-zinc-400">IFSC: {profile.bankIfsc}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 italic">
                  No bank account details configured.
                </p>
              )}
            </div>

            <div className="rounded-xl bg-zinc-900/50 p-4 border border-zinc-800/40">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">
                UPI Target
              </span>
              {profile?.upiId ? (
                <div className="mt-2 text-sm text-zinc-200">
                  <p className="font-mono font-semibold text-zinc-300">{profile.upiId}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-500 italic">No UPI ID configured.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
            Custom Payout Settlement Details
          </span>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="payout-bank-name"
                className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1"
              >
                Payout Bank Name
              </label>
              <input
                id="payout-bank-name"
                type="text"
                aria-label="Payout Bank Name"
                value={settingsForm.payoutBankName}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, payoutBankName: e.target.value }))
                }
                placeholder="e.g. HDFC Bank"
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
            <div>
              <label
                htmlFor="payout-acc-no"
                className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1"
              >
                Payout Account Number
              </label>
              <input
                id="payout-acc-no"
                type="text"
                aria-label="Payout Account Number"
                value={settingsForm.payoutBankAccountNo}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    payoutBankAccountNo: e.target.value,
                  }))
                }
                placeholder="e.g. 9876543210"
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
            <div>
              <label
                htmlFor="payout-ifsc"
                className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1"
              >
                Payout IFSC Code
              </label>
              <input
                id="payout-ifsc"
                type="text"
                aria-label="Payout IFSC Code"
                value={settingsForm.payoutBankIfsc}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, payoutBankIfsc: e.target.value }))
                }
                placeholder="e.g. HDFC0000123"
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
            <div>
              <label
                htmlFor="payout-upi"
                className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1"
              >
                Payout UPI ID
              </label>
              <input
                id="payout-upi"
                type="text"
                aria-label="Payout UPI ID"
                value={settingsForm.payoutUpiId}
                onChange={(e) =>
                  setSettingsForm((prev) => ({ ...prev, payoutUpiId: e.target.value }))
                }
                placeholder="e.g. supplier@upi"
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-6 py-2.5 text-xs font-bold text-black transition"
            >
              {isSavingSettings ? 'Saving details...' : 'Save Payout Credentials'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function WholesalerWithdrawalRequestForm({
  hasBankDetails,
  settingsForm,
  summary,
  handleSubmit,
  amount,
  setAmount,
  supplierNotes,
  setSupplierNotes,
  requestMutation,
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Send className="h-5 w-5 text-amber-500" />
        Request Withdrawal
      </h2>

      {!hasBankDetails ? (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex gap-3 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Missing Settlement Details</p>
            {settingsForm.useSameAsB2B ? (
              <>
                <p className="mt-1 text-xs text-red-400">
                  You must configure a bank account or UPI ID in your Wholesaler settings before you
                  can request withdrawals.
                </p>
                <Link
                  to="/wholesaler"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition hover:bg-amber-400"
                >
                  <Landmark className="h-3.5 w-3.5" /> Add Bank Details
                </Link>
              </>
            ) : (
              <p className="mt-1 text-xs text-red-400">
                Please enter and save your payout-specific bank details or UPI ID above before you
                can request withdrawals.
              </p>
            )}
          </div>
        </div>
      ) : summary?.withdrawableBalance <= 0 ? (
        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 text-sm text-amber-300">
          <Clock className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-bold">No Withdrawable Funds</p>
            <p className="mt-1 text-xs text-amber-400">
              Your withdrawable balance is currently 0.00 INR. Funds are released after customer
              return windows expire (7 days from delivery).
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="amount"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-400"
            >
              Withdrawal Amount (INR)
            </label>
            <div className="mt-2 relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-zinc-500 text-sm font-bold">₹</span>
              </div>
              <input
                type="number"
                step="0.01"
                id="amount"
                required
                placeholder="0.00"
                min="1"
                max={summary?.withdrawableBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-8 pr-12 py-3 text-sm font-bold text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <button
                  type="button"
                  onClick={() => setAmount(summary.withdrawableBalance.toString())}
                  className="text-xs font-black uppercase text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Max
                </button>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-400"
            >
              Notes for Administrator (Optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Provide any instructions or reference details..."
              value={supplierNotes}
              onChange={(e) => setSupplierNotes(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={requestMutation.isPending}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-amber-500 hover:bg-amber-400 focus:outline-none transition-all duration-300 disabled:opacity-50"
          >
            {requestMutation.isPending ? 'Submitting Request...' : 'Submit Withdrawal Request'}
          </button>
        </form>
      )}
    </div>
  );
}

export function WholesalerPayoutRulesCard() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Clock className="h-5 w-5 text-amber-500" />
        Payout Rules &amp; Schedule
      </h2>
      <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
        <div>
          <p className="font-bold text-zinc-200">Return Escrow Policy</p>
          <p className="mt-1">
            To protect against returns, orders become withdrawable exactly 7 days after delivery
            (when the customer return window officially expires).
          </p>
        </div>
        <div>
          <p className="font-bold text-zinc-200">Processing Time</p>
          <p className="mt-1">
            Manual payout transfers are processed by the platform finance administrators within 24
            to 48 business hours of the request.
          </p>
        </div>
        <div>
          <p className="font-bold text-zinc-200">0% Commission Model</p>
          <p className="mt-1">
            Since you pay a monthly store subscription, NexCart takes 0% commission from your
            marketplace sales. You receive 100% of order totals and delivery fees.
          </p>
        </div>
      </div>
    </div>
  );
}

export function WholesalerPayoutHistoryTable({ requests }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-1 w-6 rounded-full bg-amber-500/60" />
        <h2 className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
          Request History
        </h2>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Withdrawal Request History</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Audit log of your platform payouts and pending requests
          </p>
        </div>

        <div className="overflow-x-auto">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm italic">
              No withdrawal requests recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Request Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Method Target</th>
                  <th className="px-6 py-4">Transaction UTR / Reference</th>
                  <th className="px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-900/20">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400">
                      {new Date(req.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white">
                      ₹{Number(req.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Approved
                        </span>
                      )}
                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          <XCircle className="h-3 w-3" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {req.upiId ? (
                        <span className="text-zinc-300">
                          UPI: <span className="font-mono">{req.upiId}</span>
                        </span>
                      ) : req.bankAccountNo ? (
                        <span className="text-zinc-300">
                          Bank: <span className="font-mono">...{req.bankAccountNo.slice(-4)}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-zinc-300">
                      {req.transactionRef || <span className="text-zinc-600">—</span>}
                    </td>
                    <td
                      className="px-6 py-4 text-xs max-w-xs truncate text-zinc-400"
                      title={req.adminNotes || req.supplierNotes}
                    >
                      {req.status === 'REJECTED' && req.adminNotes && (
                        <span className="text-red-400 block font-semibold">
                          Reason: {req.adminNotes}
                        </span>
                      )}
                      {req.status === 'APPROVED' && req.adminNotes && (
                        <span className="text-zinc-500 block">Admin: {req.adminNotes}</span>
                      )}
                      {req.supplierNotes && (
                        <span className="block italic text-zinc-500">
                          Your note: &quot;{req.supplierNotes}&quot;
                        </span>
                      )}
                      {!req.adminNotes && !req.supplierNotes && (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
