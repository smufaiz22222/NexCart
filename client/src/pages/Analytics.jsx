import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  Gauge,
  PackageSearch,
  Radar,
  RadioTower,
  Scale,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import apiClient from '../api/axios';

const KPI_CARDS = [
  {
    key: 'revenue',
    label: 'Net Revenue',
    icon: TrendingUp,
    tone: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
    formatter: (value) => `₹${Number(value || 0).toLocaleString()}`,
  },
  {
    key: 'profit',
    label: 'Net Profit',
    icon: Gauge,
    tone: 'text-sky-300 border-sky-500/20 bg-sky-500/10',
    formatter: (value) => `₹${Number(value || 0).toLocaleString()}`,
  },
  {
    key: 'profitMargin',
    label: 'Profit Margin',
    icon: Scale,
    tone: 'text-amber-300 border-amber-500/20 bg-amber-500/10',
    formatter: (value) => `${(Number(value || 0) * 100).toFixed(1)}%`,
  },
  {
    key: 'inventoryValue',
    label: 'Inventory Value',
    icon: Boxes,
    tone: 'text-violet-300 border-violet-500/20 bg-violet-500/10',
    formatter: (value) => `₹${Number(value || 0).toLocaleString()}`,
  },
  {
    key: 'skuCount',
    label: 'Active SKUs',
    icon: ShoppingBag,
    tone: 'text-zinc-200 border-zinc-700 bg-zinc-800/70',
    formatter: (value) => Number(value || 0).toLocaleString(),
  },
  {
    key: 'slowMovingSkuCount',
    label: 'Slow Movers',
    icon: TrendingDown,
    tone: 'text-rose-300 border-rose-500/20 bg-rose-500/10',
    formatter: (value) => Number(value || 0).toLocaleString(),
  },
  {
    key: 'avgOrderValue',
    label: 'Average Order Value',
    icon: BarChart3,
    tone: 'text-cyan-300 border-cyan-500/20 bg-cyan-500/10',
    formatter: (value) => `₹${Number(value || 0).toLocaleString()}`,
  },
  {
    key: 'estimatedClv',
    label: 'Estimated CLV',
    icon: Radar,
    tone: 'text-fuchsia-300 border-fuchsia-500/20 bg-fuchsia-500/10',
    formatter: (value) => `₹${Number(value || 0).toLocaleString()}`,
  },
  {
    key: 'atRiskCustomerCount',
    label: 'At-Risk Customers',
    icon: Users,
    tone: 'text-orange-300 border-orange-500/20 bg-orange-500/10',
    formatter: (value) => Number(value || 0).toLocaleString(),
  },
];

