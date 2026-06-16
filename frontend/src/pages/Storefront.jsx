import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Search, Store, Package, LogOut, Filter, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

export default function Storefront() {
  const [marketplaceProducts, setMarketplaceProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [recommendedProductIds, setRecommendedProductIds] = useState(new Set());
  const [recommendationId, setRecommendationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const loggedImpressionRecommendationIds = useRef(new Set());

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const [marketplaceResponse, recommendationResponse] = await Promise.all([
          apiClient.get('/products/marketplace'),
          apiClient.get('/recommendations/popular?scope=trending&limit=100'),
        ]);

        const marketplaceProducts = marketplaceResponse.data.products || [];
        const recommendationItems = recommendationResponse.data.recommendations || [];
        const recommendedProducts = recommendationItems.map((item) => item.product).slice(0, 24);
        const recommendedIds = new Set(recommendedProducts.map((product) => product.id));

        setMarketplaceProducts(marketplaceProducts);
        setTrendingProducts(recommendedProducts);
        setRecommendedProductIds(recommendedIds);
        setRecommendationId(recommendationResponse.data.recommendationId || null);
      } catch (error) {
        console.error('Failed to load marketplace with recommendations:', error);
        try {
          const fallbackResponse = await apiClient.get('/products/marketplace');
          const fallbackProducts = fallbackResponse.data.products || [];
          setMarketplaceProducts(fallbackProducts);
          setTrendingProducts(fallbackProducts.slice(0, 24));
          setRecommendedProductIds(new Set());
          setRecommendationId(null);
        } catch (fallbackError) {
          console.error('Failed to load marketplace:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchMarketplace();
  }, []);

  useEffect(() => {
    if (!recommendationId || trendingProducts.length === 0) return;
    if (loggedImpressionRecommendationIds.current.has(recommendationId)) return;

    loggedImpressionRecommendationIds.current.add(recommendationId);
    apiClient
      .post('/interactions/recommendation-events', {
        recommendationId,
        events: trendingProducts.map((product) => ({
          productId: product.id,
          eventType: 'impression',
        })),
      })
      .catch((error) => console.error('Failed to log recommendation impressions:', error));
  }, [recommendationId, trendingProducts]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProductClick = (product) => {
    let recommendationContext = null;

    if (recommendationId && recommendedProductIds.has(product.id)) {
      recommendationContext = {
        recommendationId,
        productId: product.id,
        source: 'storefront_trending',
      };

      apiClient
        .post('/interactions/recommendation-event', {
          recommendationId,
          productId: product.id,
          eventType: 'click',
        })
        .catch((error) => console.error('Failed to log recommendation click:', error));
    }

    navigate(
      `/store/product/${product.id}`,
      recommendationContext ? { state: { recommendationContext } } : undefined
    );
  };

  const isSearchingOrFiltering = searchTerm.trim().length > 0 || selectedCategory !== 'All';
  const productsToDisplay = isSearchingOrFiltering ? marketplaceProducts : trendingProducts;

  const categories = ['All', ...new Set(marketplaceProducts.map((p) => p.category || 'General'))];

  const filteredProducts = productsToDisplay.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.wholesaler?.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || (p.category || 'General') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-12 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => navigate('/store')}
          >
            <div className="bg-amber-500 p-1.5 rounded-md shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:bg-amber-400 transition-colors">
              <Store className="h-5 w-5 text-[#1c1c1c]" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Nex<span className="text-amber-500">Cart</span>
            </h1>
          </div>

          <div className="relative w-full max-w-lg mx-8 hidden md:block group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-2 border border-zinc-700 rounded-md bg-[#1c1c1c] text-sm text-white placeholder-zinc-500 focus:outline-none focus:bg-[#262626] focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-inner"
              placeholder="Search products, brands, or shops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigate('/store/orders')}
              className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/50 rounded-md transition-all flex items-center"
              title="My Orders"
            >
              <Package className="h-5 w-5" />
            </button>

            <button
              onClick={() => navigate('/store/cart')}
              className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/50 rounded-md relative transition-all"
              title="Shopping Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[#0a0a0a] text-[10px] font-bold shadow-sm ring-2 ring-[#0a0a0a]">
                  {totalItems}
                </span>
              )}
            </button>

            <div className="h-5 w-px bg-zinc-800 mx-2 hidden sm:block"></div>

            <button
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-all flex items-center"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden px-4 py-3 bg-[#1c1c1c] border-b border-zinc-800 shadow-sm">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-zinc-700 rounded-md bg-[#0a0a0a] text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 p-4 sticky top-24">
            <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-3 flex items-center px-2">
              <Filter className="h-3.5 w-3.5 mr-2" />
              Categories
            </h3>
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-500 shadow-sm'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border-l-2 border-transparent'
                    }`}
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-3 tracking-wide">
              {searchTerm.trim()
                ? 'Search Results'
                : selectedCategory === 'All'
                  ? 'Trending Today'
                  : selectedCategory}
              <span className="text-xs font-medium text-amber-900 bg-amber-400 px-2 py-0.5 rounded-md shadow-sm">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
              </span>
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 p-4 animate-pulse"
                >
                  <div className="bg-zinc-800 h-40 rounded-md mb-4"></div>
                  <div className="h-4 bg-zinc-800 rounded w-2/3 mb-3"></div>
                  <div className="h-3 bg-zinc-800 rounded w-1/4 mb-4"></div>
                  <div className="h-2 bg-zinc-800 rounded w-full mb-2"></div>
                  <div className="h-2 bg-zinc-800 rounded w-4/5 mb-6"></div>
                  <div className="h-9 bg-zinc-800 rounded-md w-full"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-[#1c1c1c] rounded-lg border border-dashed border-zinc-700">
              <div className="bg-[#0a0a0a] p-4 rounded-full mb-4 border border-zinc-800">
                <Search className="h-6 w-6 text-zinc-600" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">No products found</h3>
              <p className="text-sm text-zinc-400">
                Try adjusting your search or category filters.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="mt-4 text-sm text-amber-500 font-medium hover:text-amber-400 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 overflow-hidden hover:shadow-2xl hover:border-amber-500/50 transition-all duration-300 group cursor-pointer flex flex-col"
                >
                  <div className="h-48 bg-[#F5F5F0] flex items-center justify-center overflow-hidden relative p-3">
                    <span className="absolute top-3 right-3 bg-[#1c1c1c] border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400 rounded-sm shadow-md z-10">
                      {product.category || 'General'}
                    </span>

                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="bg-[#EBEBE6] w-full h-full rounded-md flex items-center justify-center border border-zinc-300 border-dashed">
                        <Store className="h-8 w-8 text-zinc-400" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <h3 className="text-base font-semibold text-white leading-snug group-hover:text-amber-400 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                      <span className="text-lg font-bold text-amber-500 shrink-0">
                        ₹{parseFloat(product.price).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-3">
                      <Store className="h-3 w-3 text-zinc-500" />
                      <p className="text-xs text-zinc-400 truncate">
                        Sold by{' '}
                        <span className="font-medium text-zinc-200">
                          {product.wholesaler?.businessName || 'Unknown Shop'}
                        </span>
                      </p>
                    </div>

                    <p className="text-sm text-zinc-500 line-clamp-2 mb-5 flex-grow leading-relaxed">
                      {product.description || 'No description provided for this item.'}
                    </p>

                    <button className="w-full bg-[#0a0a0a] border border-zinc-700 text-zinc-300 py-2 rounded-md font-medium text-sm group-hover:bg-amber-500 group-hover:text-[#0a0a0a] group-hover:border-amber-500 transition-all duration-300 flex items-center justify-center gap-2">
                      View Details
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
