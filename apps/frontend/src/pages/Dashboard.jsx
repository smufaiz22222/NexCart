import { useState, useEffect } from 'react';
import { Package, AlertCircle, DollarSign, Wallet, Activity, MousePointerClick, ShoppingCart, Target, RadioTower } from 'lucide-react';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import apiClient from '../api/axios';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [ledgerStats, setLedgerStats] = useState({ totalDebt: 0, totalCollection: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [advancedData, setAdvancedData] = useState({ chartData: [], topProducts: [] });
  const [recommendationAnalytics, setRecommendationAnalytics] = useState(null);
  const [timeframe, setTimeframe] = useState('monthly'); // Default to monthly

  // Update the useEffect to watch for timeframe changes
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [prodRes, ledgerRes, advRes, recRes] = await Promise.all([
          apiClient.get('/products'),
          apiClient.get('/stats/wholesaler-summary'),
          apiClient.get(`/stats/advanced-summary?timeframe=${timeframe}`), // Pass timeframe here!
          apiClient.get('/recommendations/analytics')
        ]);
        
        setProducts(prodRes.data.products);
        setLedgerStats(ledgerRes.data);
        setAdvancedData(advRes.data);
        setRecommendationAnalytics(recRes.data);
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
    return (
      <div className="flex flex-col items-center justify-center py-32 text-amber-500 space-y-4 font-sans">
        <Activity className="h-8 w-8 animate-pulse" />
        <p className="font-medium tracking-widest uppercase text-sm">Loading business analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans selection:bg-amber-500/30 selection:text-amber-200 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-wide">Wholesaler Command Center</h1>
        <p className="text-sm text-zinc-400 mt-1">Real-time overview of your inventory and market credit.</p>
      </div>

      {/* --- FINANCIAL & INVENTORY STATS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Market Debt"
          value={`₹${ledgerStats.totalDebt?.toLocaleString()}`}
          icon={AlertCircle}
          color="text-red-400"
          bg="bg-red-500/10 border-red-500/20"
          desc="Money owed to you"
        />
        <StatCard
          title="Total Collection"
          value={`₹${ledgerStats.totalCollection?.toLocaleString()}`}
          icon={Wallet}
          color="text-emerald-400"
          bg="bg-emerald-500/10 border-emerald-500/20"
          desc="Cash received"
        />
        <StatCard
          title="Inventory Value"
          value={`₹${totalInventoryValue.toLocaleString()}`}
          icon={DollarSign}
          color="text-amber-500"
          bg="bg-amber-500/10 border-amber-500/20"
          desc="Stock asset value"
        />
        <StatCard
          title="Products"
          value={totalProducts}
          icon={Package}
          color="text-zinc-300"
          bg="bg-zinc-800/50 border-zinc-700"
          desc="Unique SKUs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Reco CTR"
          value={`${(((recommendationAnalytics?.recommendationCtr || 0) * 100)).toFixed(1)}%`}
          icon={MousePointerClick}
          color="text-sky-400"
          bg="bg-sky-500/10 border-sky-500/20"
          desc="Clicks from recommendations"
        />
        <StatCard
          title="Reco Cart Rate"
          value={`${(((recommendationAnalytics?.recommendationCartRate || 0) * 100)).toFixed(1)}%`}
          icon={ShoppingCart}
          color="text-violet-400"
          bg="bg-violet-500/10 border-violet-500/20"
          desc="Recommendation to cart"
        />
        <StatCard
          title="Reco Conversion"
          value={`${(((recommendationAnalytics?.recommendationConversionRate || 0) * 100)).toFixed(1)}%`}
          icon={Target}
          color="text-emerald-400"
          bg="bg-emerald-500/10 border-emerald-500/20"
          desc="Recommendation to purchase"
        />
        <StatCard
          title="Coverage"
          value={`${(((recommendationAnalytics?.coverage || 0) * 100)).toFixed(1)}%`}
          icon={RadioTower}
          color="text-amber-500"
          bg="bg-amber-500/10 border-amber-500/20"
          desc="Catalog recommended"
        />
      </div>

      {/* --- ROW 1: STOCK CHART & ALERTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1c1c1c] rounded-xl shadow-xl border border-zinc-800 p-6">
          <h3 className="text-sm font-bold text-amber-500/80 uppercase tracking-widest mb-6">Stock Assets vs Quantity</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 12}} />
                <Tooltip 
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="stock" fill="#d4d4d8" radius={[4, 4, 0, 0]} name="Units in Hand" />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Value (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1c1c1c] rounded-xl shadow-xl border border-zinc-800 p-6">
          <h3 className="text-sm font-bold text-amber-500/80 uppercase tracking-widest mb-6 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Critical Stock Alerts
          </h3>
          <div className="space-y-3">
            {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-6 text-center">
                <Package className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-zinc-400">Inventory looks healthy.</p>
                <p className="text-xs text-zinc-500 mt-1">Everything is currently in stock.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[300px] pr-2 custom-scrollbar space-y-2">
                {outOfStockProducts.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3.5 bg-red-500/10 rounded-lg border border-red-500/20 group hover:bg-red-500/20 transition-colors">
                    <span className="text-sm font-semibold text-red-400 truncate mr-2">{p.name}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-[#0a0a0a] px-2 py-1 rounded shadow-sm border border-red-900/50 flex-shrink-0">Out</span>
                  </div>
                ))}
                {lowStockProducts.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3.5 bg-orange-500/10 rounded-lg border border-orange-500/20 group hover:bg-orange-500/20 transition-colors">
                    <span className="text-sm font-semibold text-orange-400 truncate mr-2">{p.name}</span>
                    <span className="text-xs font-bold text-orange-500 flex-shrink-0">{p.currentStock} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- ROW 2: PROFIT TRENDS & TOP PRODUCTS (NEW) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Profit Area Chart with Timeframe Toggle */}
        <div className="bg-[#1c1c1c] p-6 rounded-xl shadow-xl border border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h3 className="text-sm font-bold text-amber-500/80 uppercase tracking-widest">Profit & Revenue Trends</h3>
            <div className="flex bg-[#0a0a0a] p-1 rounded-md border border-zinc-800">
              {['daily', 'monthly', 'yearly'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded capitalize transition-all duration-200 ${
                    timeframe === tf 
                      ? 'bg-amber-500 text-[#0a0a0a] shadow-[0_0_10px_rgba(245,158,11,0.2)]' 
                      : 'text-zinc-500 hover:text-zinc-300'
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
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 12}}/>
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 12}}/>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Sales (₹)" />
                <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name="Net Profit (₹)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-[#1c1c1c] p-6 rounded-xl shadow-xl border border-zinc-800">
          <h3 className="text-sm font-bold text-amber-500/80 uppercase tracking-widest mb-6">Top Performance (Volume)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                  <th className="pb-3 font-bold">Product</th>
                  <th className="pb-3 font-bold">Price</th>
                  <th className="pb-3 font-bold text-center">Sold</th>
                  <th className="pb-3 font-bold text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {advancedData?.topProducts && advancedData.topProducts.length > 0 ? (
                  advancedData.topProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="py-3.5 pr-2 font-semibold text-white group-hover:text-amber-400 transition-colors text-sm">{p.name}</td>
                      <td className="py-3.5 pr-2 text-zinc-400 text-sm font-mono">₹{p.price}</td>
                      <td className="py-3.5 px-2 text-center text-sm font-bold text-zinc-300">
                        <span className="bg-zinc-800 px-2.5 py-1 rounded text-xs">{p.sold}</span>
                      </td>
                      <td className="py-3.5 pl-2 text-right font-bold text-emerald-400 text-sm drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                        +₹{p.profit?.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-500">
                        <Package className="h-8 w-8 mb-2 opacity-50" />
                        <span className="text-sm">No sales data available yet.</span>
                      </div>
                    </td>
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

// Upgraded StatCard Component
function StatCard({ title, value, icon: Icon, color, bg, desc }) {
  return (
    <div className="bg-[#1c1c1c] rounded-xl shadow-xl border border-zinc-800 p-5 group hover:border-amber-500/30 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg border ${bg} ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{title}</span>
      </div>
      <p className={`text-2xl font-black text-white tracking-wide`}>{value}</p>
      <p className="text-xs text-zinc-400 mt-1.5 font-medium">{desc}</p>
    </div>
  );
}
