import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Store, Package, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();
  const { logout } = useAuthStore(); // Grab the logout function
  const addToCart = useCartStore((state) => state.addToCart);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const response = await apiClient.get('/products/marketplace');
        setProducts(response.data.products);
      } catch (error) {
        console.error('Failed to load marketplace:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketplace();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.wholesaler?.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Navigation Bar for Marketplace */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 
            className="text-2xl font-extrabold text-blue-600 tracking-tight cursor-pointer"
            onClick={() => navigate('/store')}
          >
            GlobalMarket
          </h1>
          
          {/* Search Bar */}
          <div className="relative w-full max-w-md hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 sm:text-sm transition-all"
              placeholder="Search products or shops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* ACTION ICONS (Orders, Cart, Logout) */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* My Orders Button */}
            <button 
              onClick={() => navigate('/orders')} 
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors flex items-center"
              title="My Orders"
            >
              <Package className="h-6 w-6" />
            </button>

            {/* Shopping Cart Button */}
            <button 
              onClick={() => navigate('/cart')}
              className="p-2 text-gray-500 hover:text-blue-600 relative transition-colors"
              title="Shopping Cart"
            >
              <ShoppingCart className="h-6 w-6" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold text-center leading-4">
                  {totalItems}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

            {/* Logout Button */}
            <button 
              onClick={handleLogout} 
              className="p-2 text-gray-400 hover:text-red-600 transition-colors flex items-center"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Trending Today</h2>

        {isLoading ? (
          <div className="flex justify-center py-20 text-gray-500">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-500">No products found. Try a different search!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                <div className="h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <Store className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-gray-900 truncate pr-2">{product.name}</h3>
                    <span className="text-lg font-black text-blue-600">₹{parseFloat(product.price).toFixed(2)}</span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <Store className="h-3 w-3 mr-1" />
                    Sold by: <span className="font-medium text-gray-700 ml-1">{product.wholesaler?.businessName || 'Unknown Shop'}</span>
                  </p>

                  <p className="mt-3 text-sm text-gray-600 line-clamp-2 min-h-[40px] flex-grow">
                    {product.description || "No description provided for this item."}
                  </p>

                  <button 
                    onClick={() => addToCart(product)}
                    className="mt-5 w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors active:scale-95"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}