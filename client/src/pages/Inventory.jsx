import { useState, useMemo } from 'react';
import { Archive, PlusSquare, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useInventoryLogs, useProducts, useAdjustStock } from '../api/queries';
import DataTable from '../components/DataTable';
import AdjustStockModal from '../components/inventory/AdjustStockModal';
import { useInventoryColumns } from '../components/inventory/useInventoryColumns';

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
    const newPage = String(next.pageIndex + 1);
    const newPageSize = String(next.pageSize);
    if (searchParams.get('page') !== newPage || searchParams.get('pageSize') !== newPageSize) {
      nextParams.set('page', newPage);
      nextParams.set('pageSize', newPageSize);
      setSearchParams(nextParams, { replace: true });
    }
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
  const columns = useInventoryColumns();

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
          type="button"
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
            type="button"
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

      <AdjustStockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        products={products}
        handleSubmit={handleSubmit}
      />
    </div>
  );
}
