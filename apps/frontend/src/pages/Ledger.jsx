import { useState, useEffect } from 'react';
import { BookOpen, Plus, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';
import apiClient from '../api/axios';

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [uniqueBuyers, setUniqueBuyers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for recording a new payment
  const [formData, setFormData] = useState({
    userId: '',
    amount: '',
    description: 'Payment received',
    referenceId: ''
  });

  const fetchLedger = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/ledger');
      const ledgerData = response.data.entries;
      setEntries(ledgerData);

      // UX Magic: Extract unique buyers from the ledger history so we can put them in a dropdown!
      const buyersMap = new Map();
      ledgerData.forEach(entry => {
        if (entry.user && entry.userId && !buyersMap.has(entry.userId)) {
          buyersMap.set(entry.userId, entry.user);
        }
      });
      
      setUniqueBuyers(Array.from(buyersMap.entries()).map(([id, user]) => ({ id, ...user })));
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/ledger/payment', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      await fetchLedger(); // Refresh the table
      setIsModalOpen(false);
      setFormData({ userId: '', amount: '', description: 'Payment received', referenceId: '' });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Financial Ledger</h1>
          <p className="text-sm text-zinc-400 mt-1">Track marketplace sales and customer payments.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2.5 bg-emerald-500 text-[#0a0a0a] font-bold rounded-md hover:bg-emerald-400 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5 mr-2" />
          Record Payment
        </button>
      </div>

      {/* Ledger Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-amber-500 space-y-4">
          <FileText className="h-8 w-8 animate-pulse" />
          <p className="font-medium tracking-widest uppercase text-sm">Loading accounting records...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-dashed border-zinc-700 p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-[#0a0a0a] p-5 rounded-full mb-5 border border-zinc-800 shadow-inner">
            <BookOpen className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-white tracking-wide">Clean Ledger</h3>
          <p className="mt-2 text-zinc-400 max-w-md">No financial transactions have occurred yet. Once customers buy from your shop, debts and payments will appear here.</p>
        </div>
      ) : (
        <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-[#0a0a0a]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">Buyer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">Description</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">Ref ID</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-amber-500/80 uppercase tracking-widest">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="bg-[#1c1c1c] divide-y divide-zinc-800/50">
                {entries.map((entry) => {
                  const amount = parseFloat(entry.amount);
                  const isCredit = amount > 0; // Positive = Wholesaler received cash. Negative = Debt created from sale.

                  return (
                    <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 font-mono">
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{entry.user?.name || 'System'}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{entry.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 font-mono">
                        {entry.referenceId ? (
                          <span className="bg-zinc-800 px-2 py-1 rounded text-xs">{entry.referenceId.slice(0, 8).toUpperCase()}</span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold flex justify-end items-center h-full">
                        <span className={`px-3 py-1.5 rounded-sm flex items-center tracking-wide border ${
                          isCredit 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20 drop-shadow-[0_0_8px_rgba(248,113,113,0.2)]'
                        }`}>
                          {isCredit ? <ArrowUpRight className="h-4 w-4 mr-1.5" /> : <ArrowDownRight className="h-4 w-4 mr-1.5" />}
                          {isCredit ? '+' : ''}{Math.abs(amount).toFixed(2)}
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

      {/* Record Payment Modal - Dark Glassmorphism */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1c1c1c] rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-zinc-800 flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-800 bg-[#0a0a0a]">
              <h3 className="text-lg font-bold text-white tracking-wide">Record Manual Payment</h3>
              <p className="text-xs text-zinc-400 mt-1">Log cash or bank transfers received from buyers.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Select Buyer *</label>
                <select 
                  required 
                  name="userId" 
                  value={formData.userId} 
                  onChange={handleChange} 
                  className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                >
                  <option value="" disabled className="text-zinc-600">-- Choose a customer --</option>
                  {uniqueBuyers.map(buyer => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.name} ({buyer.email})
                    </option>
                  ))}
                </select>
                {uniqueBuyers.length === 0 && (
                  <p className="text-[11px] font-bold tracking-widest uppercase text-amber-500 mt-2">No buyers found. A user must make a purchase first.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Amount Received (₹) *</label>
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
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Description</label>
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
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Reference ID <span className="text-zinc-600 normal-case font-normal ml-1">(Check #, Bank Txn)</span></label>
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
                  disabled={isSubmitting || uniqueBuyers.length === 0} 
                  className="px-5 py-2.5 border border-transparent rounded-md text-sm font-bold text-[#0a0a0a] bg-emerald-500 hover:bg-emerald-400 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {isSubmitting ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}