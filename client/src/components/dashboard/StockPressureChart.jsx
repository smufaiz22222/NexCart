import React, { Suspense } from 'react';

const ResponsiveContainer = React.lazy(() =>
  import('recharts').then((m) => ({ default: m.ResponsiveContainer }))
);
const BarChart = React.lazy(() => import('recharts').then((m) => ({ default: m.BarChart })));
const CartesianGrid = React.lazy(() =>
  import('recharts').then((m) => ({ default: m.CartesianGrid }))
);
const XAxis = React.lazy(() => import('recharts').then((m) => ({ default: m.XAxis })));
const YAxis = React.lazy(() => import('recharts').then((m) => ({ default: m.YAxis })));
const Tooltip = React.lazy(() => import('recharts').then((m) => ({ default: m.Tooltip })));
const Bar = React.lazy(() => import('recharts').then((m) => ({ default: m.Bar })));

const CHART_TICK_STYLE = { fill: 'var(--text-muted)', fontSize: 12 };
const TOOLTIP_CURSOR_STYLE = { fill: 'var(--bg-card-hover)', opacity: 0.4 };
const BAR_RADIUS = [4, 4, 0, 0];

export default function StockPressureChart({ chartData }) {
  return (
    <Suspense fallback={<div className="h-full w-full bg-white/5 animate-pulse rounded-xl" />}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid stroke="var(--border-subtle)" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={CHART_TICK_STYLE} />
          <YAxis axisLine={false} tickLine={false} tick={CHART_TICK_STYLE} />
          <Tooltip
            cursor={TOOLTIP_CURSOR_STYLE}
            contentStyle={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              color: 'var(--text-title)',
            }}
          />
          <Bar dataKey="stock" fill="var(--text-muted)" radius={BAR_RADIUS} name="Units in stock" />
          <Bar dataKey="value" fill="var(--brand-accent)" radius={BAR_RADIUS} name="Value (₹)" />
        </BarChart>
      </ResponsiveContainer>
    </Suspense>
  );
}
