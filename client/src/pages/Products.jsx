import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PackageSearch, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProducts, useCreateProduct } from '../api/queries';
import { ProductForm } from '../components/ProductForm';

export default function Products() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: products = [], isLoading, isError, error, isFetching, refetch } = useProducts();
  const createProductMutation = useCreateProduct();

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
        <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[820px] w-full divide-y divide-zinc-800">
              <thead className="bg-[#0a0a0a]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                    SKU
                  </th>
                  {/* 3. UPDATED: Added Category Table Header */}
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                    Price (₹)
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#1c1c1c] divide-y divide-zinc-800/50">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => navigate(`/wholesaler/products/${product.id}`)}
                    className="cursor-pointer hover:bg-zinc-800/40 transition-colors group"
                  >
                    <td className="px-4 py-4 sm:px-6 align-top">
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
                    </td>
                    <td className="px-4 py-4 sm:px-6 text-sm text-zinc-400 font-mono break-all align-top">
                      {product.sku}
                    </td>

                    {/* 4. UPDATED: Display Category in Table */}
                    <td className="px-4 py-4 sm:px-6 align-top">
                      {product.category ? (
                        <span className="inline-flex max-w-[180px] break-words bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-700">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">Uncategorized</span>
                      )}
                    </td>

                    <td className="px-4 py-4 sm:px-6 whitespace-nowrap text-sm font-bold text-amber-500 align-top">
                      ₹{parseFloat(product.price).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 sm:px-6 whitespace-nowrap align-top">
                      <span
                        className={`px-2.5 py-1 inline-flex text-[11px] leading-5 font-bold uppercase tracking-wide rounded-sm border ${
                          product.currentStock > (product.minStock || 10)
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : product.currentStock > 0
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {product.currentStock} in stock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
