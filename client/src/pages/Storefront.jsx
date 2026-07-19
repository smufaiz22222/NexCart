import { useEffect, useRef, useState, useMemo } from 'react';
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

// Import subcomponents
import HeroBanner from '../components/storefront/HeroBanner';
import SearchBar from '../components/storefront/SearchBar';
import CategorySelector from '../components/storefront/CategorySelector';
import DealsSection from '../components/storefront/DealsSection';
import TrendingSection from '../components/storefront/TrendingSection';
import NewArrivalsSection from '../components/storefront/NewArrivalsSection';
import RecommendationsSection from '../components/storefront/RecommendationsSection';
import FilterPanel from '../components/storefront/FilterPanel';
import ProductGridSkeleton from '../components/storefront/ProductGridSkeleton';
import EmptyState from '../components/storefront/EmptyState';
import ProductCard from '../components/storefront/ProductCard';
import NewsletterBanner from '../components/storefront/NewsletterBanner';

const getPersistedState = (key, fallback) => {
  try {
    const stored = sessionStorage.getItem(`storefront_${key}`);
    return stored !== null ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

export default function Storefront() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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

  const { data: userRecsData, isLoading: isLoadingUserRecs } = useUserRecommendations({
    enabled: isAuthenticated,
  });

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

  const loggedImpressionRecommendationIds = useRef(new Set());

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
      <HeroBanner />

      {/* Search Bar Section */}
      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        debouncedSearch={debouncedSearch}
        setDebouncedSearch={setDebouncedSearch}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSubcategory={selectedSubcategory}
        setSelectedSubcategory={setSelectedSubcategory}
        isSearchOrFilterActive={isSearchOrFilterActive}
        clearFilters={clearFilters}
        resetCategory={resetCategory}
      />

      {/* Category Navigation Grid */}
      <CategorySelector
        selectedCategory={selectedCategory}
        handleCategoryClick={handleCategoryClick}
        activeCategoryData={activeCategoryData}
        selectedSubcategory={selectedSubcategory}
        handleSubcategoryClick={handleSubcategoryClick}
        clearFilters={clearFilters}
      />

      {/* Deals of the Day */}
      {!isBrowsingActive && (
        <DealsSection dealProducts={dealProducts} handleProductClick={handleProductClick} />
      )}

      {/* Trending Products Section */}
      {!isBrowsingActive && (
        <TrendingSection
          topSelling={topSelling}
          handleProductClick={handleProductClick}
          wishlist={wishlist}
          handleWishlistToggle={handleWishlistToggle}
          navigate={navigate}
        />
      )}

      {/* New Arrivals Section */}
      {!isBrowsingActive && (
        <NewArrivalsSection
          newArrivals={newArrivals}
          handleProductClick={handleProductClick}
          wishlist={wishlist}
          handleWishlistToggle={handleWishlistToggle}
          navigate={navigate}
        />
      )}

      {/* Recommended For You Section */}
      {!isBrowsingActive && isAuthenticated && (
        <RecommendationsSection
          userRecommendedItems={userRecommendedItems}
          isLoadingUserRecs={isLoadingUserRecs}
          handleProductClick={handleProductClick}
        />
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

        {/* Filter Bar & Panel */}
        <FilterPanel
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          priceRange={priceRange}
          setPriceRange={setPriceRange}
          minRating={minRating}
          setMinRating={setMinRating}
          resetFilters={resetFilters}
          displayedProductsCount={displayedProducts.length}
        />

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
      <NewsletterBanner />
    </div>
  );
}
