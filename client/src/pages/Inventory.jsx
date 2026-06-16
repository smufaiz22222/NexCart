import { useState, useEffect } from 'react';
import { Archive, PlusSquare, FileText } from 'lucide-react';
import apiClient from '../api/axios';

export default function Inventory() {
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]); // Needed for the dropdown
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for adjusting stock
  const [formData, setFormData] = useState({
    productId: '',
    changeAmount: '',
    reason: 'MANUAL_ADJUSTMENT', // Default reason
  });

  // Fetch both the logs and the products (for the dropdown)
  const fetchData = async () => {
    try {
      const [logsRes, productsRes] = await Promise.all([
        apiClient.get('/inventory'),
        apiClient.get('/products'),
      ]);
      setLogs(logsRes.data.logs);
      setProducts(productsRes.data.products);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/inventory', {
        productId: formData.productId,
        changeAmount: parseInt(formData.changeAmount, 10),
        reason: formData.reason,
      });

      // Refresh the table, close modal, reset form
      fetchData();
      setIsModalOpen(false);
      setFormData({ productId: '', changeAmount: '', reason: 'MANUAL_ADJUSTMENT' });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to adjust inventory');
    }
  };

  return (
    <div className="space-y-6 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Inventory Logs</h1>
          <p className="text-sm text-zinc-400 mt-1">Immutable record of all stock movements.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2.5 bg-amber-500 text-[#0a0a0a] font-bold rounded-md hover:bg-amber-400 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-[0.98]"
        >
          <PlusSquare className="h-5 w-5 mr-2" />
          Adjust Stock
        </button>
      </div>

      {/* Inventory Logs Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-amber-500 space-y-4">
          <FileText className="h-8 w-8 animate-pulse" />
          <p className="font-medium tracking-widest uppercase text-sm">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-dashed border-zinc-700 p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-[#0a0a0a] p-5 rounded-full mb-5 border border-zinc-800 shadow-inner">
            <Archive className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-white tracking-wide">No stock movements yet</h3>
          <p className="mt-2 text-zinc-400 max-w-sm">
            When you add stock or process an order, the immutable logs will appear here.
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
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                    Reason
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#1c1c1c] divide-y divide-zinc-800/50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 font-mono">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        {log.product.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono tracking-wider mt-0.5">
                        SKU: {log.product.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-[10px] leading-5 font-bold uppercase tracking-widest rounded-sm bg-zinc-800 text-zinc-300 border border-zinc-700 shadow-inner">
                        {log.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-base font-black ${
                          log.changeAmount > 0
                            ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                            : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.2)]'
                        }`}
                      >
                        {log.changeAmount > 0 ? `+${log.changeAmount}` : log.changeAmount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal - Dark Glassmorphism */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1c1c1c] rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-zinc-800 flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-800 bg-[#0a0a0a]">
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center">
                <PlusSquare className="h-5 w-5 mr-2 text-amber-500" />
                Adjust Inventory Stock
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Select Product *
                </label>
                <select
                  required
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: `right .5rem center`,
                    backgroundRepeat: `no-repeat`,
                    backgroundSize: `1.5em 1.5em`,
                  }}
                >
                  <option value="" disabled className="text-zinc-600">
                    -- Choose a product --
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Quantity Change (+ or -) *
                </label>
                <input
                  required
                  type="number"
                  name="changeAmount"
                  placeholder="e.g. 50 or -10"
                  value={formData.changeAmount}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                />
                <p className="text-[11px] font-medium text-zinc-500 mt-1.5 uppercase tracking-wide">
                  Use a negative number to remove stock.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Reason *
                </label>
                <select
                  required
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: `right .5rem center`,
                    backgroundRepeat: `no-repeat`,
                    backgroundSize: `1.5em 1.5em`,
                  }}
                >
                  <option value="MANUAL_ADJUSTMENT">
                    Manual Adjustment (Adding/Removing Stock)
                  </option>
                  <option value="OCR_UPDATE">AI Khatta Update</option>
                  <option value="REFUND">Customer Refund</option>
                </select>
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
                  className="px-5 py-2.5 border border-transparent rounded-md text-sm font-bold text-[#0a0a0a] bg-amber-500 hover:bg-amber-400 transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
