import { useState, useMemo } from 'react';
import { Archive, PlusSquare, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useInventoryLogs, useProducts, useAdjustStock } from '../api/queries';
import DataTable from '../components/DataTable';
import { cn } from '../utils/cn';

export default function Inventory() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Non-URL-synced table states
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  // Form state for adjusting stock
  const [formData, setFormData] = useState({
    productId: '',
    changeAmount: '',
    reason: 'MANUAL_ADJUSTMENT', // Default reason
  });

  const {
    data: logs = [],
    isLoading: isLoadingLogs,
    isError: isErrorLogs,
    error: errorLogs,
    isFetching: isFetchingLogs,
    refetch: refetchLogs,
  } = useInventoryLogs();

  const {
    data: products = [],
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
  } = useProducts();

  const adjustStockMutation = useAdjustStock();

  const isLoading = isLoadingLogs || isLoadingProducts;
  const isError = isErrorLogs || isErrorProducts;

  // Derive controlled table state from URL query parameters
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;

  const pagination = useMemo(
    () => ({
      pageIndex: page - 1,
      pageSize,
    }),
    [page, pageSize]
  );

  const sortParam = searchParams.get('sort') || 'createdAt:desc';
  const sorting = useMemo(() => {
    const [id, order] = sortParam.split(':');
    if (!id) return [];
    return [{ id, desc: order === 'desc' }];
  }, [sortParam]);

  const globalFilter = searchParams.get('q') || '';

  // Table state synchronization updates browser URL query parameters
  const setPagination = (updater) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(next.pageIndex + 1));
    nextParams.set('pageSize', String(next.pageSize));
    setSearchParams(nextParams, { replace: true });
  };

  const setSorting = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const nextParams = new URLSearchParams(searchParams);
    if (next && next.length > 0) {
      nextParams.set('sort', `${next[0].id}:${next[0].desc ? 'desc' : 'asc'}`);
    } else {
      nextParams.delete('sort');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const setGlobalFilter = (updater) => {
    const next = typeof updater === 'function' ? updater(globalFilter) : updater;
    const nextParams = new URLSearchParams(searchParams);
    if (next) {
      nextParams.set('q', next);
      nextParams.set('page', '1'); // Reset pagination to page 1 on search filter
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  };

  // Define table columns
  const columns = useMemo(
    () => [
      {
        id: 'direction',
        header: '',
        cell: ({ row }) => {
          const log = row.original;
          const isPositive = Number(log.changeAmount) > 0;
          return isPositive ? (
            <span className="inline-flex p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="inline-flex p-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </span>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'createdAt',
        header: 'Date',
        cell: ({ getValue }) => {
          const val = getValue();
          const date = new Date(val);
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-text-title text-xs">
                {date.toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="text-[10px] text-text-muted mt-0.5 font-mono">
                {date.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        },
      },
      {
        id: 'product',
        accessorFn: (row) => row.product?.name,
        header: 'Product',
        cell: ({ row }) => {
          const log = row.original;
          return (
            <div>
              <div className="font-bold text-text-title group-hover:text-brand-accent transition-colors">
                {log.product?.name || 'Unknown'}
              </div>
              <div className="text-[11px] text-text-muted font-mono tracking-wider mt-0.5">
                SKU: {log.product?.sku || '-'}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: ({ getValue }) => {
          const reason = getValue() || '';
          const reasonStyles = {
            SALE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            REFUND:
              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            OCR_UPDATE:
              'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
            MANUAL_ADJUSTMENT:
              'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          };
          const styleClass =
            reasonStyles[reason] || 'bg-bg-main text-text-body border-border-subtle';
          return (
            <span
              className={cn(
                'px-2.5 py-0.5 inline-flex text-[9px] font-bold uppercase tracking-wider rounded-sm border shadow-sm',
                styleClass
              )}
            >
              {reason.replace(/_/g, ' ')}
            </span>
          );
        },
      },
      {
        accessorKey: 'changeAmount',
        header: 'Change',
        cell: ({ getValue }) => {
          const val = Number(getValue());
          const isPositive = val > 0;
          return (
            <span
              className={cn(
                'font-mono text-xs font-bold px-2.5 py-0.5 rounded-sm border inline-flex items-center justify-center min-w-[40px]',
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
              )}
            >
              {isPositive ? `+${val}` : val}
            </span>
          );
        },
        meta: {
          className: 'text-right',
        },
      },
    ],
    []
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    adjustStockMutation.mutate(
      {
        productId: formData.productId,
        changeAmount: parseInt(formData.changeAmount, 10),
        reason: formData.reason,
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setFormData({ productId: '', changeAmount: '', reason: 'MANUAL_ADJUSTMENT' });
          toast.success('Stock adjusted successfully!');
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to adjust inventory');
        },
      }
    );
  };

  return (
    <div className="space-y-6 font-sans selection:bg-brand-accent/30 selection:text-text-title">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-title tracking-wide flex items-center gap-2">
            Inventory Logs
            {isFetchingLogs && !isLoadingLogs && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/20 animate-pulse">
                Syncing...
              </span>
            )}
          </h1>
          <p className="text-sm text-text-muted mt-1">Immutable record of all stock movements.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2.5 bg-brand-primary text-white font-semibold rounded-md hover:bg-brand-primary-hover transition-colors shadow-sm"
        >
          <PlusSquare className="h-5 w-5 mr-2" />
          Adjust Stock
        </button>
      </div>

      {/* Inventory Logs Table */}
      {isError ? (
        <div className="bg-bg-card rounded-lg shadow-sm border border-semantic-danger/20 p-12 flex flex-col items-center justify-center text-center">
          <p className="text-semantic-danger text-sm font-semibold mb-4">
            Failed to load inventory logs:{' '}
            {errorLogs?.response?.data?.error || errorLogs?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => refetchLogs()}
            className="px-5 py-2 bg-semantic-danger hover:bg-semantic-danger/90 text-white font-semibold rounded-md transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-brand-accent space-y-4">
          <FileText className="h-8 w-8 animate-pulse" />
          <p className="font-semibold tracking-wider uppercase text-xs text-text-muted">
            Loading logs...
          </p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-bg-card rounded-lg shadow-sm border border-dashed border-border-subtle p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-bg-main p-5 rounded-full mb-5 border border-border-subtle shadow-sm">
            <Archive className="h-10 w-10 text-brand-accent" />
          </div>
          <h3 className="text-lg font-bold text-text-title tracking-wide">
            No stock movements yet
          </h3>
          <p className="mt-2 text-text-muted max-w-sm text-sm">
            When you add stock or process an order, the immutable logs will appear here.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          isLoading={isLoadingLogs}
          sorting={sorting}
          setSorting={setSorting}
          pagination={pagination}
          setPagination={setPagination}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          columnVisibility={columnVisibility}
          setColumnVisibility={setColumnVisibility}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          searchPlaceholder="Search product name or SKU..."
          emptyStateMessage="No matching inventory logs found."
        />
      )}

      {/* Adjust Stock Modal - Dark Glassmorphism */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-card rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-border-subtle flex flex-col">
            <div className="px-6 py-4 border-b border-border-subtle bg-bg-main">
              <h3 className="text-base font-bold text-text-title tracking-wide flex items-center">
                <PlusSquare className="h-5 w-5 mr-2 text-brand-accent" />
                Adjust Inventory Stock
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Select Product *
                </label>
                <select
                  required
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  className="block w-full px-4 py-2.5 bg-bg-main border border-border-subtle rounded-md text-text-title focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all appearance-none cursor-pointer text-sm"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: `right .5rem center`,
                    backgroundRepeat: `no-repeat`,
                    backgroundSize: `1.5em 1.5em`,
                  }}
                >
                  <option value="" disabled className="text-text-muted/60">
                    -- Choose a product --
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Quantity Change (+ or -) *
                </label>
                <input
                  required
                  type="number"
                  name="changeAmount"
                  placeholder="e.g. 50 or -10"
                  value={formData.changeAmount}
                  onChange={handleChange}
                  className="block w-full px-4 py-2.5 bg-bg-main border border-border-subtle rounded-md text-text-title placeholder-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all font-mono text-sm"
                />
                <p className="text-[11px] font-medium text-text-muted mt-1.5 uppercase tracking-wide">
                  Use a negative number to remove stock.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                  Reason *
                </label>
                <select
                  required
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className="block w-full px-4 py-2.5 bg-bg-main border border-border-subtle rounded-md text-text-title focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary transition-all appearance-none cursor-pointer text-sm"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: `right .5rem center`,
                    backgroundRepeat: `no-repeat`,
                    backgroundSize: `1.5em 1.5em`,
                  }}
                >
                  <option value="MANUAL_ADJUSTMENT">
                    Manual Adjustment (Adding/Removing Stock)
                  </option>
                  <option value="OCR_UPDATE">AI Khatta Update</option>
                  <option value="REFUND">Customer Refund</option>
                </select>
              </div>

              <div className="pt-6 flex justify-end space-x-3 border-t border-border-subtle/50 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-border-subtle rounded-md text-sm font-medium text-text-body bg-bg-card hover:bg-bg-card-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 border border-transparent rounded-md text-sm font-bold text-white bg-brand-primary hover:bg-brand-primary-hover transition-colors shadow-sm"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
