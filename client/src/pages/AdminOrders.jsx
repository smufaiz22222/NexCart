import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { ShoppingBag, Search, Filter } from 'lucide-react';
import apiClient from '../api/axios';
import DataTable from '../components/DataTable';
import { PageHeader, StatusBadge } from '../components/admin';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));

const statusVariantMap = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURN_REQUESTED: 'warning',
  RETURN_APPROVED: 'info',
  RETURN_COMPLETED: 'neutral',
};

const paymentVariantMap = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
};

const ORDER_STATUSES = [
  '',
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'RETURN_COMPLETED',
];

const columnHelper = createColumnHelper();

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleSearchChange = (value) => {
    setSearch(value);
    clearTimeout(window.__adminOrderSearchTimeout);
    window.__adminOrderSearchTimeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['adminOrders', page, pageSize, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      const response = await apiClient.get(`/admin/orders?${params.toString()}`);
      return response.data;
    },
    keepPreviousData: true,
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const tanstackPagination = useMemo(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize]
  );

  const handlePaginationChange = (updater) => {
    const next = typeof updater === 'function' ? updater(tanstackPagination) : updater;
    setPage(next.pageIndex + 1);
    setPageSize(next.pageSize);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'Order ID',
        cell: (info) => (
          <span className="font-mono text-xs text-[#5E6673]">
            {info.getValue().slice(0, 8)}...
          </span>
        ),
        enableSorting: false,
      }),
      columnHelper.accessor('buyerName', {
        header: 'Buyer',
        cell: (info) => (
          <div>
            <p className="font-medium text-[#EAECEF]">{info.getValue()}</p>
            <p className="text-xs text-[#5E6673]">{info.row.original.buyerEmail}</p>
          </div>
        ),
      }),
      columnHelper.accessor('sellerName', {
        header: 'Seller',
        cell: (info) => <span className="text-sm text-[#848E9C]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => (
          <StatusBadge variant={statusVariantMap[info.getValue()] || 'neutral'}>
            {info.getValue()}
          </StatusBadge>
        ),
      }),
      columnHelper.accessor('paymentStatus', {
        header: 'Payment',
        cell: (info) => (
          <StatusBadge variant={paymentVariantMap[info.getValue()] || 'neutral'}>
            {info.getValue()}
          </StatusBadge>
        ),
      }),
      columnHelper.accessor('paymentMethod', {
        header: 'Method',
        cell: (info) => (
          <span className="text-xs font-medium text-[#5E6673]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('itemCount', {
        header: 'Items',
        cell: (info) => <span className="font-medium text-[#EAECEF]">{info.getValue()}</span>,
      }),
      columnHelper.accessor('totalAmount', {
        header: 'Total',
        cell: (info) => (
          <span className="font-bold text-[#0ECB81]">{formatCurrency(info.getValue())}</span>
        ),
        meta: { className: 'text-right' },
      }),
      columnHelper.accessor('createdAt', {
        header: 'Date',
        cell: (info) => (
          <span className="text-xs text-[#5E6673]">{formatDate(info.getValue())}</span>
        ),
      }),
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShoppingBag}
        badge="Order management"
        title="Platform Orders"
        description="Browse and monitor all orders across sellers with filtering and pagination."
      />

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#2B3139] bg-[#12161C] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5E6673]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by buyer, seller, or ID..."
            className="w-full rounded-lg border border-[#2B3139] bg-[#1E2329] py-2.5 pl-10 pr-4 text-sm text-[#EAECEF] placeholder-[#5E6673] focus:border-[#F0B90B]/50 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-[#5E6673]" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-[#2B3139] bg-[#1E2329] px-3 py-2.5 text-sm font-medium text-[#EAECEF] focus:border-[#F0B90B]/50 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {ORDER_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <div className="rounded-lg border border-[#2B3139] bg-[#1E2329] px-3 py-2.5 text-sm font-bold text-[#F0B90B]">
            {pagination.total} orders
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-[#2B3139] bg-[#12161C] p-5">
        <DataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          pagination={tanstackPagination}
          setPagination={handlePaginationChange}
          pageCount={pagination.totalPages}
          manualPagination={true}
          showGlobalFilter={false}
          searchPlaceholder="Search orders..."
          emptyStateMessage="No orders found matching your criteria."
        />
      </div>
    </div>
  );
}
