import { Landmark, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminPayoutActionModal({
  selectedPayout,
  modalType,
  closeModal,
  transactionRef,
  setTransactionRef,
  adminNotes,
  setAdminNotes,
  handleApproveSubmit,
  handleRejectSubmit,
  approveMutationPending,
  rejectMutationPending,
}) {
  if (!selectedPayout) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-[#2B3139] bg-[#12161C] p-6 shadow-2xl animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#2B3139] pb-4">
          <h3 className="text-lg font-black text-[#EAECEF] flex items-center gap-2">
            <Landmark className="h-5 w-5 text-[#F0B90B]" />
            {modalType === 'APPROVE' ? 'Approve Payout Request' : 'Reject Payout Request'}
          </h3>
          <button
            type="button"
            aria-label="Close modal"
            onClick={closeModal}
            className="rounded-xl p-1 text-[#5E6673] hover:bg-[#2B3139] hover:text-[#EAECEF] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Wholesaler / Amount summary */}
        <div className="mt-4 rounded-2xl bg-[#f8f2e8] p-4 text-sm text-[#EAECEF] space-y-2 border border-[#2B3139]/40">
          <div className="flex justify-between">
            <span className="font-bold text-[#848E9C]">Supplier:</span>
            <span className="font-extrabold text-[#161412]">
              {selectedPayout.wholesaler?.businessName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-[#848E9C]">Requested Amount:</span>
            <span className="font-black text-[#F0B90B]">
              ₹{Number(selectedPayout.amount).toFixed(2)}
            </span>
          </div>
          {selectedPayout.supplierNotes && (
            <div className="border-t border-[#2B3139]/20 pt-2 mt-2">
              <span className="font-bold text-[#848E9C] block text-xs">
                Supplier Request Notes:
              </span>
              <span className="italic text-xs text-[#848E9C]">
                &quot;{selectedPayout.supplierNotes}&quot;
              </span>
            </div>
          )}
        </div>

        {/* Modal Form */}
        {modalType === 'APPROVE' ? (
          <form onSubmit={handleApproveSubmit} className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-500/20 bg-[#0ECB81]/5 p-4 flex gap-3 text-xs text-emerald-800 leading-normal">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">Before Approving</p>
                <p className="mt-0.5">
                  Ensure you have executed the transfer of ₹
                  {Number(selectedPayout.amount).toFixed(2)} to their bank/UPI details. Record the
                  transaction reference number below.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="transactionRef"
                className="block text-xs font-bold uppercase tracking-wider text-[#848E9C]"
              >
                Transaction Reference / UTR Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="transactionRef"
                required
                placeholder="e.g. Bank UTR, UPI Txn ID, IMPS ref number"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-[#2B3139] bg-[#12161C] px-4 py-2.5 text-sm text-[#EAECEF] placeholder-[#5E6673] focus:border-[#F0B90B]/50 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="adminNotes"
                className="block text-xs font-bold uppercase tracking-wider text-[#848E9C]"
              >
                Internal / Settlement Notes (Optional)
              </label>
              <textarea
                id="adminNotes"
                rows={2}
                placeholder="Add any internal reference or notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-[#2B3139] bg-[#12161C] px-4 py-2.5 text-sm text-[#EAECEF] placeholder-[#5E6673] focus:border-[#F0B90B]/50 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#2B3139]">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-[#2B3139] px-4 py-2 text-sm font-bold text-[#848E9C] hover:bg-[#2B3139] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={approveMutationPending}
                className="rounded-xl bg-[#F0B90B] hover:bg-[#F0B90B]/80 px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50"
              >
                {approveMutationPending ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRejectSubmit} className="mt-6 space-y-4">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex gap-3 text-xs text-red-800 leading-normal">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-bold">Payout Rejection Notice</p>
                <p className="mt-0.5">
                  This will decline the payout request. Declining will return the requested amount
                  back to the supplier&apos;s withdrawable balance immediately.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="rejectionReason"
                className="block text-xs font-bold uppercase tracking-wider text-[#848E9C]"
              >
                Rejection Reason / Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejectionReason"
                required
                rows={3}
                placeholder="State the reason why this withdrawal request was rejected..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-2 block w-full rounded-xl border border-[#2B3139] bg-[#12161C] px-4 py-2.5 text-sm text-[#EAECEF] placeholder-[#5E6673] focus:border-[#F0B90B]/50 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#2B3139]">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-[#2B3139] px-4 py-2 text-sm font-bold text-[#848E9C] hover:bg-[#2B3139] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejectMutationPending}
                className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50"
              >
                {rejectMutationPending ? 'Rejecting...' : 'Decline Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