export default function Analytics() {
  const [timeframe, setTimeframe] = useState('monthly');
  const [analytics, setAnalytics] = useState(null);
  const [recommendationAnalytics, setRecommendationAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        const [analyticsRes, recommendationRes] = await Promise.all([
          apiClient.get(`/stats/analytics-overview?timeframe=${timeframe}`),
          apiClient.get('/recommendations/analytics'),
        ]);
        setAnalytics(analyticsRes.data);
        setRecommendationAnalytics(recommendationRes.data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [timeframe]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-zinc-400">
        <Activity className="h-8 w-8 animate-pulse text-amber-500" />
        <p className="text-sm font-bold uppercase tracking-[0.24em]">Loading analytics deck</p>
      </div>
    );
  }

  const headline = analytics?.headline || {};
  const customerInsights = analytics?.customerInsights || {};
  const churnRisk = analytics?.churnRisk || { customers: [] };
  const trendRows = (analytics?.salesTrend || []).map((row) => ({
    ...row,
    marginPercent: Number((Number(row.profitMargin || 0) * 100).toFixed(1)),
  }));
  const recommendationFunnel = recommendationAnalytics?.funnel
    ? [
        { name: 'Impression', count: recommendationAnalytics.funnel.impression || 0 },
        { name: 'Click', count: recommendationAnalytics.funnel.click || 0 },
        { name: 'Cart', count: recommendationAnalytics.funnel.cart || 0 },
        { name: 'Purchase', count: recommendationAnalytics.funnel.purchase || 0 },
      ]
    : [];

  return (
    <div className="space-y-6 text-white">
      <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[#111111] shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-500/80">
              Wholesaler Analytics
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white md:text-4xl">
              Deep revenue, margin, retention, and recommendation visibility in one board.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              This page is the business-side workspace for sales performance, inventory drag,
              customer value, and recommendation effectiveness. Use the summary dashboard for daily
              operations, and use this screen when you need decisions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <QuickStrip
              label="Repeat Customer Rate"
              value={`${(Number(headline.repeatCustomerRate || 0) * 100).toFixed(1)}%`}
              detail={`${customerInsights.repeatCustomers || 0} of ${customerInsights.totalCustomers || 0} buyers`}
            />
            <QuickStrip
              label="Churn Watch"
              value={`${churnRisk.highRiskCount || 0} high / ${churnRisk.mediumRiskCount || 0} medium`}
              detail="Customers drifting out of the order cycle"
            />
            <QuickStrip
              label="Recommendation Coverage"
              value={`${((recommendationAnalytics?.coverage || 0) * 100).toFixed(1)}%`}
              detail="Catalog receiving recommendation impressions"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {KPI_CARDS.map((card) => (
          <KpiCard
            key={card.key}
            label={card.label}
            icon={card.icon}
            tone={card.tone}
            value={card.formatter(headline[card.key])}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel
          title="Sales Trends"
          eyebrow="Revenue / Profit / Margin"
          action={
            <div className="flex rounded-full border border-zinc-800 bg-[#0a0a0a] p-1">
              {['daily', 'monthly', 'yearly'].map((option) => (
                <button
                  key={option}
                  onClick={() => setTimeframe(option)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                    timeframe === option
                      ? 'bg-amber-500 text-black'
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendRows}>
                <defs>
                  <linearGradient id="analyticsRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="analyticsProfitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#27272a" vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    border: '1px solid #27272a',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#analyticsRevenueFill)"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#analyticsProfitFill)"
                  name="Profit"
                />
                <Line
                  type="monotone"
                  dataKey="marginPercent"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  name="Margin %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Customer Value" eyebrow="Retention and risk snapshot">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <InfoTile
              label="Total Buyers"
              value={customerInsights.totalCustomers || 0}
              detail="Customers with at least one net order"
            />
            <InfoTile
              label="Repeat Buyers"
              value={customerInsights.repeatCustomers || 0}
              detail={`${(Number(customerInsights.repeatCustomerRate || 0) * 100).toFixed(1)}% repeat rate`}
            />
            <InfoTile
              label="Average Revenue / Buyer"
              value={`₹${Number(customerInsights.averageRevenuePerCustomer || 0).toLocaleString()}`}
              detail="Net revenue spread across unique buyers"
            />
            <InfoTile
              label="Estimated CLV"
              value={`₹${Number(customerInsights.estimatedClv || 0).toLocaleString()}`}
              detail="v1 heuristic based on current net revenue"
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <DataTablePanel
          title="Best-Selling SKUs"
          eyebrow="Ranked by units sold"
          columns={['SKU', 'Product', 'Units', 'Revenue', 'Profit', 'Margin', 'Stock']}
          rows={(analytics?.topSkus || []).map((row) => [
            row.sku,
            row.name,
            row.unitsSold,
            `₹${Number(row.revenue || 0).toLocaleString()}`,
            `₹${Number(row.profit || 0).toLocaleString()}`,
            `${(Number(row.profitMargin || 0) * 100).toFixed(1)}%`,
            row.currentStock,
          ])}
          emptyLabel="No SKU performance data yet."
        />

        <DataTablePanel
          title="Slow-Moving Inventory"
          eyebrow="In-stock products without net sales in the last 30 days"
          columns={['SKU', 'Product', 'Stock', 'Value', 'Last Sale', 'Days Idle']}
          rows={(analytics?.slowMovingInventory || []).map((row) => [
            row.sku,
            row.name,
            row.currentStock,
            `₹${Number(row.inventoryValue || 0).toLocaleString()}`,
            row.lastSoldAt ? new Date(row.lastSoldAt).toLocaleDateString() : 'Never',
            row.daysSinceLastSale ?? 'N/A',
          ])}
          emptyLabel="No slow-moving inventory at the moment."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel
          title="Recommendation Performance"
          eyebrow="Reuse of existing recommendation analytics"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InfoTile
              label="Recommendation CTR"
              value={`${((recommendationAnalytics?.recommendationCtr || 0) * 100).toFixed(1)}%`}
              detail="Clicks from rendered recommendation impressions"
            />
            <InfoTile
              label="Cart Rate"
              value={`${((recommendationAnalytics?.recommendationCartRate || 0) * 100).toFixed(1)}%`}
              detail="Recommendation impressions turning into cart intent"
            />
            <InfoTile
              label="Purchase Conversion"
              value={`${((recommendationAnalytics?.recommendationConversionRate || 0) * 100).toFixed(1)}%`}
              detail="Recommendation-assisted purchase rate"
            />
            <InfoTile
              label="Coverage"
              value={`${((recommendationAnalytics?.coverage || 0) * 100).toFixed(1)}%`}
              detail="Catalog share exposed through recommendations"
            />
          </div>

          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recommendationFunnel}>
                <defs>
                  <linearGradient id="funnelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#27272a" vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    border: '1px solid #27272a',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#funnelFill)"
                  name="Events"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 rounded-[18px] border border-zinc-800 bg-[#0a0a0a] p-4">
            <div className="flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-amber-500" />
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                Recommendation Health
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-white capitalize">
              {recommendationAnalytics?.health?.status || 'unknown'}
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              {recommendationAnalytics?.health?.trackedImpressions || 0} tracked impressions across{' '}
              {((recommendationAnalytics?.health?.coverage || 0) * 100).toFixed(1)}% catalog
              coverage.
            </p>
            <div className="mt-4 space-y-2">
              {(recommendationAnalytics?.health?.warnings || []).length > 0 ? (
                recommendationAnalytics.health.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
                  >
                    {warning}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                  No recommendation health warnings.
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="At-Risk Customers" eyebrow="Churn-risk heuristic from order cadence">
          <div className="space-y-3">
            {churnRisk.customers?.length > 0 ? (
              churnRisk.customers.map((customer) => (
                <div
                  key={customer.customerId}
                  className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {customer.customerName || customer.customerEmail}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {customer.customerEmail || 'No email available'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                        customer.riskLevel === 'high'
                          ? 'bg-rose-500/10 text-rose-300'
                          : 'bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      {customer.riskLevel} risk
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniMetric
                      label="Lifetime Revenue"
                      value={`₹${Number(customer.lifetimeRevenue || 0).toLocaleString()}`}
                    />
                    <MiniMetric label="Orders" value={customer.orderCount} />
                    <MiniMetric
                      label="Days Since Last Order"
                      value={customer.daysSinceLastOrder ?? 'N/A'}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] px-4 py-6 text-sm text-zinc-500">
                No at-risk customers detected with the current heuristic.
              </div>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <CompactRecommendationTable
          title="Top Recommended Products"
          rows={recommendationAnalytics?.topRecommendedProducts || []}
          getValue={(row) => row.impressions || 0}
          valueLabel="Impressions"
        />
        <CompactRecommendationTable
          title="Top Converting Recommendations"
          rows={recommendationAnalytics?.topConvertingRecommendations || []}
          getValue={(row) =>
            `${row.purchases || 0} (${((row.conversionRate || 0) * 100).toFixed(1)}%)`
          }
          valueLabel="Purchases"
        />
      </section>
    </div>
  );
}

function Panel({ title, eyebrow, children, action }) {
  return (
    <section className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-lg font-black text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-[#111111] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</p>
        <div className={`rounded-xl border px-3 py-2 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

function QuickStrip({ label, value, detail }) {
  return (
    <div className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] px-4 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function InfoTile({ label, value, detail }) {
  return (
    <div className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-3 text-xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111111] px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function DataTablePanel({ title, eyebrow, columns, rows, emptyLabel }) {
  return (
    <Panel title={title} eyebrow={eyebrow}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              {columns.map((column) => (
                <th key={column} className="pb-3 pr-4 font-black">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`} className="hover:bg-zinc-900/60">
                  {row.map((value, cellIndex) => (
                    <td
                      key={`${title}-${rowIndex}-${cellIndex}`}
                      className="py-3.5 pr-4 text-sm text-zinc-200"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center text-sm text-zinc-500">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CompactRecommendationTable({ title, rows, getValue, valueLabel }) {
  return (
    <Panel title={title} eyebrow="Recommendation leaderboard">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              <th className="pb-3 pr-4 font-black">Product</th>
              <th className="pb-3 pr-4 font-black">Category</th>
              <th className="pb-3 pr-0 text-right font-black">{valueLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.product?.id || row.product?.name} className="hover:bg-zinc-900/60">
                  <td className="py-3.5 pr-4 text-sm font-semibold text-white">
                    {row.product?.name || 'Unknown product'}
                  </td>
                  <td className="py-3.5 pr-4 text-sm text-zinc-400">
                    {row.product?.category || 'General'}
                  </td>
                  <td className="py-3.5 pl-0 text-right text-sm font-bold text-amber-400">
                    {getValue(row)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="py-10 text-center text-sm text-zinc-500">
                  No recommendation data available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
