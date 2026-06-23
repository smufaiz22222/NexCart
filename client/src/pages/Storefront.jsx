import { useEffect, useRef, useState, useMemo } from 'react';
import {
  ArrowRight,
  Search,
  Star,
  Store,
  Sparkles,
  Heart,
  ChevronRight,
  Smartphone,
  Shirt,
  Home,
  Dumbbell,
  BookOpen,
  Baby,
  ShoppingBasket,
  Car,
  PawPrint,
  Briefcase,
  TrendingUp,
  Zap,
  Tag,
  Clock,
  SlidersHorizontal,
  RotateCcw,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/axios';
import {
  useMarketplaceProducts,
  useMarketplaceProductsInfinite,
  useTrendingProducts,
  useDailyDeals,
  useUserRecommendations,
  useWishlist,
  useToggleWishlist,
} from '../api/queries';
import useAuthStore from '../store/authStore';
import { trackRecommendationClick } from '../utils/recommendation';
import { toast } from 'sonner';
import categoryData, { getDbCategory } from '../data/categoryData';

const iconMap = {
  Smartphone,
  Shirt,
  Home,
  Sparkles,
  Dumbbell,
  BookOpen,
  Baby,
  ShoppingBasket,
  Car,
  PawPrint,
  Briefcase,
};

export default function Storefront() {
  // Restore persisted state from sessionStorage on mount
  const getPersistedState = (key, fallback) => {
    try {
      const stored = sessionStorage.getItem(`storefront_${key}`);
      return stored !== null ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  };

  const [searchTerm, setSearchTerm] = useState(() => getPersistedState('search', ''));
  const [debouncedSearch, setDebouncedSearch] = useState(() => getPersistedState('search', ''));
  const [selectedCategory, setSelectedCategory] = useState(() =>
    getPersistedState('category', 'All')
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(() =>
    getPersistedState('subcategory', null)
  );

  // Filter states
  const [priceRange, setPriceRange] = useState(() => getPersistedState('priceRange', [0, 100000]));
  const [minRating, setMinRating] = useState(() => getPersistedState('minRating', 0));
  const [sortOrder, setSortOrder] = useState(() => getPersistedState('sortOrder', 'relevance'));
  const [showFilters, setShowFilters] = useState(false);

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('storefront_search', JSON.stringify(searchTerm));
    sessionStorage.setItem('storefront_category', JSON.stringify(selectedCategory));
    sessionStorage.setItem('storefront_subcategory', JSON.stringify(selectedSubcategory));
    sessionStorage.setItem('storefront_priceRange', JSON.stringify(priceRange));
    sessionStorage.setItem('storefront_minRating', JSON.stringify(minRating));
    sessionStorage.setItem('storefront_sortOrder', JSON.stringify(sortOrder));
  }, [searchTerm, selectedCategory, selectedSubcategory, priceRange, minRating, sortOrder]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('storefront_scrollY');
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll, 10));
        sessionStorage.removeItem('storefront_scrollY');
      }, 100);
    }
  }, []);

  // Read URL search params (from mega-menu navigation)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    const urlSubcategory = searchParams.get('subcategory');

    if (urlCategory) {
      setSelectedCategory(urlCategory);
      setSelectedSubcategory(null);
      // Clear the URL params after reading them
      setSearchParams({}, { replace: true });
    } else if (urlSubcategory) {
      // Find parent category for this subcategory
      const parent = categoryData.find((c) => c.subcategories.includes(urlSubcategory));
      if (parent) {
        setSelectedCategory(parent.name);
        setSelectedSubcategory(urlSubcategory);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const isBrowsingActive =
    debouncedSearch.trim() !== '' || selectedCategory !== 'All' || !!selectedSubcategory;

  const hasActiveFilters =
    priceRange[0] > 0 || priceRange[1] < 100000 || minRating > 0 || sortOrder !== 'relevance';

  const isSearchOrFilterActive = isBrowsingActive || hasActiveFilters;

  const {
    data: infiniteData,
    isLoading: isLoadingMarketplace,
    isError: isErrorMarketplace,
    error: errorMarketplace,
    isFetching: isFetchingMarketplace,
    refetch: refetchMarketplace,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMarketplaceProductsInfinite({
    search: debouncedSearch,
    category: selectedCategory !== 'All' ? getDbCategory(selectedCategory) : '',
    subcategory: selectedSubcategory || '',
    sortBy: debouncedSearch.trim() !== '' || selectedCategory !== 'All' ? '' : 'topSelling',
  });

  const {
    data: trendingData,
    isLoading: isLoadingTrending,
    isError: isErrorTrending,
    isFetching: isFetchingTrending,
  } = useTrendingProducts();

  const { data: dailyDealsData } = useDailyDeals();

  const { data: userRecsData, isLoading: isLoadingUserRecs } = useUserRecommendations();

  const { data: topSellingData } = useMarketplaceProducts({
    page: 1,
    pageSize: 8,
    sortBy: 'topSelling',
  });

  const { data: newArrivalsData } = useMarketplaceProducts({
    page: 1,
    pageSize: 8,
    sortBy: 'newArrivals',
  });

  const marketplaceProducts = useMemo(() => {
    return infiniteData?.pages?.flatMap((page) => page.products) || [];
  }, [infiniteData]);

  const trendingProducts = useMemo(() => {
    const recommendations = trendingData?.recommendations || [];
    const recommendedProducts = recommendations.map((item) => item.product).slice(0, 24);
    const recommendedIds = new Set(recommendedProducts.map((p) => p.id));
    const otherProducts = marketplaceProducts.filter((p) => !recommendedIds.has(p.id));
    return [...recommendedProducts, ...otherProducts].slice(0, marketplaceProducts.length || 24);
  }, [trendingData, marketplaceProducts]);

  const recommendedProductIds = useMemo(() => {
    const recommendations = trendingData?.recommendations || [];
    const products = recommendations.map((item) => item.product).slice(0, 24);
    return new Set(products.map((product) => product.id));
  }, [trendingData]);

  const recommendationId = trendingData?.recommendationId || null;

  const dealProducts = useMemo(() => {
    return dailyDealsData?.deals || [];
  }, [dailyDealsData]);

  const topSelling = useMemo(() => {
    return topSellingData?.products?.slice(0, 8) || [];
  }, [topSellingData]);

  const newArrivals = useMemo(() => {
    return newArrivalsData?.products?.slice(0, 8) || [];
  }, [newArrivalsData]);

  const userRecommendedItems = useMemo(() => {
    return userRecsData?.recommendations || [];
  }, [userRecsData]);

  const displayedProducts = useMemo(() => {
    let products;
    if (isBrowsingActive) {
      products = [...marketplaceProducts];
    } else {
      products = trendingProducts.length ? [...trendingProducts] : [...marketplaceProducts];
    }

    // Apply price filter
    if (priceRange[0] > 0 || priceRange[1] < 100000) {
      products = products.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    }

    // Apply rating filter
    if (minRating > 0) {
      products = products.filter((p) => (p.ratingAverage || 0) >= minRating);
    }

    // Apply sort
    if (sortOrder === 'priceLowHigh') {
      products.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'priceHighLow') {
      products.sort((a, b) => b.price - a.price);
    } else if (sortOrder === 'rating') {
      products.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
    } else if (sortOrder === 'newest') {
      products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return products;
  }, [isBrowsingActive, marketplaceProducts, trendingProducts, priceRange, minRating, sortOrder]);

  const isLoading = isLoadingMarketplace || isLoadingTrending;
  const isError = isErrorMarketplace || isErrorTrending;
  const isFetching = isFetchingMarketplace || isFetchingTrending;

  const navigate = useNavigate();
  const loggedImpressionRecommendationIds = useRef(new Set());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data: wishlist = [] } = useWishlist({ enabled: isAuthenticated });
  const toggleWishlistMutation = useToggleWishlist();

  const handleWishlistToggle = (e, productId, name) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please log in to wishlist products');
      return;
    }
    toggleWishlistMutation.mutate(productId, {
      onSuccess: (data) => {
        if (data.wishlisted) {
          toast.success(`${name} added to wishlist`);
        } else {
          toast.success(`${name} removed from wishlist`);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to update wishlist');
      },
    });
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (!isAuthenticated) return;
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
  }, [recommendationId, trendingProducts, isAuthenticated]);

  const handleProductClick = (product, source = 'storefront') => {
    // Save scroll position before navigating away
    sessionStorage.setItem('storefront_scrollY', String(window.scrollY));

    const isRecommended = recommendedProductIds.has(product.id);
    trackRecommendationClick({
      apiClient,
      navigate,
      product,
      recommendationId: isRecommended ? recommendationId : null,
      source,
      isAuthenticated,
    });
  };

  const handleCategoryClick = (categoryName) => {
    setSelectedCategory(categoryName);
    setSelectedSubcategory(null);
    document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubcategoryClick = (subcategoryName) => {
    setSelectedSubcategory(subcategoryName);
    document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const resetFilters = () => {
    setPriceRange([0, 100000]);
    setMinRating(0);
    setSortOrder('relevance');
  };

  const resetCategory = () => {
    setSelectedCategory('All');
    setSelectedSubcategory(null);
    setSearchTerm('');
    setDebouncedSearch('');
  };

  const clearFilters = () => {
    resetFilters();
    resetCategory();
  };

  // Get current category object for subcategory display
  const activeCategoryData = useMemo(() => {
    if (selectedCategory === 'All') return null;
    return categoryData.find((c) => c.name === selectedCategory) || null;
  }, [selectedCategory]);

  return (
    <div className="bg-[#f8fafc] pb-16 text-[#1e293b]">
      {/* Hero Banner with Search */}
      <section className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#a5b4fc]">
                NexCart Marketplace
              </p>
              <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Everything you need, delivered to your door.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-[#c7d2fe]">
                Shop across thousands of products from verified wholesalers. Best prices, quality
                guaranteed.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() =>
                    document
                      .getElementById('products-section')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="rounded-full bg-[#f97316] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ea580c]"
                >
                  Shop Now
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById('categories-section')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Browse Categories
                </button>
              </div>
            </div>

            {/* Hero Visual — Trust & Value Props */}
            <div className="hidden lg:flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 flex flex-col gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316]">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Flash Deals</h3>
                  <p className="text-xs text-[#c7d2fe] leading-relaxed">
                    Up to 40% off daily picks from top sellers
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 flex flex-col gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a5b4fc]">
                    <Star className="h-5 w-5 text-[#1e1b4b]" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Verified Sellers</h3>
                  <p className="text-xs text-[#c7d2fe] leading-relaxed">
                    Every wholesaler is vetted for quality
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 flex flex-col gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4f46e5]">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white">10,000+ Products</h3>
                  <p className="text-xs text-[#c7d2fe] leading-relaxed">
                    Explore a massive catalog across categories
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 flex flex-col gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white">AI Recommendations</h3>
                  <p className="text-xs text-[#c7d2fe] leading-relaxed">
                    Personalized picks powered by smart AI
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar Section */}
      <section className="border-b border-[#e2e8f0] bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-5 py-3">
              <Search className="h-4 w-4 shrink-0 text-[#94a3b8]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search for products, brands, and more..."
                aria-label="Search for products, brands, and more"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#94a3b8]"
              />
            </div>
            {isSearchOrFilterActive && (
              <button
                onClick={clearFilters}
                className="rounded-full border border-[#e2e8f0] bg-white px-4 py-3 text-xs font-bold text-[#64748b] transition hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5]"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Active filter breadcrumb */}
          {(selectedCategory !== 'All' || selectedSubcategory || debouncedSearch) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#64748b]">
              <span className="font-semibold text-[#1e293b]">Browsing:</span>
              {selectedCategory !== 'All' && (
                <span className="flex items-center gap-1 rounded-full bg-[#4f46e5] px-3 py-1 text-xs font-bold text-white">
                  {selectedCategory}
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedSubcategory(null);
                    }}
                    className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
                    aria-label="Remove category filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedSubcategory && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="flex items-center gap-1 rounded-full bg-[#f97316] px-3 py-1 text-xs font-bold text-white">
                    {selectedSubcategory}
                    <button
                      onClick={() => setSelectedSubcategory(null)}
                      className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
                      aria-label="Remove subcategory filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                </>
              )}
              {debouncedSearch && (
                <span className="flex items-center gap-1 text-xs">
                  &mdash; &quot;{debouncedSearch}&quot;
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDebouncedSearch('');
                    }}
                    className="rounded-full bg-[#4f46e5]/10 p-0.5 hover:bg-[#4f46e5]/20"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {(selectedCategory !== 'All' || selectedSubcategory || debouncedSearch) && (
                <button
                  onClick={resetCategory}
                  className="ml-2 text-xs font-bold text-[#4f46e5] hover:underline"
                >
                  Clear browsing
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Category Navigation Grid */}
      <section
        id="categories-section"
        className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight">Shop by Category</h2>
          <button
            onClick={clearFilters}
            className="text-sm font-semibold text-[#4f46e5] transition hover:underline"
          >
            View All
          </button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
          {categoryData.map((category) => {
            const Icon = iconMap[category.icon] || Store;
            const isActive = selectedCategory === category.name;
            return (
              <button
                key={category.slug}
                onClick={() => handleCategoryClick(category.name)}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
                  isActive
                    ? 'border-[#4f46e5] bg-[#eef2ff] shadow-md'
                    : 'border-[#e2e8f0] bg-white hover:border-[#4f46e5]/40 hover:shadow-sm'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isActive ? 'bg-[#4f46e5] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-center text-xs font-bold leading-tight ${
                    isActive ? 'text-[#4f46e5]' : 'text-[#475569]'
                  }`}
                >
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Subcategories for selected category */}
        {activeCategoryData && (
          <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#1e293b]">{activeCategoryData.name}</h3>
              <ChevronRight className="h-3.5 w-3.5 text-[#94a3b8]" />
              <span className="text-xs text-[#94a3b8]">Subcategories</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeCategoryData.subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => handleSubcategoryClick(sub)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    selectedSubcategory === sub
                      ? 'bg-[#4f46e5] text-white'
                      : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#4f46e5] hover:text-white'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Deals of the Day */}
      {!isBrowsingActive && dealProducts.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316]/10">
                <Zap className="h-4 w-4 text-[#f97316]" />
              </div>
              <h2 className="text-xl font-black tracking-tight">Deals of the Day</h2>
              <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#94a3b8]">
                <Clock className="h-3.5 w-3.5" />
                Limited time offers
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {dealProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product, 'deal_section')}
                  className="group rounded-xl border border-[#e2e8f0]/60 bg-[#f8fafc] p-3 text-left transition hover:border-[#4f46e5]/40 hover:shadow-md"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f1f5f9] p-2">
                    <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#f97316] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      -{product.discountPercent}%
                    </span>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain transition group-hover:scale-105"
                      />
                    ) : (
                      <Store className="mx-auto mt-4 h-8 w-8 text-[#94a3b8]" />
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs font-bold text-[#1e293b]">{product.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-black text-[#1e293b]">
                      {formatCurrency(product.price)}
                    </span>
                    {product.originalPrice > product.price && (
                      <span className="text-[10px] text-[#94a3b8] line-through">
                        {formatCurrency(product.originalPrice)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trending Products Section */}
      {!isBrowsingActive && topSelling.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f46e5]">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-black tracking-tight">Trending Now</h2>
            </div>
            <button
              onClick={() => navigate('/store/trending')}
              className="flex items-center gap-1 text-sm font-semibold text-[#4f46e5] transition hover:underline"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {topSelling.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product, 'trending_section')}
                isWishlisted={wishlist.some((item) => item.id === product.id)}
                onWishlistToggle={(e) => handleWishlistToggle(e, product.id, product.name)}
              />
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals Section */}
      {!isBrowsingActive && newArrivals.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316]">
                <Tag className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-black tracking-tight">New Arrivals</h2>
            </div>
            <button
              onClick={() => navigate('/store/new-arrivals')}
              className="flex items-center gap-1 text-sm font-semibold text-[#4f46e5] transition hover:underline"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {newArrivals.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product, 'new_arrivals_section')}
                isWishlisted={wishlist.some((item) => item.id === product.id)}
                onWishlistToggle={(e) => handleWishlistToggle(e, product.id, product.name)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recommended For You Section */}
      {!isBrowsingActive && isAuthenticated && userRecommendedItems.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f46e5]/10">
              <Sparkles className="h-4 w-4 text-[#4f46e5]" />
            </div>
            <h2 className="text-xl font-black tracking-tight">Recommended For You</h2>
          </div>

          {isLoadingUserRecs ? (
            <div className="mt-5 flex h-40 items-center justify-center text-[#64748b]">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-md bg-[#f1f5f9] h-10 w-10"></div>
                <div className="flex-1 space-y-6 py-1">
                  <div className="h-2 bg-[#f1f5f9] rounded"></div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-2 bg-[#f1f5f9] rounded col-span-2"></div>
                      <div className="h-2 bg-[#f1f5f9] rounded col-span-1"></div>
                    </div>
                    <div className="h-2 bg-[#f1f5f9] rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
              {userRecommendedItems.map((item) => {
                const product = item.product;
                const reason = item.reasons?.[0] || 'Based on products you explored';

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product, 'recommended_for_you')}
                    className="min-w-[220px] max-w-[220px] flex-shrink-0 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm hover:border-[#4f46e5] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-40 w-full rounded-md bg-[#f8fafc] flex items-center justify-center overflow-hidden border border-[#e2e8f0]/40">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <Store className="h-10 w-10 text-[#94a3b8]" />
                        )}
                      </div>
                      <div className="mt-3">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748b]">
                          {product.category}
                        </span>
                        <h4 className="font-bold text-sm text-[#1e293b] line-clamp-1 mt-0.5">
                          {product.name}
                        </h4>
                        <p className="mt-2 text-base font-black font-mono text-[#4f46e5]">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-[#e2e8f0] pt-2">
                      <p className="text-[10px] text-[#64748b] font-semibold flex items-center gap-1 line-clamp-1">
                        <Sparkles className="h-3.5 w-3.5 text-[#4f46e5] flex-shrink-0" /> {reason}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Main Products Grid */}
      <section
        id="products-section"
        className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              {isSearchOrFilterActive
                ? debouncedSearch
                  ? `Results for "${debouncedSearch}"`
                  : selectedSubcategory || selectedCategory
                : 'All Products'}
            </h2>
            <p className="mt-1 text-sm text-[#64748b]">
              {isSearchOrFilterActive
                ? `${infiniteData?.pages?.[0]?.totalCount || 0} products found`
                : `Showing ${displayedProducts.length} of ${infiniteData?.pages?.[0]?.totalCount || displayedProducts.length} products`}
            </p>
          </div>
          {isFetching && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#4f46e5]/10 px-3 py-1 text-xs font-medium text-[#4f46e5] border border-[#4f46e5]/20 animate-pulse">
              Loading...
            </span>
          )}
        </div>

        {/* Filter Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition ${
              showFilters
                ? 'bg-[#4f46e5] text-white'
                : 'border border-[#e2e8f0] bg-white text-[#475569] hover:border-[#4f46e5]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>

          {/* Sort dropdown */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="rounded-full border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] outline-none transition hover:border-[#4f46e5] cursor-pointer"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="priceLowHigh">Price: Low to High</option>
            <option value="priceHighLow">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest First</option>
          </select>

          {/* Active filter count badge + reset */}
          {(priceRange[0] > 0 ||
            priceRange[1] < 100000 ||
            minRating > 0 ||
            sortOrder !== 'relevance') && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          )}

          {/* Show active filter pills */}
          {minRating > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#4f46e5] px-3 py-1.5 text-xs font-bold text-white">
              <Star className="h-3 w-3 fill-current" /> {minRating}+ Stars
              <button
                onClick={() => setMinRating(0)}
                className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {(priceRange[0] > 0 || priceRange[1] < 100000) && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#f97316] px-3 py-1.5 text-xs font-bold text-white">
              {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
              <button
                onClick={() => setPriceRange([0, 100000])}
                className="ml-0.5 rounded-full hover:bg-white/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="mt-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Price Range */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                  Price Range
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: 'Under ₹500', range: [0, 500] },
                    { label: '₹500 - ₹1,000', range: [500, 1000] },
                    { label: '₹1,000 - ₹5,000', range: [1000, 5000] },
                    { label: '₹5,000 - ₹20,000', range: [5000, 20000] },
                    { label: '₹20,000+', range: [20000, 100000] },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setPriceRange(option.range)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        priceRange[0] === option.range[0] && priceRange[1] === option.range[1]
                          ? 'bg-[#4f46e5] text-white'
                          : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#4f46e5] hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                  Minimum Rating
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        minRating === rating
                          ? 'bg-[#4f46e5] text-white'
                          : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#4f46e5] hover:text-white'
                      }`}
                    >
                      {rating}
                      <Star className="h-3 w-3 fill-current" /> & Up
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                  Quick Filters
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setPriceRange([0, 100000]);
                      setMinRating(4);
                      setSortOrder('rating');
                    }}
                    className="rounded-full bg-[#f1f5f9] px-3 py-1.5 text-xs font-semibold text-[#475569] transition hover:bg-[#4f46e5] hover:text-white"
                  >
                    Top Rated Only
                  </button>
                  <button
                    onClick={() => {
                      setPriceRange([0, 1000]);
                      setMinRating(0);
                      setSortOrder('priceLowHigh');
                    }}
                    className="rounded-full bg-[#f1f5f9] px-3 py-1.5 text-xs font-semibold text-[#475569] transition hover:bg-[#4f46e5] hover:text-white"
                  >
                    Budget Friendly
                  </button>
                  <button
                    onClick={() => {
                      setPriceRange([0, 100000]);
                      setMinRating(0);
                      setSortOrder('newest');
                    }}
                    className="rounded-full bg-[#f1f5f9] px-3 py-1.5 text-xs font-semibold text-[#475569] transition hover:bg-[#4f46e5] hover:text-white"
                  >
                    Just Arrived
                  </button>
                </div>
              </div>
            </div>

            {/* Reset in panel */}
            <div className="mt-5 flex items-center justify-between border-t border-[#e2e8f0] pt-4">
              <p className="text-xs text-[#94a3b8]">
                Showing {displayedProducts.length} product
                {displayedProducts.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-sm font-bold text-[#4f46e5] transition hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {isError ? (
          <div className="mt-8 rounded-2xl border border-dashed border-red-300 bg-white px-6 py-14 text-center">
            <p className="text-xl font-black tracking-tight text-red-500">
              Failed to load products
            </p>
            <p className="mt-3 text-sm leading-7 text-[#64748b]">
              {errorMarketplace?.message || 'Error occurred while loading marketplace items.'}
            </p>
            <button
              onClick={() => refetchMarketplace()}
              className="mt-6 rounded-full bg-[#4f46e5] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#4338ca]"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <ProductGridSkeleton />
        ) : displayedProducts.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try a different category or clear your filters to see more products."
            onClear={clearFilters}
          />
        ) : (
          <>
            <div
              className="mt-6 grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
              aria-live="polite"
            >
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => handleProductClick(product, 'main_grid')}
                  isWishlisted={wishlist.some((item) => item.id === product.id)}
                  onWishlistToggle={(e) => handleWishlistToggle(e, product.id, product.name)}
                />
              ))}
            </div>
            {hasNextPage && (
              <div className="mt-10 flex flex-col items-center gap-3">
                <div className="w-full max-w-xs bg-[#f1f5f9] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[#4f46e5] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (displayedProducts.length / (infiniteData?.pages?.[0]?.totalCount || displayedProducts.length)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#64748b]">
                  Showing {displayedProducts.length} of{' '}
                  {infiniteData?.pages?.[0]?.totalCount || '...'} products
                </p>
                <button
                  type="button"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  className="rounded-xl border border-[#e2e8f0] bg-white px-8 py-3.5 text-sm font-bold text-[#1e293b] shadow-sm transition hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5] active:scale-95 disabled:opacity-50 btn-press"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}
            {!hasNextPage && displayedProducts.length > 12 && (
              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="text-xs font-semibold text-[#64748b]">
                  You&apos;ve seen all {displayedProducts.length} products
                </p>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="rounded-xl border border-[#e2e8f0] bg-white px-6 py-2.5 text-xs font-bold text-[#64748b] hover:text-[#4f46e5] hover:border-[#4f46e5] transition-all btn-press"
                >
                  Back to Top
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Newsletter / CTA Banner */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-6 py-10 text-white sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-lg">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#e0e7ff]">
                <Sparkles className="h-3.5 w-3.5" />
                Newsletter
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight">
                Get exclusive deals straight to your inbox
              </h2>
              <p className="mt-2 text-sm text-[#c7d2fe]">
                Subscribe for weekly offers, new arrivals, and category-specific recommendations.
              </p>
            </div>
            <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full rounded-full bg-white px-5 py-3.5 text-sm text-[#1e293b] outline-none"
              />
              <button className="shrink-0 rounded-full bg-[#f97316] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#ea580c]">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product, onClick, isWishlisted, onWishlistToggle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View details for ${product.name}`}
      className="group rounded-2xl bg-white p-3.5 text-left shadow-sm border border-[#e2e8f0]/60 transition hover:-translate-y-1 hover:shadow-md hover:border-[#4f46e5]/30 relative"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f1f5f9] p-3">
        {product.discountPercent > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded bg-[#f97316] px-2 py-0.5 text-[10px] font-bold text-white z-10">
            -{product.discountPercent}%
          </span>
        )}
        {onWishlistToggle && (
          <button
            type="button"
            onClick={onWishlistToggle}
            aria-label={
              isWishlisted
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            className={`absolute right-2.5 top-2.5 z-10 p-2 rounded-full bg-white/80 hover:bg-white border border-[#e2e8f0]/40 hover:scale-110 shadow-sm transition-all duration-200 ${
              isWishlisted ? 'text-red-500' : 'text-[#94a3b8] hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        )}
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Store className="h-10 w-10 text-[#94a3b8]" />
        )}
      </div>
      <div className="px-1 pb-1 pt-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4f46e5]">
          {product.category || 'General'}
        </p>
        <h3 className="mt-1 text-sm font-bold leading-5 text-[#1e293b] line-clamp-2">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 text-[#f59e0b]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-3 w-3 ${index < Math.round(product.ratingAverage || 0) ? 'fill-current' : 'text-[#e2e8f0]'}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-[#94a3b8]">({product.reviewCount || 0})</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-lg font-black tracking-tight text-[#1e293b]">
            {formatCurrency(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-xs text-[#94a3b8] line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-[#94a3b8] truncate">
          by {product.wholesaler?.businessName || 'Unknown seller'}
        </p>
      </div>
    </button>
  );
}

function EmptyState({ title, description, onClear }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-[#e2e8f0] bg-white px-6 py-14 text-center">
      <p className="text-xl font-black tracking-tight text-[#1e293b]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[#64748b]">{description}</p>
      {onClear && (
        <button
          onClick={onClear}
          className="mt-5 rounded-full bg-[#4f46e5] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#4338ca]"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-[#e2e8f0]/60 bg-white p-3.5"
        >
          <div className="aspect-square rounded-xl bg-[#f1f5f9]" />
          <div className="mt-3.5 h-3 w-16 rounded bg-[#f1f5f9]" />
          <div className="mt-2 h-4 rounded bg-[#f1f5f9]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[#f1f5f9]" />
          <div className="mt-3 h-5 w-1/2 rounded bg-[#f1f5f9]" />
        </div>
      ))}
    </div>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
