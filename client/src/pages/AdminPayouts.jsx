import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Landmark,
  Check,
  X,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import apiClient from '../api/axios';

export default function AdminPayouts() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' or 'HISTORY'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [modalType, setModalType] = useState(null); // 'APPROVE' or 'REJECT'
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch all payout requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['adminPayoutRequests'],
    queryFn: async () => {
      const response = await apiClient.get('/payouts/admin/requests');
      return response.data;
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ payoutId, payload }) => {
      const response = await apiClient.post(`/payouts/admin/requests/${payoutId}/approve`, payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Payout approved successfully.');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['adminPayoutRequests'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to approve payout request.');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ payoutId, payload }) => {
      const response = await apiClient.post(`/payouts/admin/requests/${payoutId}/reject`, payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Payout request rejected.');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['adminPayoutRequests'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to reject payout request.');
    },
  });

  const closeModal = () => {
    setSelectedPayout(null);
    setModalType(null);
    setTransactionRef('');
    setAdminNotes('');
  };

  const handleApproveSubmit = (e) => {
    e.preventDefault();
    if (!transactionRef.trim()) {
      toast.error('Transaction reference number is required to approve payouts.');
      return;
    }
    approveMutation.mutate({
      payoutId: selectedPayout.id,
      payload: { transactionRef, adminNotes },
    });
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!adminNotes.trim()) {
      toast.error('Rejection reason (admin notes) is required to reject payouts.');
      return;
    }
    rejectMutation.mutate({
      payoutId: selectedPayout.id,
      payload: { adminNotes },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#F0B90B] border-t-transparent" />
      </div>
    );
  }

  const allRequests = requestsData?.requests || [];

  // Filter requests based on tab and search query
  const filteredRequests = allRequests.filter((req) => {
    const matchesStatus =
      activeTab === 'PENDING' ? req.status === 'PENDING' : req.status !== 'PENDING';
    const matchesSearch =
      req.wholesaler?.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.wholesalerId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingRequestsCount = allRequests.filter((r) => r.status === 'PENDING').length;
  const pendingAmountSum = allRequests
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="relative space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#2B3139] bg-[#12161C] p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#F0B90B]">
            Pending Payout Requests
          </p>
          <p className="mt-2 text-3xl font-black text-[#EAECEF]">{pendingRequestsCount}</p>
          <p className="text-xs text-[#5E6673] mt-1">Awaiting bank/UPI settlement</p>
        </div>

        <div className="rounded-2xl border border-[#2B3139] bg-[#12161C] p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[#F0B90B]">
            Total Pending Amount
          </p>
          <p className="mt-2 text-3xl font-black text-[#EAECEF]">
            {pendingAmountSum.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          </p>
          <p className="text-xs text-[#5E6673] mt-1">Sum of all outstanding requests</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#2B3139] bg-[#12161C] p-4 shadow-sm">
        {/* Tabs */}
        <div className="flex gap-2 bg-[#f8f2e8] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'PENDING'
                ? 'bg-[#2B3139] text-[#F0B90B] shadow-sm'
                : 'text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            Pending Requests ({pendingRequestsCount})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-[#2B3139] text-[#F0B90B] shadow-sm'
                : 'text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            Processed Logs
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5E6673]" />
          <input
            type="text"
            placeholder="Search by supplier name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search payouts by supplier name"
            className="w-full sm:w-64 rounded-xl border border-[#2B3139] bg-[#12161C] pl-9 pr-4 py-2 text-sm text-[#EAECEF] placeholder-[#5E6673] focus:border-[#F0B90B]/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-hidden rounded-2xl border border-[#2B3139] bg-[#12161C] shadow-sm">
        <table className="w-full text-left text-sm text-[#EAECEF]">
          <thead className="bg-[#f8f2e8] text-xs font-bold uppercase tracking-wider text-[#848E9C] border-b border-[#2B3139]">
            <tr>
              <th className="px-6 py-4">Supplier</th>
              <th className="px-6 py-4">Request Date</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Settlement Target</th>
              {activeTab === 'HISTORY' ? (
                <>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Transaction UTR</th>
                  <th className="px-6 py-4">Notes</th>
                </>
              ) : (
                <th className="px-6 py-4 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2B3139]">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#5E6673] italic">
                  No payout requests found matching these filters.
                </td>
              </tr>
            ) : (
              filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-[#fcfbf9]">
                  <td className="px-6 py-4">
                    <p className="font-bold text-[#EAECEF]">
                      {req.wholesaler?.businessName || 'Supplier'}
                    </p>
                    <p className="text-xs text-[#5E6673] font-mono">
                      {req.wholesalerId.slice(0, 8)}...
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-[#848E9C]">
                    {new Date(req.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-black text-[#EAECEF]">
                    ₹{Number(req.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    {req.upiId ? (
                      <div className="text-xs">
                        <span className="text-[#F0B90B] font-bold">UPI:</span>{' '}
                        <span className="font-mono bg-[#2B3139] px-1.5 py-0.5 rounded text-[#EAECEF]">
                          {req.upiId}
                        </span>
                      </div>
                    ) : req.bankAccountNo ? (
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-[#F0B90B]">{req.bankName}</p>
                        <p className="font-mono text-[#EAECEF]">A/C: {req.bankAccountNo}</p>
                        <p className="font-mono text-[#848E9C] text-[10px]">IFSC: {req.bankIfsc}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-red-500 italic">No bank details recorded!</span>
                    )}
                  </td>
                  {activeTab === 'HISTORY' ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {req.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-[#0ECB81]/20">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-[#F6465D]/20">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[#EAECEF]">
                        {req.transactionRef || <span className="text-[#5E6673]">—</span>}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#848E9C] max-w-xs truncate">
                        {req.status === 'REJECTED' && req.adminNotes && (
                          <span className="text-[#F6465D] block font-semibold">
                            Reason: {req.adminNotes}
                          </span>
                        )}
                        {req.status === 'APPROVED' && req.adminNotes && (
                          <span className="text-[#5E6673] block">Notes: {req.adminNotes}</span>
                        )}
                        {req.supplierNotes && (
                          <span className="block italic text-[#5E6673]">
                            Supplier note: "{req.supplierNotes}"
                          </span>
                        )}
                        {!req.adminNotes && !req.supplierNotes && (
                          <span className="text-[#5E6673]">—</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPayout(req);
                          setModalType('APPROVE');
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#1c8474] hover:bg-[#146357] px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPayout(req);
                          setModalType('REJECT');
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#d0a274] bg-[#12161C] hover:bg-[#2B3139] px-3.5 py-1.5 text-xs font-bold text-[#F0B90B] transition-all"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Overlay */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-[#2B3139] bg-[#12161C] p-6 shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2B3139] pb-4">
              <h3 className="text-lg font-black text-[#EAECEF] flex items-center gap-2">
                <Landmark className="h-5 w-5 text-[#F0B90B]" />
                {modalType === 'APPROVE' ? 'Approve Payout Request' : 'Reject Payout Request'}
              </h3>
              <button
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
                <span className="font-extrabold">{selectedPayout.wholesaler?.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#848E9C]">Requested Amount:</span>
                <span className="font-black text-[#F0B90B]">
                  ₹{Number(selectedPayout.amount).toFixed(2)}
                </span>
              </div>
              {selectedPayout.supplierNotes && (
                <div className="border-t border-[#2B3139] pt-2 mt-2">
                  <span className="font-bold text-[#848E9C] block text-xs">
                    Supplier Request Notes:
                  </span>
                  <span className="italic text-xs text-[#848E9C]">
                    "{selectedPayout.supplierNotes}"
                  </span>
                </div>
              )}
            </div>

            {/* Modals Form */}
            {modalType === 'APPROVE' ? (
              <form onSubmit={handleApproveSubmit} className="mt-6 space-y-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-[#0ECB81]/100/5 p-4 flex gap-3 text-xs text-emerald-800 leading-normal">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-bold">Before Approving</p>
                    <p className="mt-0.5">
                      Ensure you have executed the transfer of ₹
                      {Number(selectedPayout.amount).toFixed(2)} to their bank/UPI details. Record
                      the transaction reference number below.
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
                    disabled={approveMutation.isPending}
                    className="rounded-xl bg-[#F0B90B] hover:bg-[#F0B90B]/80 px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50"
                  >
                    {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
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
                      This will decline the payout request. Declining will return the requested
                      amount back to the supplier's withdrawable balance immediately.
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
                    disabled={rejectMutation.isPending}
                    className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-bold text-white transition disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? 'Rejecting...' : 'Decline Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
