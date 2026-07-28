import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeIndianRupee,
  Building2,
  CircleDollarSign,
  LoaderCircle,
  Shield,
  UserRound,
} from 'lucide-react';
import apiClient from '../api/axios';
import {
  SuperAdminHeaderHero,
  SuperAdminPendingApplications,
  SuperAdminBillingCommand,
  SuperAdminB2BApplications,
  SuperAdminCharts,
  SuperAdminWholesalerLeaders,
  SuperAdminTenantDetail,
} from '../components/admin/SuperAdminDashboardComponents';

const EMPTY_ARRAY = [];

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

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const formatDate = (value) => dateFormatter.format(new Date(value));

export default function SuperAdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [selectedWholesalerId, setSelectedWholesalerId] = useState('');
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);
  const [error, setError] = useState('');

  // B2B Applications state
  const [b2bApps, setB2bApps] = useState([]);
  const [_isLoadingB2B, setIsLoadingB2B] = useState(false);

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
        const confirmApprove = window.confirm(
          'Are you sure you want to approve this B2B wholesale onboarding request?'
        );
        if (!confirmApprove) return;
        await apiClient.post(`/b2b/admin/approve/${appId}`, { verification: 'APPROVED' });
      } else if (action === 'reject') {
        const reason = window.prompt(
          'Enter a rejection reason for this B2B onboarding application:'
        );
        if (reason === null) return;
        await apiClient.post(`/b2b/admin/approve/${appId}`, {
          verification: 'REJECTED',
          rejectionReason: reason,
        });
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
      <SuperAdminHeaderHero cards={cards} />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SuperAdminPendingApplications
          pendingApplications={overview?.pendingApplications}
          handleApplicationAction={handleApplicationAction}
        />
        <SuperAdminBillingCommand totals={overview?.totals} />
      </section>

      <SuperAdminB2BApplications b2bApps={b2bApps} handleB2BAction={handleB2BAction} />

      <SuperAdminCharts
        monthlyRevenue={overview?.charts?.monthlyRevenue}
        orderStatus={overview?.charts?.orderStatus}
        formatCurrency={formatCurrency}
      />

      <SuperAdminWholesalerLeaders
        topWholesalers={overview?.topWholesalers || []}
        wholesalers={overview?.wholesalers || []}
        selectedWholesalerId={selectedWholesalerId}
        setSelectedWholesalerId={setSelectedWholesalerId}
        formatCurrency={formatCurrency}
      />

      <SuperAdminTenantDetail
        isLoadingTenant={isLoadingTenant}
        tenant={tenant}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />
    </div>
  );
}
