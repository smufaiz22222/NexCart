import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function StockPressureChart({ chartData }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid stroke="#27272a" vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: '#18181b', opacity: 0.4 }}
          contentStyle={{
            backgroundColor: '#09090b',
            border: '1px solid #27272a',
            borderRadius: '12px',
            color: '#fff',
          }}
        />
        <Bar dataKey="stock" fill="#d4d4d8" radius={[4, 4, 0, 0]} name="Units in stock" />
        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Value (₹)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
