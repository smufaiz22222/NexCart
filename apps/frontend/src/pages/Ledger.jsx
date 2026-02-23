import { useState, useEffect } from 'react';
import { BookOpen, DollarSign } from 'lucide-react';
import apiClient from '../api/axios';

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Extract unique customers from the entries so we can populate the Payment dropdown
  const uniqueCustomers = Array.from(new Set(entries.map(e => e.customerId)))
    .map(id => entries.find(e => e.customerId === id)?.customer)
    .filter(Boolean);

  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    referenceId: ''
  });

  const fetchLedger = async () => {
    try {
      const response = await apiClient.get('/ledger');
      setEntries(response.data.entries);
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
    try {
      await apiClient.post('/ledger/payment', {
        customerId: formData.customerId,
        amount: parseFloat(formData.amount),
        description: 'Manual payment received', 
        referenceId: formData.referenceId || 'CASH'
      });
      
      fetchLedger();
      setIsModalOpen(false);
      setFormData({ customerId: '', amount: '', referenceId: '' });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Immutable record of debts and payments.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <DollarSign className="h-5 w-5 mr-2" />
          Record Payment
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-gray-500">Loading ledger...</div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No financial records</h3>
          <p className="mt-1 text-gray-500 max-w-sm">When orders are placed or payments are made, they appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => {
                // FIXED: Force the amount to be a math number
                const numericAmount = Number(entry.amount); 
                
                return (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.customer?.user?.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                      <span className={numericAmount < 0 ? 'text-red-600' : 'text-green-600'}>
                        {numericAmount < 0 
                          ? `-$${Math.abs(numericAmount).toFixed(2)}` 
                          : `+$${numericAmount.toFixed(2)}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Record Customer Payment</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Customer *</label>
                <select required name="customerId" value={formData.customerId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                  <option value="" disabled>-- Choose a customer --</option>
                  {uniqueCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.user?.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Amount ($) *</label>
                <input required type="number" step="0.01" min="0.01" name="amount" value={formData.amount} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reference / Notes</label>
                <input type="text" name="referenceId" placeholder="e.g. Cash, Check #123" value={formData.referenceId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}