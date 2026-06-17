import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BadgeIndianRupee,
  Boxes,
  Building2,
  CircleDollarSign,
  CreditCard,
  LoaderCircle,
  PackageSearch,
  ReceiptText,
  Shield,
  ShoppingBag,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiClient from '../api/axios';

const statusColors = ['#bc6c25', '#386641', '#6a994e', '#9c6644', '#b56576', '#355070'];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatCompactNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

export default function SuperAdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [selectedWholesalerId, setSelectedWholesalerId] = useState('');
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);
  const [error, setError] = useState('');

  // B2B Applications state
  const [b2bApps, setB2bApps] = useState([]);
  const [isLoadingB2B, setIsLoadingB2B] = useState(false);

  const fetchB2BApps = async () => {
    try {
      setIsLoadingB2B(true);
      const response = await apiClient.get('/b2b/applications');
      setB2bApps(response.data.applications || []);
    } catch (err) {
      console.error('Failed to fetch B2B applications:', err);
    } finally {
      setIsLoadingB2B(false);
    }
  };

  const handleB2BAction = async (appId, action) => {
    try {
      setError('');
      if (action === 'approve') {
        const confirmApprove = window.confirm('Are you sure you want to approve this B2B wholesale onboarding request?');
        if (!confirmApprove) return;
        await apiClient.post(`/b2b/admin/approve/${appId}`, { verification: 'APPROVED' });
      } else if (action === 'reject') {
        const reason = window.prompt('Enter a rejection reason for this B2B onboarding application:');
        if (reason === null) return;
        await apiClient.post(`/b2b/admin/approve/${appId}`, { verification: 'REJECTED', rejectionReason: reason });
      }
      await fetchB2BApps();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update B2B application.');
    }
  };

  const refreshOverview = async () => {
    const response = await apiClient.get('/admin/stats');
    setOverview(response.data);
    return response.data;
  };

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setIsLoadingOverview(true);
        const response = await refreshOverview();

        const firstWholesaler = response.wholesalers?.[0];
        if (firstWholesaler) {
          setSelectedWholesalerId(firstWholesaler.id);
        }
      } catch (fetchError) {
        setError(fetchError.response?.data?.error || 'Failed to load super-admin overview');
      } finally {
        setIsLoadingOverview(false);
      }
    };

    fetchOverview();
    fetchB2BApps();
  }, []);

  useEffect(() => {
    if (!selectedWholesalerId) return;

    const fetchTenant = async () => {
      try {
        setIsLoadingTenant(true);
        const response = await apiClient.get(`/admin/wholesalers/${selectedWholesalerId}`);
        setTenant(response.data.tenant);
      } catch (fetchError) {
        setError(fetchError.response?.data?.error || 'Failed to load wholesaler details');
      } finally {
        setIsLoadingTenant(false);
      }
    };

    fetchTenant();
  }, [selectedWholesalerId]);

  const handleApplicationAction = async (wholesalerId, action) => {
    try {
      setError('');
      if (action === 'approve') {
        await apiClient.post(`/admin/wholesalers/${wholesalerId}/approve`);
      } else if (action === 'reject') {
        const reason = window.prompt('Enter a rejection reason for this seller application:');
        if (reason === null) return;
        await apiClient.post(`/admin/wholesalers/${wholesalerId}/reject`, { reason });
      }

      await refreshOverview();
    } catch (actionError) {
      setError(actionError.response?.data?.error || 'Failed to update wholesaler application.');
    }
  };

  const cards = useMemo(() => {
    if (!overview) return [];

    return [
      {
        title: 'Platform Revenue',
        value: formatCurrency(overview.totals.totalRevenue),
        detail: `${overview.totals.totalOrders} marketplace orders`,
        icon: CircleDollarSign,
        accent: 'from-[#bc6c25] to-[#dda15e]',
      },
      {
        title: 'Active Wholesalers',
        value: formatCompactNumber(overview.totals.totalWholesalers),
        detail: `${overview.totals.totalProducts} products across sellers`,
        icon: Building2,
        accent: 'from-[#386641] to-[#6a994e]',
      },
      {
        title: 'Customer Accounts',
        value: formatCompactNumber(overview.totals.totalCustomers),
        detail: `${overview.totals.totalSuperAdmins} super admins`,
        icon: UserRound,
        accent: 'from-[#355070] to-[#6d597a]',
      },
      {
        title: 'Inventory Watch',
        value: formatCompactNumber(overview.totals.lowStockProducts),
        detail: `${overview.totals.outOfStockProducts} out of stock`,
        icon: AlertTriangle,
        accent: 'from-[#9c6644] to-[#cb997e]',
      },
    ];
  }, [overview]);

  if (isLoadingOverview) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-[#d8ccb9] bg-white/70 px-5 py-4 text-[#8f5d31]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm font-bold uppercase tracking-[0.24em]">
            Loading command view
          </span>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="rounded-[28px] border border-[#d8ccb9] bg-[#fff9f1] p-8 text-[#7f2d2d]">
        <p className="text-sm font-bold uppercase tracking-[0.24em]">Dashboard unavailable</p>
        <p className="mt-3 text-base">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-[#d8ccb9] bg-[linear-gradient(135deg,#fffaf3_0%,#f2e4cf_58%,#ead9bc_100%)] shadow-[0_26px_70px_rgba(57,45,29,0.12)]">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8ccb9] bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
              <Shield className="h-4 w-4" />
              Global control room
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight text-[#221c16] sm:text-5xl">
              Platform visibility for revenue, tenant health, and operational risk.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#5d5247]">
              This dashboard turns the old placeholder into a real control surface. You can scan
              platform totals, compare seller performance, and drill into a wholesaler without
              leaving the page.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_45px_rgba(34,28,22,0.08)]"
                >
                  <div
                    className={`inline-flex rounded-2xl bg-gradient-to-br p-3 text-white ${card.accent}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                    {card.title}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-[#221c16]">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm text-[#6b6155]">{card.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Pending Applications" eyebrow="Wholesaler onboarding queue" icon={Shield}>
          <div className="space-y-3">
            {(overview?.pendingApplications || []).length > 0 ? (
              overview.pendingApplications.map((application) => (
                <div
                  key={application.id}
                  className="rounded-[24px] border border-[#eadfce] bg-[#fcf7f0] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-base font-black tracking-tight text-[#221c16]">
                        {application.businessName}
                      </p>
                      <p className="mt-1 text-sm text-[#6b6155]">{application.user?.email}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#8f5d31]">
                        {application.onboardingStatus}
                      </p>
                      <p className="mt-2 text-sm text-[#6b6155]">
                        {application.businessPhone || 'No phone'} ·{' '}
                        {application.businessAddress || 'No address'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplicationAction(application.id, 'approve')}
                        className="rounded-full bg-[#221c16] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#f5efe4]"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplicationAction(application.id, 'reject')}
                        className="rounded-full border border-[#e6b6b0] bg-[#fff3f1] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#9d3b30]"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#d8ccb9] bg-[#fcf7f0] px-4 py-6 text-sm text-[#6b6155]">
                No pending wholesaler applications right now.
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Billing Command"
          eyebrow="Dedicated subscription page"
          icon={BadgeIndianRupee}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="Pending approvals"
              value={overview?.totals?.pendingApplications || 0}
              icon={Shield}
            />
            <MetricCard
              label="Paid active"
              value={overview?.totals?.activePaidSubscriptions || 0}
              icon={CreditCardIcon}
            />
            <MetricCard
              label="Active trials"
              value={overview?.totals?.activeTrials || 0}
              icon={SparklesIcon}
            />
            <MetricCard
              label="Low stock watch"
              value={overview?.totals?.lowStockProducts || 0}
              icon={AlertTriangle}
            />
          </div>
          <div className="mt-5 rounded-[24px] bg-[#fcf7f0] p-5">
            <p className="text-sm leading-7 text-[#6b6155]">
              Subscription activation, duration pricing, trial visibility, and billing history now
              live on a separate workspace so this dashboard stays cleaner.
            </p>
            <Link
              to="/admin/subscriptions"
              className="mt-4 inline-flex items-center rounded-full bg-[#221c16] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#f5efe4] transition hover:bg-[#3a3128]"
            >
              Open subscription workspace
            </Link>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-1">
        <Panel title="B2B Business Applications" eyebrow="Retail buyer business verification requests" icon={Shield}>
          <div className="space-y-3">
            {b2bApps.filter(app => app.verification === 'APPLIED').length > 0 ? (
              b2bApps.filter(app => app.verification === 'APPLIED').map((application) => (
                <div
                  key={application.id}
                  className="rounded-[24px] border border-[#eadfce] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-base font-black tracking-tight text-[#221c16]">
                        {application.companyName}
                      </p>
                      <p className="mt-1 text-sm text-[#6b6155]">
                        <span className="font-semibold">Applicant Name:</span> {application.user?.name} · {application.user?.email}
                      </p>
                      <p className="mt-2 text-xs font-mono bg-[#fcf7f0] border border-[#eadfce] px-2.5 py-1 rounded inline-block text-[#8f5d31]">
                        Tax ID / GSTIN: {application.taxId}
                      </p>
                      <p className="mt-3 text-sm text-[#6b6155]">
                        <span className="font-semibold">Business Location:</span> {application.businessAddress}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleB2BAction(application.id, 'approve')}
                        className="rounded-full bg-[#221c16] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-[#f5efe4] hover:bg-[#3e342a] transition-all"
                      >
                        Approve Application
                      </button>
                      <button
                        type="button"
                        onClick={() => handleB2BAction(application.id, 'reject')}
                        className="rounded-full border border-[#e6b6b0] bg-[#fff3f1] px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-[#9d3b30] hover:bg-rose-100 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#d8ccb9] bg-[#fcf7f0] px-4 py-6 text-sm text-[#6b6155]">
                No pending B2B business verification requests.
              </div>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Panel title="Revenue Trend" eyebrow="Last 6 Months" icon={Activity}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.charts?.monthlyRevenue || []}>
                <defs>
                  <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#bc6c25" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#bc6c25" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eadfce" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b6155' }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b6155' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '18px',
                    border: '1px solid #d8ccb9',
                    backgroundColor: '#fff9f1',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#bc6c25"
                  strokeWidth={3}
                  fill="url(#adminRevenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Order Status Mix" eyebrow="Platform-wide" icon={ShoppingBag}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overview?.charts?.orderStatus || []}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={62}
                  outerRadius={94}
                  paddingAngle={3}
                >
                  {(overview?.charts?.orderStatus || []).map((entry, index) => (
                    <Cell key={entry.status} fill={statusColors[index % statusColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '18px',
                    border: '1px solid #d8ccb9',
                    backgroundColor: '#fff9f1',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(overview?.charts?.orderStatus || []).map((item, index) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-2xl bg-[#f7efe3] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: statusColors[index % statusColors.length] }}
                  />
                  <span className="text-sm font-semibold text-[#3f352c]">{item.status}</span>
                </div>
                <span className="text-sm font-black text-[#221c16]">{item.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <Panel title="Revenue Leaders" eyebrow="Top Wholesalers" icon={ReceiptText}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overview?.topWholesalers || []}
                layout="vertical"
                margin={{ left: 16, right: 8 }}
              >
                <CartesianGrid stroke="#eadfce" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b6155' }} />
                <YAxis
                  type="category"
                  dataKey="businessName"
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  tick={{ fill: '#6b6155', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: '18px',
                    border: '1px solid #d8ccb9',
                    backgroundColor: '#fff9f1',
                  }}
                />
                <Bar dataKey="revenue" fill="#386641" radius={[0, 14, 14, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Wholesaler Directory" eyebrow="Drill Into a Seller" icon={Building2}>
          <div className="space-y-3">
            {(overview?.wholesalers || []).map((wholesaler) => (
              <button
                key={wholesaler.id}
                type="button"
                onClick={() => setSelectedWholesalerId(wholesaler.id)}
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  selectedWholesalerId === wholesaler.id
                    ? 'border-[#bc6c25] bg-[#fff4e6] shadow-[0_16px_30px_rgba(188,108,37,0.12)]'
                    : 'border-[#eadfce] bg-[#fcf7f0] hover:border-[#d7c0a4] hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black tracking-tight text-[#221c16]">
                      {wholesaler.businessName}
                    </p>
                    <p className="mt-1 text-sm text-[#6b6155]">{wholesaler.ownerEmail}</p>
                  </div>
                  <span className="rounded-full bg-[#221c16] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f5efe4]">
                    {formatCurrency(wholesaler.revenue)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-[#5d5247]">
                  <MetricMini label="Products" value={wholesaler.productCount} />
                  <MetricMini label="Orders" value={wholesaler.orderCount} />
                  <MetricMini label="Low Stock" value={wholesaler.lowStockCount} />
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Tenant Detail" eyebrow="Selected Wholesaler" icon={PackageSearch}>
          {isLoadingTenant ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[#f7efe3] px-4 py-5 text-[#8f5d31]">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span className="text-sm font-semibold">Loading seller detail...</span>
            </div>
          ) : tenant ? (
            <div className="space-y-5">
              <div className="rounded-[24px] bg-[#fcf7f0] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                  {tenant.businessName}
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-[#221c16]">
                  {tenant.ownerName}
                </p>
                <p className="mt-1 text-sm text-[#6b6155]">{tenant.ownerEmail}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b7e70]">
                  Joined {formatDate(tenant.joinedAt)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="Revenue"
                  value={formatCurrency(tenant.metrics.revenue)}
                  icon={CircleDollarSign}
                />
                <MetricCard
                  label="Inventory Value"
                  value={formatCurrency(tenant.metrics.inventoryValue)}
                  icon={Boxes}
                />
                <MetricCard label="Orders" value={tenant.metrics.orderCount} icon={ShoppingBag} />
                <MetricCard label="Products" value={tenant.metrics.productCount} icon={Building2} />
              </div>

              <div className="rounded-[24px] bg-[#fcf7f0] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                  Inventory Risk
                </p>
                <div className="mt-4 space-y-3">
                  {(tenant.inventoryRisk || []).length ? (
                    tenant.inventoryRisk.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-bold text-[#221c16]">{product.name}</p>
                          <p className="text-xs text-[#6b6155]">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[#b45309]">
                            {product.currentStock} left
                          </p>
                          <p className="text-xs text-[#8b7e70]">Min {product.minStock}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-white px-4 py-4 text-sm text-[#6b6155]">
                      No immediate inventory risk for this seller.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#6b6155]">Choose a wholesaler to inspect tenant details.</p>
          )}
        </Panel>

        <div className="grid gap-6">
          <Panel title="Recent Orders" eyebrow="Selected Wholesaler" icon={ShoppingBag}>
            <div className="space-y-3">
              {(tenant?.recentOrders || []).length ? (
                tenant.recentOrders.map((order) => (
                  <div key={order.id} className="rounded-[22px] bg-[#fcf7f0] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#221c16]">{order.buyerName}</p>
                        <p className="text-xs text-[#6b6155]">{order.buyerEmail}</p>
                      </div>
                      <p className="text-sm font-black text-[#221c16]">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
                      <span className="rounded-full bg-[#221c16] px-3 py-1 text-[#f5efe4]">
                        {order.status}
                      </span>
                      <span className="rounded-full bg-[#e8dccb] px-3 py-1 text-[#5d5247]">
                        {order.paymentStatus}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[#8b7e70]">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#fcf7f0] px-4 py-4 text-sm text-[#6b6155]">
                  No recent orders for this wholesaler.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Recent Inventory Activity" eyebrow="Selected Wholesaler" icon={Activity}>
            <div className="space-y-3">
              {(tenant?.recentInventoryLogs || []).length ? (
                tenant.recentInventoryLogs.map((log) => (
                  <div key={log.id} className="rounded-[22px] bg-[#fcf7f0] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#221c16]">{log.productName}</p>
                        <p className="text-xs text-[#6b6155]">{log.reason}</p>
                      </div>
                      <p className="text-sm font-black text-[#221c16]">{log.changeAmount}</p>
                    </div>
                    <p className="mt-3 text-xs text-[#8b7e70]">{formatDate(log.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#fcf7f0] px-4 py-4 text-sm text-[#6b6155]">
                  No recent inventory logs for this wholesaler.
                </p>
              )}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Panel({ title, eyebrow, icon: Icon, children }) {
  return (
    <section className="rounded-[30px] border border-[#d8ccb9] bg-[#fff9f1] p-6 shadow-[0_18px_45px_rgba(57,45,29,0.07)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#221c16]">{title}</h2>
        </div>
        <div className="rounded-2xl bg-[#221c16] p-3 text-[#f5efe4]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[22px] bg-[#fcf7f0] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">{label}</p>
        <Icon className="h-4 w-4 text-[#8f5d31]" />
      </div>
      <p className="mt-3 text-xl font-black tracking-tight text-[#221c16]">{value}</p>
    </div>
  );
}

function MetricMini({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8b7e70]">{label}</p>
      <p className="mt-1 text-base font-black text-[#221c16]">{value}</p>
    </div>
  );
}

function CreditCardIcon(props) {
  return <CreditCard {...props} />;
}

function SparklesIcon(props) {
  return <Sparkles {...props} />;
}
