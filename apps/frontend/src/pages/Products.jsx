import { useState, useEffect } from 'react';
import { Plus, PackageSearch, Package } from 'lucide-react';
import apiClient from '../api/axios';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 1. UPDATED: Added 'category' to the initial state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '', // <-- Added Category
    price: '',
    costPrice: '',
    sku: '',
    imageUrl: '', 
    currentStock: '',
    minStock: '10'
  });

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/products');
      setProducts(response.data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/products', {
        ...formData,
        price: parseFloat(formData.price),
        costPrice: parseFloat(formData.costPrice || 0),
        currentStock: parseInt(formData.currentStock || 0, 10),
        minStock: parseInt(formData.minStock || 10, 10)
      });
      
      fetchProducts();
      setIsModalOpen(false);
      // 2. UPDATED: Reset form includes category
      setFormData({ name: '', description: '', category: '', price: '', costPrice: '', sku: '', imageUrl: '', currentStock: '', minStock: '10' });
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create product');
    }
  };

  return (
    <div className="space-y-6 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Products Management</h1>
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
      {isLoading ? (
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
          <p className="mt-2 text-zinc-400 max-w-sm">You haven't added any products to your catalog yet. Click "Add Product" to get started.</p>
        </div>
      ) : (
        <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-[#0a0a0a]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">SKU</th>
                  {/* 3. UPDATED: Added Category Table Header */}
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">Price (₹)</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-amber-500/80 uppercase tracking-widest">Stock</th>
                </tr>
              </thead>
              <tbody className="bg-[#1c1c1c] divide-y divide-zinc-800/50">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-zinc-800/40 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 bg-[#F5F5F0] rounded-md overflow-hidden flex items-center justify-center border border-zinc-700 group-hover:border-amber-500/30 transition-colors">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply p-1" />
                          ) : (
                            <span className="text-zinc-400 text-[9px] font-bold uppercase tracking-widest">No Img</span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">{product.name}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[200px] mt-0.5">{product.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 font-mono">{product.sku}</td>
                    
                    {/* 4. UPDATED: Display Category in Table */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.category ? (
                        <span className="bg-zinc-800 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-700">
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs italic">Uncategorized</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-500">
                      ₹{parseFloat(product.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-[11px] leading-5 font-bold uppercase tracking-wide rounded-sm border ${
                        product.currentStock > (product.minStock || 10) 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        product.currentStock > 0 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
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
          <div className="bg-[#1c1c1c] rounded-lg shadow-2xl border border-zinc-800 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-800 bg-[#0a0a0a] sticky top-0 z-10">
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center">
                <Plus className="h-5 w-5 mr-2 text-amber-500" />
                Add New Product
              </h3>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Product Name *</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className="block w-full px-4 py-2.5 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="block w-full px-4 py-2.5 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"></textarea>
                </div>

                {/* 5. UPDATED: SKU and Category placed side-by-side */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">SKU Code *</label>
                    <input required type="text" name="sku" value={formData.sku} onChange={handleChange} className="block w-full px-4 py-2.5 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Category</label>
                    <input type="text" name="category" placeholder="Optional" value={formData.category} onChange={handleChange} className="block w-full px-4 py-2.5 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Selling Price (₹) *</label>
                    <input required type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleChange} className="block w-full px-4 py-2.5 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Cost Price (₹)</label>
                    <input type="number" step="0.01" min="0" name="costPrice" value={formData.costPrice} onChange={handleChange} placeholder="Optional" className="block w-full px-4 py-2.5 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Initial Stock</label>
                    <input type="number" min="0" name="currentStock" value={formData.currentStock} onChange={handleChange} className="block w-full px-4 py-2.5 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Min Stock Alert</label>
                    <input type="number" min="0" name="minStock" value={formData.minStock} onChange={handleChange} className="block w-full px-4 py-2.5 bg-[#0a0a0a] border border-zinc-700 rounded-md text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Image URL</label>
                  <input type="url" name="imageUrl" placeholder="https://example.com/image.png" value={formData.imageUrl} onChange={handleChange} className="block w-full px-4 py-2.5 bg-[#0a0a0a] border border-zinc-700 rounded-md text-zinc-300 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all" />
                </div>
              </form>
            </div>
            
            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-[#0a0a0a] flex justify-end space-x-3 sticky bottom-0 z-10">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-zinc-700 rounded-md text-sm font-medium text-zinc-300 bg-[#1c1c1c] hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} type="submit" className="px-5 py-2.5 border border-transparent rounded-md text-sm font-bold text-[#0a0a0a] bg-amber-500 hover:bg-amber-400 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}