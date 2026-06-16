import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Boxes,
  ClipboardList,
  DollarSign,
  Hourglass,
  PackageCheck,
  Package,
  RotateCcw,
  Tags,
  Truck,
  Wallet,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import apiClient from '../api/axios';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ledgerStats, setLedgerStats] = useState({ totalDebt: 0, totalCollection: 0 });
  const [advisorContext, setAdvisorContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [productsRes, ledgerRes, advisorRes, ordersRes] = await Promise.all([
          apiClient.get('/products'),
          apiClient.get('/stats/wholesaler-summary'),
          apiClient.get('/stats/advisor-context'),
          apiClient.get('/orders'),
        ]);

        setProducts(productsRes.data.products || []);
        setLedgerStats(ledgerRes.data || { totalDebt: 0, totalCollection: 0 });
        setAdvisorContext(advisorRes.data || null);
        setOrders(ordersRes.data.orders || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalProducts = products.length;
  const totalUnitsInStock = products.reduce(
    (sum, product) => sum + Number(product.currentStock || 0),
    0
  );
  const lowStockProducts = products.filter(
    (product) => Number(product.currentStock || 0) > 0 && Number(product.currentStock || 0) < 10
  );
  const outOfStockProducts = products.filter((product) => Number(product.currentStock || 0) === 0);

  const chartData = products.slice(0, 8).map((product) => ({
    name: product.name.split(' ').slice(0, 2).join(' '),
    stock: Number(product.currentStock || 0),
    value: Number(product.price || 0) * Number(product.currentStock || 0),
  }));

  const pendingOrders = orders.filter((order) => order.status === 'PENDING').length;
  const processingOrders = orders.filter((order) => order.status === 'PROCESSING').length;
  const shippedOrders = orders.filter((order) => order.status === 'SHIPPED').length;
  const returnRequests = orders.reduce(
    (sum, order) => sum + order.items.filter((item) => item.returnStatus === 'REQUESTED').length,
    0
  );
  const refundExceptions = orders.reduce(
    (sum, order) =>
      sum +
      order.items.filter(
        (item) =>
          item.returnRefundStatus === 'FAILED' ||
          (item.status === 'CANCELLED' && ['FAILED', 'PENDING'].includes(item.refundStatus))
      ).length,
    0
  );
  const recentOrders = orders.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-zinc-400">
        <Activity className="h-8 w-8 animate-pulse text-amber-500" />
        <p className="text-sm font-bold uppercase tracking-[0.24em]">Loading operations desk</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-zinc-800 bg-[#111111] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-500/80">
            Operations Desk
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
            Daily execution up front, deeper analytics one click away.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
            Use this screen to monitor stock pressure, collections, and marketplace movement. When
            you need profit, retention, slow movers, or recommendation performance, jump to the
            analytics workspace.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <QuickStrip
              label="Pending Orders"
              value={pendingOrders}
              detail="New orders waiting for acceptance or packing"
            />
            <QuickStrip
              label="Return Requests"
              value={returnRequests}
              detail="Customer returns currently waiting on a decision"
            />
            <QuickStrip
              label="Refund Exceptions"
              value={refundExceptions}
              detail="Refund failures or pending item-level follow-ups"
            />
          </div>
        </div>

        <Link
          to="/wholesaler/analytics"
          className="group rounded-[28px] border border-amber-500/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.2),transparent_40%),linear-gradient(180deg,#171717_0%,#0a0a0a_100%)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] transition hover:border-amber-500/40"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-300/90">
            Analytics Workspace
          </p>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Open the deeper business board
              </h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-zinc-400">
                Review net profit, margins, best-selling SKUs, slow inventory, customer lifetime
                value, churn risk, and recommendation performance in one place.
              </p>
            </div>
            <div className="rounded-full border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300 transition group-hover:translate-x-1">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <InfoTile
              label="Top Category"
              value={advisorContext?.topSellingCategory || 'N/A'}
              detail="Still useful, but the full sales mix lives in analytics"
            />
            <InfoTile
              label="Unsold Inventory"
              value={advisorContext?.unsoldInventory || 0}
              detail="Products with no historical order items"
            />
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Market Debt"
          value={`₹${Number(ledgerStats.totalDebt || 0).toLocaleString()}`}
          icon={AlertCircle}
          tone="text-rose-300 border-rose-500/20 bg-rose-500/10"
          desc="Money currently owed to you"
        />
        <StatCard
          title="Total Collection"
          value={`₹${Number(ledgerStats.totalCollection || 0).toLocaleString()}`}
          icon={Wallet}
          tone="text-emerald-300 border-emerald-500/20 bg-emerald-500/10"
          desc="Cash received through the marketplace"
        />
        <StatCard
          title="Orders In Progress"
          value={(processingOrders + shippedOrders).toLocaleString()}
          icon={Truck}
          tone="text-sky-300 border-sky-500/20 bg-sky-500/10"
          desc={`${processingOrders} processing and ${shippedOrders} shipped`}
        />
        <StatCard
          title="Total Units In Stock"
          value={totalUnitsInStock.toLocaleString()}
          icon={Boxes}
          tone="text-zinc-200 border-zinc-700 bg-zinc-800/70"
          desc={`${totalProducts} active catalog products`}
        />
        <StatCard
          title="Low / Out Of Stock"
          value={`${lowStockProducts.length} / ${outOfStockProducts.length}`}
          icon={PackageCheck}
          tone="text-amber-300 border-amber-500/20 bg-amber-500/10"
          desc="Low stock first, out of stock second"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Inventory Snapshot
            </p>
            <h2 className="mt-2 text-lg font-black text-white">Stock asset pressure</h2>
          </div>
          <div className="h-80">
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
          </div>
        </div>

        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Operational Alerts
            </p>
            <h2 className="mt-2 text-lg font-black text-white">What needs attention</h2>
          </div>

          <div className="grid gap-3">
            <AlertRow
              icon={Hourglass}
              label="Pending queue"
              value={pendingOrders}
              detail="Orders waiting for your first operational action"
              tone="text-orange-300 border-orange-500/20 bg-orange-500/10"
            />
            <AlertRow
              icon={RotateCcw}
              label="Return requests"
              value={returnRequests}
              detail="Items blocked until you approve or reject the return"
              tone="text-violet-300 border-violet-500/20 bg-violet-500/10"
            />
            <AlertRow
              icon={AlertCircle}
              label="Refund exceptions"
              value={refundExceptions}
              detail="Items where refund recovery still needs attention"
              tone="text-rose-300 border-rose-500/20 bg-rose-500/10"
            />
          </div>

          <div className="mt-5 rounded-[18px] border border-zinc-800 bg-[#0a0a0a] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
              Immediate next step
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Review the analytics page for the profit view, slow movers by value, customer risk,
              and deeper recommendation performance before deciding what to restock or promote.
            </p>
            <Link
              to="/wholesaler/analytics"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-amber-400"
            >
              Open Analytics
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Catalog Watchlist
            </p>
            <h2 className="mt-2 text-lg font-black text-white">Restock and dormancy scan</h2>
          </div>

          <div className="space-y-3">
            {outOfStockProducts.slice(0, 3).map((product) => (
              <WatchRow
                key={`out-${product.id}`}
                name={product.name}
                meta="Out of stock"
                detail="Unavailable for sale until restocked"
                tone="text-rose-300 border-rose-500/20 bg-rose-500/10"
              />
            ))}
            {lowStockProducts.slice(0, 3).map((product) => (
              <WatchRow
                key={`low-${product.id}`}
                name={product.name}
                meta={`${product.currentStock} left`}
                detail="Reorder soon to avoid availability gaps"
                tone="text-amber-300 border-amber-500/20 bg-amber-500/10"
              />
            ))}
            {outOfStockProducts.length === 0 && lowStockProducts.length === 0 && (
              <div className="rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">
                No immediate stock pressure. The catalog is currently clear of low-stock and
                out-of-stock alerts.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Recent Orders
            </p>
            <h2 className="mt-2 text-lg font-black text-white">Latest marketplace movement</h2>
          </div>

          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {order.buyer?.name || order.buyer?.email || 'Customer'}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniMetric
                      label="Placed"
                      value={new Date(order.createdAt).toLocaleDateString()}
                    />
                    <MiniMetric label="Items" value={order.items?.length || 0} />
                    <MiniMetric
                      label="Order Total"
                      value={`₹${Number(order.totalAmount || 0).toLocaleString()}`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] px-4 py-6 text-sm text-zinc-500">
                No recent orders yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone, desc }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_14px_40px_rgba(0,0,0,0.24)]">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-xl border px-3 py-2 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
          {title}
        </span>
      </div>
      <p className="text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{desc}</p>
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

function AlertRow({ icon: Icon, label, value, detail, tone }) {
  return (
    <div className={`rounded-[18px] border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className="mt-0.5 h-4 w-4" />
          <div>
            <p className="text-sm font-bold">{label}</p>
            <p className="mt-1 text-xs leading-5 opacity-80">{detail}</p>
          </div>
        </div>
        <span className="text-lg font-black">{value}</span>
      </div>
    </div>
  );
}

function WatchRow({ name, meta, detail, tone }) {
  return (
    <div className={`rounded-[18px] border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{name}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{detail}</p>
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.18em]">{meta}</span>
      </div>
    </div>
  );
}
