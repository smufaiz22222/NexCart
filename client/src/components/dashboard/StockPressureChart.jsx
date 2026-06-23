import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function StockPressureChart({ chartData }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid stroke="var(--border-subtle)" vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--bg-card-hover)', opacity: 0.4 }}
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            color: 'var(--text-title)',
          }}
        />
        <Bar dataKey="stock" fill="var(--text-muted)" radius={[4, 4, 0, 0]} name="Units in stock" />
        <Bar dataKey="value" fill="var(--brand-accent)" radius={[4, 4, 0, 0]} name="Value (₹)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
