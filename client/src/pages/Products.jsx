import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, PackageSearch, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProducts, useCreateProduct } from '../api/queries';
import { ProductForm } from '../components/ProductForm';
import DataTable from '../components/DataTable';
import { cn } from '../utils/cn';

export default function Products() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Controlled states for table
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  const { data: products = [], isLoading, isError, error, isFetching, refetch } = useProducts();
  const createProductMutation = useCreateProduct();

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

  const sortParam = searchParams.get('sort') || 'name:asc';
  const sorting = useMemo(() => {
    const [id, order] = sortParam.split(':');
    if (!id) return [];
    return [{ id, desc: order === 'desc' }];
  }, [sortParam]);

  const globalFilter = searchParams.get('q') || '';

  // Synchronizers
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
      nextParams.set('page', '1'); // Reset to page 1 on search
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  };

  // Define table columns
  const columns = useMemo(
    () => [
      {
        id: 'product',
        accessorFn: (row) => row.name,
        header: 'Product',
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="flex items-start min-w-0">
              <div className="flex-shrink-0 h-12 w-12 bg-[#F5F5F0] rounded-md overflow-hidden flex items-center justify-center border border-zinc-700 group-hover:border-amber-500/30 transition-colors">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-full w-full object-contain mix-blend-multiply p-1"
                  />
                ) : (
                  <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest">
                    No Img
                  </span>
                )}
              </div>
              <div className="ml-4 min-w-0">
                <div className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors break-words leading-5">
                  {product.name}
                </div>
                <div className="mt-0.5 max-w-[280px] text-xs leading-5 text-zinc-500 break-words line-clamp-2">
                  {product.description || 'No description'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ getValue }) => (
          <span className="font-mono text-zinc-400 break-all">{getValue()}</span>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => {
          const category = getValue();
          return category ? (
            <span className="inline-flex max-w-[180px] break-words bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-700">
              {category}
            </span>
          ) : (
            <span className="text-zinc-600 text-xs italic">Uncategorized</span>
          );
        },
      },
      {
        accessorKey: 'price',
        header: 'Price (₹)',
        cell: ({ getValue }) => {
          const val = parseFloat(getValue());
          return <span className="font-bold text-amber-500">₹{val.toFixed(2)}</span>;
        },
      },
      {
        accessorKey: 'currentStock',
        header: 'Stock',
        cell: ({ row }) => {
          const product = row.original;
          const isLow = product.currentStock <= (product.minStock || 10);
          const isOut = product.currentStock <= 0;
          return (
            <span
              className={cn(
                'px-2.5 py-1 inline-flex text-[11px] leading-5 font-bold uppercase tracking-wide rounded-sm border',
                !isLow
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : !isOut
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
              )}
            >
              {product.currentStock} in stock
            </span>
          );
        },
      },
    ],
    []
  );

  const handleCreateProduct = async (values) => {
    createProductMutation.mutate(
      {
        ...values,
        price: parseFloat(values.price),
        currentStock: parseInt(values.currentStock || 0, 10),
        minStock: parseInt(values.minStock || 10, 10),
      },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success('Product created successfully!');
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to create product');
        },
      }
    );
  };

  return (
    <div className="space-y-6 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            Products Management
            {isFetching && !isLoading && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                Syncing...
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Add and manage your inventory catalog.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2.5 bg-amber-500 text-[#0a0a0a] font-bold rounded-md hover:bg-amber-400 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Product
        </button>
      </div>

      {/* Products Table Area */}
      {isError ? (
        <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-red-500/20 p-12 flex flex-col items-center justify-center text-center">
          <p className="text-red-400 text-sm font-semibold mb-4">
            Failed to load products:{' '}
            {error?.response?.data?.error || error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md transition-all active:scale-[0.98]"
          >
            Retry Loading
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-amber-500 space-y-4">
          <Package className="h-8 w-8 animate-pulse" />
          <p className="font-medium tracking-widest uppercase text-sm">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-dashed border-zinc-700 p-12 flex flex-col items-center justify-center text-center">
          <div className="bg-[#0a0a0a] p-5 rounded-full mb-5 border border-zinc-800">
            <PackageSearch className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-white tracking-wide">No products found</h3>
          <p className="mt-2 text-zinc-400 max-w-sm">
            You haven't added any products to your catalog yet. Click "Add Product" to get started.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={products}
          isLoading={isLoading}
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
          onRowClick={(row) => navigate(`/wholesaler/products/${row.id}`)}
          searchPlaceholder="Search product name or SKU..."
          emptyStateMessage="No matching products found."
        />
      )}

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1c1c1c] rounded-[32px] shadow-2xl border border-zinc-800 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-zinc-800 bg-[#0a0a0a] flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-amber-500" />
                  Add New Product
                </h3>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">
                  Catalog Entry System
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-8">
              <ProductForm onSubmit={handleCreateProduct} onCancel={() => setIsModalOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
