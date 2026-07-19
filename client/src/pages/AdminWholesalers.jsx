import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
  Building2,
  CircleDollarSign,
  Boxes,
  ShoppingBag,
  LoaderCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Activity,
  PackageSearch,
  Shield,
} from 'lucide-react';
import apiClient from '../api/axios';
import DataTable from '../components/DataTable';
import { Panel, PageHeader, StatusBadge, EmptyState } from '../components/admin';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatDate = (value) => dateFormatter.format(new Date(value));

const columnHelper = createColumnHelper();

export default function AdminWholesalers() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedWholesalerId, setSelectedWholesalerId] = useState(null);

  const { data: wholesalersData, isLoading: isLoadingWholesalers } = useQuery({
    queryKey: ['adminWholesalers'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/wholesalers');
      return response.data.wholesalers || [];
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/stats');
      return response.data;
    },
    staleTime: 60_000,
  });

  const { data: b2bApps = [], isLoading: isLoadingB2B } = useQuery({
    queryKey: ['adminB2BApps'],
    queryFn: async () => {
      const response = await apiClient.get('/b2b/applications');
      return response.data.applications || [];
    },
  });

  const { data: tenantData, isLoading: isLoadingTenant } = useQuery({
    queryKey: ['adminTenant', selectedWholesalerId],
    queryFn: async () => {
      const response = await apiClient.get(`/admin/wholesalers/${selectedWholesalerId}`);
      return response.data.tenant;
    },
    enabled: !!selectedWholesalerId,
  });

  const approveMutation = useMutation({
    mutationFn: (wholesalerId) => apiClient.post(`/admin/wholesalers/${wholesalerId}/approve`),
    onSuccess: () => {
      toast.success('Wholesaler approved.');
      queryClient.invalidateQueries({ queryKey: ['adminWholesalers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to approve.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ wholesalerId, reason }) =>
      apiClient.post(`/admin/wholesalers/${wholesalerId}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Wholesaler rejected.');
      queryClient.invalidateQueries({ queryKey: ['adminWholesalers'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to reject.'),
  });

  const b2bActionMutation = useMutation({
    mutationFn: ({ appId, verification, rejectionReason }) =>
      apiClient.post(`/b2b/admin/approve/${appId}`, { verification, rejectionReason }),
    onSuccess: () => {
      toast.success('B2B application updated.');
      queryClient.invalidateQueries({ queryKey: ['adminB2BApps'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update.'),
  });

  const handleApproveWholesaler = useCallback(
    (wholesalerId) => {
      if (window.confirm('Approve this wholesaler?')) approveMutation.mutate(wholesalerId);
    },
    [approveMutation]
  );

  const handleRejectWholesaler = useCallback(
    (wholesalerId) => {
      const reason = window.prompt('Rejection reason:');
      if (reason !== null) rejectMutation.mutate({ wholesalerId, reason });
    },
    [rejectMutation]
  );

  const handleB2BApprove = useCallback(
    (appId) => {
      if (window.confirm('Approve this B2B application?'))
        b2bActionMutation.mutate({ appId, verification: 'APPROVED' });
    },
    [b2bActionMutation]
  );

  const handleB2BReject = useCallback(
    (appId) => {
      const reason = window.prompt('Rejection reason:');
      if (reason !== null)
        b2bActionMutation.mutate({ appId, verification: 'REJECTED', rejectionReason: reason });
    },
    [b2bActionMutation]
  );

  const directoryColumns = useMemo(
    () => [
      columnHelper.accessor('businessName', {
        header: 'Business',
        cell: (info) => (
          <div>
            <p className="font-semibold text-[#EAECEF]">{info.getValue()}</p>
            <p className="text-xs text-[#5E6673]">{info.row.original.ownerEmail}</p>
          </div>
        ),
      }),
      columnHelper.accessor('productCount', {
        header: 'Products',
        cell: (info) => <span className="font-medium text-[#EAECEF]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('orderCount', {
        header: 'Orders',
        cell: (info) => <span className="font-medium text-[#EAECEF]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('revenue', {
        header: 'Revenue',
        cell: (info) => (
          <span className="font-bold text-[#0ECB81]">{formatCurrency(info.getValue())}</span>
        ),
        meta: { className: 'text-right' },
      }),
      columnHelper.accessor('lowStockCount', {
        header: 'Low Stock',
        cell: (info) => {
          const val = info.getValue();
          return (
            <StatusBadge variant={val > 0 ? 'warning' : 'success'}>
              {val > 0 ? `${val} items` : 'OK'}
            </StatusBadge>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            onClick={() => setSelectedWholesalerId(info.row.original.id)}
            className="rounded-md bg-[#F0B90B]/10 px-3 py-1.5 text-[11px] font-semibold text-[#F0B90B] transition hover:bg-[#F0B90B]/20"
          >
            <Eye className="mr-1 inline h-3 w-3" />
            Inspect
          </button>
        ),
      }),
    ],
    []
  );

  const applicationColumns = useMemo(
    () => [
      columnHelper.accessor('businessName', {
        header: 'Business',
        cell: (info) => <p className="font-semibold text-[#EAECEF]">{info.getValue()}</p>,
      }),
      columnHelper.accessor('user.email', {
        header: 'Email',
        cell: (info) => <span className="text-[#848E9C]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('onboardingStatus', {
        header: 'Status',
        cell: (info) => <StatusBadge variant="warning">{info.getValue()}</StatusBadge>,
      }),
      columnHelper.accessor('businessPhone', {
        header: 'Phone',
        cell: (info) => <span className="text-[#848E9C]">{info.getValue() || 'N/A'}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleApproveWholesaler(info.row.original.id)}
              className="rounded-md bg-[#0ECB81]/10 px-3 py-1.5 text-[11px] font-semibold text-[#0ECB81] transition hover:bg-[#0ECB81]/20"
            >
              <CheckCircle2 className="mr-1 inline h-3 w-3" />
              Approve
            </button>
            <button
              onClick={() => handleRejectWholesaler(info.row.original.id)}
              className="rounded-md bg-[#F6465D]/10 px-3 py-1.5 text-[11px] font-semibold text-[#F6465D] transition hover:bg-[#F6465D]/20"
            >
              <XCircle className="mr-1 inline h-3 w-3" />
              Reject
            </button>
          </div>
        ),
      }),
    ],
    [handleApproveWholesaler, handleRejectWholesaler]
  );

  const b2bColumns = useMemo(
    () => [
      columnHelper.accessor('companyName', {
        header: 'Company',
        cell: (info) => (
          <div>
            <p className="font-semibold text-[#EAECEF]">{info.getValue()}</p>
            <p className="text-xs text-[#5E6673]">{info.row.original.user?.name}</p>
          </div>
        ),
      }),
      columnHelper.accessor('user.email', {
        header: 'Email',
        cell: (info) => <span className="text-[#848E9C]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('taxId', {
        header: 'Tax ID',
        cell: (info) => (
          <span className="rounded bg-[#2B3139] px-2 py-0.5 font-mono text-xs text-[#F0B90B]">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('businessAddress', {
        header: 'Address',
        cell: (info) => (
          <span className="max-w-[180px] truncate text-xs text-[#848E9C]">{info.getValue()}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleB2BApprove(info.row.original.id)}
              className="rounded-md bg-[#0ECB81]/10 px-3 py-1.5 text-[11px] font-semibold text-[#0ECB81] transition hover:bg-[#0ECB81]/20"
            >
              Approve
            </button>
            <button
              onClick={() => handleB2BReject(info.row.original.id)}
              className="rounded-md bg-[#F6465D]/10 px-3 py-1.5 text-[11px] font-semibold text-[#F6465D] transition hover:bg-[#F6465D]/20"
            >
              Reject
            </button>
          </div>
        ),
      }),
    ],
    [handleB2BApprove, handleB2BReject]
  );

  const pendingApplications = statsData?.pendingApplications || [];
  const pendingB2B = b2bApps.filter((app) => app.verification === 'APPLIED');

  const tabs = [
    { id: 'directory', label: 'Directory', count: wholesalersData?.length || 0 },
    { id: 'applications', label: 'Applications', count: pendingApplications.length },
    { id: 'b2b', label: 'B2B Verification', count: pendingB2B.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        badge="Seller management"
        title="Wholesaler Directory & Applications"
        description="Manage sellers, review onboarding applications, approve B2B verifications, and inspect tenant details."
      />

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-[#2B3139] bg-[#12161C] p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#2B3139] text-[#F0B90B]'
                : 'text-[#848E9C] hover:text-[#EAECEF]'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-[#F0B90B]/10 text-[#F0B90B]'
                    : 'bg-[#2B3139] text-[#5E6673]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          <Panel title="All Wholesalers" eyebrow="Seller directory" icon={Building2}>
            <DataTable
              columns={directoryColumns}
              data={wholesalersData || []}
              isLoading={isLoadingWholesalers}
              searchPlaceholder="Search wholesalers..."
              emptyStateMessage="No wholesalers found."
            />
          </Panel>

          {selectedWholesalerId && (
            <TenantDetailPanel
              tenant={tenantData}
              isLoading={isLoadingTenant}
              onClose={() => setSelectedWholesalerId(null)}
            />
          )}
        </div>
      )}

      {activeTab === 'applications' && (
        <Panel title="Pending Applications" eyebrow="Onboarding queue" icon={Shield}>
          {pendingApplications.length > 0 ? (
            <DataTable
              columns={applicationColumns}
              data={pendingApplications}
              searchPlaceholder="Search applications..."
              emptyStateMessage="No pending applications."
            />
          ) : (
            <EmptyState icon={CheckCircle2} message="No pending wholesaler applications." />
          )}
        </Panel>
      )}

      {activeTab === 'b2b' && (
        <Panel title="B2B Business Applications" eyebrow="Verification queue" icon={Shield}>
          {pendingB2B.length > 0 ? (
            <DataTable
              columns={b2bColumns}
              data={pendingB2B}
              isLoading={isLoadingB2B}
              searchPlaceholder="Search B2B applications..."
              emptyStateMessage="No pending verifications."
            />
          ) : (
            <EmptyState icon={CheckCircle2} message="No pending B2B verifications." />
          )}
        </Panel>
      )}
    </div>
  );
}

function TenantDetailPanel({ tenant, isLoading, onClose }) {
  if (isLoading) {
    return (
      <Panel title="Tenant Detail" eyebrow="Loading..." icon={PackageSearch}>
        <div className="flex items-center gap-3 rounded-lg bg-[#1E2329] px-4 py-5 text-[#F0B90B]">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading seller detail...</span>
        </div>
      </Panel>
    );
  }

  if (!tenant) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel
        title="Tenant Detail"
        eyebrow={tenant.businessName}
        icon={PackageSearch}
        action={
          <button
            onClick={onClose}
            className="rounded-md border border-[#2B3139] px-3 py-1.5 text-xs font-medium text-[#848E9C] transition hover:border-[#F6465D]/40 hover:text-[#F6465D]"
          >
            Close
          </button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-[#1E2329] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#848E9C]">Owner</p>
            <p className="mt-1 text-xl font-bold text-[#EAECEF]">{tenant.ownerName}</p>
            <p className="mt-0.5 text-sm text-[#5E6673]">{tenant.ownerEmail}</p>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-[#5E6673]">
              Joined {formatDate(tenant.joinedAt)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric
              label="Revenue"
              value={formatCurrency(tenant.metrics.revenue)}
              icon={CircleDollarSign}
            />
            <MiniMetric
              label="Inventory"
              value={formatCurrency(tenant.metrics.inventoryValue)}
              icon={Boxes}
            />
            <MiniMetric label="Orders" value={tenant.metrics.orderCount} icon={ShoppingBag} />
            <MiniMetric label="Products" value={tenant.metrics.productCount} icon={Building2} />
          </div>

          {/* Inventory Risk */}
          <div className="rounded-lg bg-[#1E2329] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#848E9C]">
              Inventory Risk
            </p>
            <div className="mt-3 space-y-2">
              {(tenant.inventoryRisk || []).length > 0 ? (
                tenant.inventoryRisk.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-md bg-[#12161C] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#EAECEF]">{product.name}</p>
                      <p className="text-xs text-[#5E6673]">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#F6465D]">
                        {product.currentStock} left
                      </p>
                      <p className="text-xs text-[#5E6673]">Min {product.minStock}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-[#12161C] px-3 py-3 text-sm text-[#5E6673]">
                  No risk items.
                </p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel title="Recent Orders" eyebrow="Latest" icon={ShoppingBag}>
          <div className="space-y-2">
            {(tenant.recentOrders || []).length > 0 ? (
              tenant.recentOrders.map((order) => (
                <div key={order.id} className="rounded-lg bg-[#1E2329] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#EAECEF]">{order.buyerName}</p>
                      <p className="text-xs text-[#5E6673]">{order.buyerEmail}</p>
                    </div>
                    <p className="text-sm font-bold text-[#0ECB81]">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusBadge variant="dark">{order.status}</StatusBadge>
                    <StatusBadge variant="neutral">{order.paymentStatus}</StatusBadge>
                    <StatusBadge variant="neutral">{formatDate(order.createdAt)}</StatusBadge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon={ShoppingBag} message="No recent orders." />
            )}
          </div>
        </Panel>

        <Panel title="Inventory Activity" eyebrow="Recent" icon={Activity}>
          <div className="space-y-2">
            {(tenant.recentInventoryLogs || []).length > 0 ? (
              tenant.recentInventoryLogs.map((log) => (
                <div key={log.id} className="rounded-lg bg-[#1E2329] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#EAECEF]">{log.productName}</p>
                      <p className="text-xs text-[#5E6673]">{log.reason}</p>
                    </div>
                    <p className="text-sm font-bold text-[#EAECEF]">{log.changeAmount}</p>
                  </div>
                  <p className="mt-1 text-xs text-[#5E6673]">{formatDate(log.createdAt)}</p>
                </div>
              ))
            ) : (
              <EmptyState icon={Activity} message="No recent activity." />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg bg-[#1E2329] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#848E9C]">{label}</p>
        <Icon className="h-3.5 w-3.5 text-[#5E6673]" />
      </div>
      <p className="mt-2 text-lg font-bold text-[#EAECEF]">{value}</p>
    </div>
  );
}
