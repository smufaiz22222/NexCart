import { useState, useMemo } from 'react';
import { BookOpen, Plus, ArrowUpRight, ArrowDownRight, FileText, Shield, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLedgerEntries, useRecordPayment, useWholesalerBuyers, useUpdateCreditLimit } from '../api/queries';

export default function Ledger() {
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' or 'credits'
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for recording a new payment
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    description: 'Payment received',
    referenceId: '',
  });

  const { data: entries = [], isLoading, isError, error, isFetching, refetch } = useLedgerEntries();
  const { data: buyers = [], isLoading: isBuyersLoading, refetch: refetchBuyers } = useWholesalerBuyers();
  const updateCreditLimit = useUpdateCreditLimit();
  const [editingLimit, setEditingLimit] = useState({});

  const recordPaymentMutation = useRecordPayment();

  const handleUpdateLimit = (buyerId) => {
    const limit = editingLimit[buyerId];
    if (limit === undefined || limit === '' || isNaN(parseFloat(limit))) {
      return toast.error("Please enter a valid credit limit amount.");
    }
    updateCreditLimit.mutate({ buyerId, creditLimit: parseFloat(limit) }, {
      onSuccess: () => {
        toast.success("Credit limit updated successfully!");
        refetchBuyers();
      },
      onError: (err) => {
        toast.error(err.response?.data?.error || "Failed to update credit limit");
      }
    });
  };

  // UX Magic: Extract unique buyers from the ledger history so we can put them in a dropdown!
  const uniqueBuyers = useMemo(() => {
    const buyersMap = new Map();
    entries.forEach((entry) => {
      if (entry.user && entry.userId && !buyersMap.has(entry.userId)) {
        buyersMap.set(entry.userId, entry.user);
      }
    });
    return Array.from(buyersMap.entries()).map(([id, user]) => ({ id, ...user }));
  }, [entries]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    recordPaymentMutation.mutate(
      {
        ...formData,
        amount: parseFloat(formData.amount),
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setFormData({ userId: '', amount: '', description: 'Payment received', referenceId: '' });
          toast.success('Payment recorded successfully!');
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to record payment');
        },
      }
    );
  };

  return (
    <div className="space-y-6 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            Accounting Hub
            {isFetching && !isLoading && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                Syncing...
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track marketplace sales, record manual settlements, and configure B2B client credit lines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-[#0a0a0a] p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'ledger' ? 'bg-amber-50 text-[#0a0a0a]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ledger History
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'credits' ? 'bg-amber-50 text-[#0a0a0a]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              B2B Credit Lines
            </button>
          </div>

          {activeTab === 'ledger' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center px-4 py-2.5 bg-emerald-500 text-[#0a0a0a] font-bold rounded-md hover:bg-emerald-400 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-[0.98]"
            >
              <Plus className="h-5 w-5 mr-2" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {activeTab === 'ledger' ? (
        <>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
            Marketplace COD orders are now settled automatically when you mark them as delivered. Use
            <span className="font-semibold"> Record Payment </span>
            only for exceptional offline collections or manual ledger adjustments that are outside the
            normal marketplace order flow.
          </div>

          {/* Ledger Table */}
          {isError ? (
            <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-red-500/20 p-12 flex flex-col items-center justify-center text-center">
              <p className="text-red-400 text-sm font-semibold mb-4">
                Failed to load accounting records:{' '}
                {error?.response?.data?.error || error?.message || 'Unknown error'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md transition-all active:scale-[0.98]"
              >
                Retry Loading
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 text-amber-500 space-y-4">
              <FileText className="h-8 w-8 animate-pulse" />
              <p className="font-medium tracking-widest uppercase text-sm">
                Loading accounting records...
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-dashed border-zinc-700 p-12 flex flex-col items-center justify-center text-center">
              <div className="bg-[#0a0a0a] p-5 rounded-full mb-5 border border-zinc-800 shadow-inner">
                <BookOpen className="h-10 w-10 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-white tracking-wide">Clean Ledger</h3>
              <p className="mt-2 text-zinc-400 max-w-md">
                No financial transactions have occurred yet. Once customers buy from your shop, order
                charges, automatic COD settlements, return adjustments, and manual payments will appear
                here.
              </p>
            </div>
          ) : (
            <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-800">
                  <thead className="bg-[#0a0a0a]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Buyer
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Ref ID
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Amount (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#1c1c1c] divide-y divide-zinc-800/50">
                    {entries.map((entry) => {
                      const amount = parseFloat(entry.amount);
                      const isCredit = amount > 0;

                      return (
                        <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 font-mono">
                            {new Date(entry.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                              {entry.user?.name || 'System'}
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">{entry.user?.email}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-300">{entry.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 font-mono">
                            {entry.referenceId ? (
                              <span className="bg-zinc-800 px-2 py-1 rounded text-xs">
                                {entry.referenceId.slice(0, 8).toUpperCase()}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold flex justify-end items-center h-full">
                            <span
                              className={`px-3 py-1.5 rounded-sm flex items-center tracking-wide border ${
                                isCredit
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20 drop-shadow-[0_0_8px_rgba(248,113,113,0.2)]'
                              }`}
                            >
                              {isCredit ? (
                                <ArrowUpRight className="h-4 w-4 mr-1.5" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 mr-1.5" />
                              )}
                              {isCredit ? '+' : ''}
                              {Math.abs(amount).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Credits tab content */
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-[#1c1c1c] p-4 text-sm text-zinc-300">
            Set custom credit limits for approved B2B retail buyers. If a buyer's outstanding dues with your business exceed this threshold, credit ledger checkouts will be restricted.
          </div>

          {isBuyersLoading ? (
            <div className="flex flex-col items-center justify-center py-32 text-amber-500 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="font-medium tracking-widest uppercase text-sm">
                Loading B2B credit lines...
              </p>
            </div>
          ) : buyers.length === 0 ? (
            <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-dashed border-zinc-700 p-12 flex flex-col items-center justify-center text-center">
              <div className="bg-[#0a0a0a] p-5 rounded-full mb-5 border border-zinc-800 shadow-inner">
                <Shield className="h-10 w-10 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-white tracking-wide">No B2B Retail Partners</h3>
              <p className="mt-2 text-zinc-400 max-w-md">
                Once retail buyers are approved in the marketplace by the Super Admin, they will show up here so you can assign them credit limits.
              </p>
            </div>
          ) : (
            <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-800">
                  <thead className="bg-[#0a0a0a]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Retail Buyer / Company
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Tax ID / GSTIN
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Address
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Outstanding Balance (₹)
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                        Wholesale Credit Limit (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#1c1c1c] divide-y divide-zinc-800/50">
                    {buyers.map((buyer) => {
                      const balanceValue = parseFloat(buyer.balance);
                      const isOwed = balanceValue < 0;

                      return (
                        <tr key={buyer.buyerId} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                              {buyer.companyName}
                            </div>
                            <div className="text-xs text-zinc-500 mt-0.5">Contact: {buyer.name} · {buyer.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 font-mono">
                            {buyer.taxId}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-400 truncate max-w-xs" title={buyer.businessAddress}>
                            {buyer.businessAddress}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${isOwed ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isOwed ? '-' : ''}₹{Math.abs(balanceValue).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-zinc-500 font-mono text-sm">₹</span>
                              <input
                                type="number"
                                placeholder={buyer.creditLimit}
                                value={editingLimit[buyer.buyerId] !== undefined ? editingLimit[buyer.buyerId] : ''}
                                onChange={(e) => setEditingLimit({
                                  ...editingLimit,
                                  [buyer.buyerId]: e.target.value
                                })}
                                className="w-28 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-right text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                              />
                              <button
                                onClick={() => handleUpdateLimit(buyer.buyerId)}
                                disabled={updateCreditLimit.isPending}
                                className="bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 rounded text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Payment Modal - Dark Glassmorphism */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1c1c1c] rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-zinc-800 flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-800 bg-[#0a0a0a]">
              <h3 className="text-lg font-bold text-white tracking-wide">Record Manual Payment</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Log cash or bank transfers that were received outside the automatic marketplace
                settlement flow.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Select Buyer *
                </label>
                <select
                  required
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: `right .5rem center`,
                    backgroundRepeat: `no-repeat`,
                    backgroundSize: `1.5em 1.5em`,
                  }}
                >
                  <option value="" disabled className="text-zinc-600">
                    -- Choose a customer --
                  </option>
                  {uniqueBuyers.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.name} ({buyer.email})
                    </option>
                  ))}
                </select>
                {uniqueBuyers.length === 0 && (
                  <p className="text-[11px] font-bold tracking-widest uppercase text-amber-500 mt-2">
                    No buyers found. A user must make a purchase first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Amount Received (₹) *
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <input
                  required
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Reference ID{' '}
                  <span className="text-zinc-600 normal-case font-normal ml-1">
                    (Check #, Bank Txn)
                  </span>
                </label>
                <input
                  type="text"
                  name="referenceId"
                  placeholder="Optional"
                  value={formData.referenceId}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                />
              </div>

              <div className="pt-6 flex justify-end space-x-3 border-t border-zinc-800/50 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-zinc-700 rounded-md text-sm font-medium text-zinc-300 bg-[#1c1c1c] hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending || uniqueBuyers.length === 0}
                  className="px-5 py-2.5 border border-transparent rounded-md text-sm font-bold text-[#0a0a0a] bg-emerald-500 hover:bg-emerald-400 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {recordPaymentMutation.isPending ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
