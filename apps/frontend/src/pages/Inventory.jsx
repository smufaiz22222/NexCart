import { useState, useEffect } from 'react';
import { Archive, PlusSquare } from 'lucide-react';
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
        apiClient.get('/products')
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
        reason: formData.reason
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Immutable record of all stock movements.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <PlusSquare className="h-5 w-5 mr-2" />
          Adjust Stock
        </button>
      </div>

      {/* Inventory Logs Table */}
      {isLoading ? (
        <div className="flex justify-center py-20 text-gray-500">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
          <Archive className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No stock movements yet</h3>
          <p className="mt-1 text-gray-500 max-w-sm">When you add stock or process an order, the immutable logs will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{log.product.name}</div>
                    <div className="text-xs text-gray-500">SKU: {log.product.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {log.reason}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${log.changeAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {log.changeAmount > 0 ? `+${log.changeAmount}` : log.changeAmount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Adjust Inventory Stock</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Product *</label>
                <select required name="productId" value={formData.productId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="" disabled>-- Choose a product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.currentStock})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity Change (+ or -) *</label>
                <input required type="number" name="changeAmount" placeholder="e.g. 50 or -10" value={formData.changeAmount} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                <p className="text-xs text-gray-500 mt-1">Use a negative number to remove stock.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason *</label>
                <select required name="reason" value={formData.reason} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="MANUAL_ADJUSTMENT">Manual Adjustment (Adding/Removing Stock)</option>
                  <option value="OCR_UPDATE">AI Khatta Update</option>
                  <option value="REFUND">Customer Refund</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
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