import { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertCircle, DollarSign, Wallet, Users } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import apiClient from '../api/axios';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [ledgerStats, setLedgerStats] = useState({ totalDebt: 0, totalCollection: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [advancedData, setAdvancedData] = useState({ chartData: [], topProducts: [] });
  const [timeframe, setTimeframe] = useState('monthly'); // Default to monthly

  // Update the useEffect to watch for timeframe changes
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [prodRes, ledgerRes, advRes] = await Promise.all([
          apiClient.get('/products'),
          apiClient.get('/stats/wholesaler-summary'),
          apiClient.get(`/stats/advanced-summary?timeframe=${timeframe}`) // Pass timeframe here!
        ]);
        
        setProducts(prodRes.data.products);
        setLedgerStats(ledgerRes.data);
        setAdvancedData(advRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [timeframe]); // Re-run when timeframe changes

  // --- Inventory Calculations ---
  const totalProducts = products.length;
  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.currentStock), 0);
  const lowStockProducts = products.filter(p => p.currentStock < 10 && p.currentStock > 0);
  const outOfStockProducts = products.filter(p => p.currentStock === 0);

  // --- Prepare Chart Data (Combining Inventory Value & Stock) ---
  const chartData = products.slice(0, 8).map(p => ({
    name: p.name.split(' ')[0], // Shorten name for chart
    stock: p.currentStock,
    value: p.price * p.currentStock
  }));

  if (isLoading) {
    return <div className="flex justify-center py-20 text-gray-500">Loading business analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wholesaler Command Center</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time overview of your inventory and market credit.</p>
      </div>

      {/* --- FINANCIAL & INVENTORY STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Market Debt"
          value={`₹${ledgerStats.totalDebt?.toLocaleString()}`}
          icon={AlertCircle}
          color="text-red-600"
          bg="bg-red-50"
          desc="Money owed to you"
        />
        <StatCard
          title="Total Collection"
          value={`₹${ledgerStats.totalCollection?.toLocaleString()}`}
          icon={Wallet}
          color="text-green-600"
          bg="bg-green-50"
          desc="Cash received"
        />
        <StatCard
          title="Inventory Value"
          value={`₹${totalInventoryValue.toLocaleString()}`}
          icon={DollarSign}
          color="text-blue-600"
          bg="bg-blue-50"
          desc="Stock asset value"
        />
        <StatCard
          title="Products"
          value={totalProducts}
          icon={Package}
          color="text-purple-600"
          bg="bg-purple-50"
          desc="Unique SKUs"
        />
      </div>

      {/* --- ROW 1: STOCK CHART & ALERTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Assets vs Quantity</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} />
                <Legend />
                <Bar dataKey="stock" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Units in Hand" />
                <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} name="Value (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
            Critical Stock Alerts
          </h3>
          <div className="space-y-3">
            {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Everything is in stock.</p>
            ) : (
              <>
                {outOfStockProducts.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <span className="text-xs font-bold text-red-700 truncate">{p.name}</span>
                    <span className="text-[10px] font-black uppercase text-red-600 bg-white px-2 py-1 rounded">Out</span>
                  </div>
                ))}
                {lowStockProducts.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <span className="text-xs font-bold text-orange-700 truncate">{p.name}</span>
                    <span className="text-xs font-bold text-orange-600">{p.currentStock} left</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- ROW 2: PROFIT TRENDS & TOP PRODUCTS (NEW) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Profit Area Chart with Timeframe Toggle */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Profit & Revenue Trends</h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {['daily', 'monthly', 'yearly'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                    timeframe === tf 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={advancedData?.chartData || []}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}}/>
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRevenue)" name="Sales (₹)" />
                <Area type="monotone" dataKey="profit" stroke="#10B981" fillOpacity={1} fill="url(#colorProfit)" name="Net Profit (₹)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Performance (Volume)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wider border-b">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Sold</th>
                  <th className="pb-3 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {advancedData?.topProducts && advancedData.topProducts.length > 0 ? (
                  advancedData.topProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="py-3 text-gray-600">₹{p.price}</td>
                      <td className="py-3 font-bold text-blue-600">{p.sold} units</td>
                      <td className="py-3 text-right font-bold text-green-600">+₹{p.profit?.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-gray-500 text-sm">No sales data available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// Simple StatCard Sub-component for clean code
function StatCard({ title, value, icon: Icon, color, bg, desc }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${bg} ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      <p className={`text-2xl font-bold text-gray-900`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}