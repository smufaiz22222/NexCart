import React, { useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Building2,
  CircleDollarSign,
  LoaderCircle,
  ReceiptText,
  Shield,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import apiClient from '../api/axios';

const Area = React.lazy(() => import('recharts').then((m) => ({ default: m.Area })));
const AreaChart = React.lazy(() => import('recharts').then((m) => ({ default: m.AreaChart })));
const Bar = React.lazy(() => import('recharts').then((m) => ({ default: m.Bar })));
const BarChart = React.lazy(() => import('recharts').then((m) => ({ default: m.BarChart })));
const CartesianGrid = React.lazy(() =>
  import('recharts').then((m) => ({ default: m.CartesianGrid }))
);
const Cell = React.lazy(() => import('recharts').then((m) => ({ default: m.Cell })));
const Pie = React.lazy(() => import('recharts').then((m) => ({ default: m.Pie })));
const PieChart = React.lazy(() => import('recharts').then((m) => ({ default: m.PieChart })));
const ResponsiveContainer = React.lazy(() =>
  import('recharts').then((m) => ({ default: m.ResponsiveContainer }))
);
const Tooltip = React.lazy(() => import('recharts').then((m) => ({ default: m.Tooltip })));
const XAxis = React.lazy(() => import('recharts').then((m) => ({ default: m.XAxis })));
const YAxis = React.lazy(() => import('recharts').then((m) => ({ default: m.YAxis })));
import Panel from '../components/admin/Panel';
import MetricCard from '../components/admin/MetricCard';
import PageHeader from '../components/admin/PageHeader';

const EMPTY_ARRAY = [];
const TICK_STYLE_12 = { fill: '#848E9C', fontSize: 12 };
const TICK_STYLE_11 = { fill: '#848E9C', fontSize: 11 };
const BAR_RADIUS = [0, 4, 4, 0];
const CHART_MARGIN = { left: 16, right: 8 };

const statusColors = ['#F0B90B', '#0ECB81', '#1E9CF1', '#F6465D', '#B7BDC6', '#7B61FF'];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const compactNumberFormatter = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatCompactNumber = (value) => compactNumberFormatter.format(Number(value || 0));

export default function AdminOverview() {
  const {
    data: overview,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/stats');
      return response.data;
    },
    staleTime: 60_000,
  });

  const cards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        title: 'Platform Revenue',
        value: formatCurrency(overview.totals.totalRevenue),
        detail: `${overview.totals.totalOrders} marketplace orders`,
        icon: CircleDollarSign,
        accent: 'bg-[#F0B90B]/10 text-[#F0B90B]',
      },
      {
        title: 'Active Wholesalers',
        value: formatCompactNumber(overview.totals.totalWholesalers),
        detail: `${overview.totals.totalProducts} products across sellers`,
        icon: Building2,
        accent: 'bg-[#0ECB81]/10 text-[#0ECB81]',
      },
      {
        title: 'Customer Accounts',
        value: formatCompactNumber(overview.totals.totalCustomers),
        detail: `${overview.totals.totalSuperAdmins} super admins`,
        icon: UserRound,
        accent: 'bg-[#1E9CF1]/10 text-[#1E9CF1]',
      },
      {
        title: 'Inventory Watch',
        value: formatCompactNumber(overview.totals.lowStockProducts),
        detail: `${overview.totals.outOfStockProducts} out of stock`,
        icon: AlertTriangle,
        accent: 'bg-[#F6465D]/10 text-[#F6465D]',
      },
    ];
  }, [overview]);

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-[#2B3139] bg-[#1E2329] px-5 py-4 text-[#F0B90B]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#F6465D]/30 bg-[#F6465D]/5 p-6 text-[#F6465D]">
        <p className="text-sm font-bold">Dashboard unavailable</p>
        <p className="mt-2 text-sm text-[#848E9C]">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Shield}
        badge="Control room"
        title="Platform Overview"
        description="Revenue metrics, seller performance, and operational health at a glance."
      />

      {/* Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard
            key={card.title}
            label={card.title}
            value={card.value}
            detail={card.detail}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </section>

      {/* Quick Navigation */}
      <section className="grid gap-3 sm:grid-cols-3">
        <QuickLink
          to="/admin/wholesalers"
          icon={Building2}
          title="Wholesalers"
          description="Applications & directory"
        />
        <QuickLink
          to="/admin/orders"
          icon={ShoppingBag}
          title="Orders"
          description="All platform orders"
        />
        <QuickLink
          to="/admin/subscriptions"
          icon={ReceiptText}
          title="Subscriptions"
          description="Plans & billing"
        />
      </section>

      {/* Charts */}
      <Suspense fallback={<div className="h-96 w-full bg-white/5 animate-pulse rounded-2xl" />}>
        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Panel title="Revenue Trend" eyebrow="Last 6 months" icon={Activity}>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview?.charts?.monthlyRevenue || EMPTY_ARRAY}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F0B90B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F0B90B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#2B3139" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={TICK_STYLE_12} />
                  <YAxis axisLine={false} tickLine={false} tick={TICK_STYLE_12} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #2B3139',
                      backgroundColor: '#1E2329',
                      color: '#EAECEF',
                    }}
                    labelStyle={{ color: '#848E9C' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#F0B90B"
                    strokeWidth={2}
                    fill="url(#revFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Order Status" eyebrow="Distribution" icon={ShoppingBag}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview?.charts?.orderStatus || EMPTY_ARRAY}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {(overview?.charts?.orderStatus || EMPTY_ARRAY).map((entry, index) => (
                      <Cell key={entry.status} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #2B3139',
                      backgroundColor: '#1E2329',
                      color: '#EAECEF',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {(overview?.charts?.orderStatus || EMPTY_ARRAY).map((item, index) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between rounded-md bg-[#1E2329] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: statusColors[index % statusColors.length] }}
                    />
                    <span className="text-xs text-[#848E9C]">{item.status}</span>
                  </div>
                  <span className="text-xs font-bold text-[#EAECEF]">{item.count}</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        {/* Top Wholesalers */}
        <Panel title="Revenue Leaders" eyebrow="Top sellers" icon={ReceiptText}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overview?.topWholesalers || EMPTY_ARRAY}
                layout="vertical"
                margin={CHART_MARGIN}
              >
                <CartesianGrid stroke="#2B3139" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={TICK_STYLE_12} />
                <YAxis
                  type="category"
                  dataKey="businessName"
                  axisLine={false}
                  tickLine={false}
                  width={100}
                  tick={TICK_STYLE_11}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #2B3139',
                    backgroundColor: '#1E2329',
                    color: '#EAECEF',
                  }}
                />
                <Bar dataKey="revenue" fill="#F0B90B" radius={BAR_RADIUS} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </Suspense>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-[#2B3139] bg-[#12161C] p-4 transition-all hover:border-[#F0B90B]/40 hover:bg-[#1E2329]"
    >
      <div className="rounded-lg bg-[#F0B90B]/10 p-2.5 text-[#F0B90B] transition-transform group-hover:scale-105">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-bold text-[#EAECEF]">{title}</p>
        <p className="text-xs text-[#5E6673]">{description}</p>
      </div>
    </Link>
  );
}
