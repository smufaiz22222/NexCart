import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/axios';
import {
  useMarketplaceProducts,
  useMarketplaceProductsInfinite,
  useTrendingProducts,
  useDailyDeals,
  useUserRecommendations,
  useWishlist,
  useToggleWishlist,
} from '../../api/queries';
import useAuthStore from '../../store/authStore';
import { trackRecommendationClick } from '../../utils/recommendation';
import { toast } from 'sonner';
import categoryData, { getDbCategory } from '../../data/categoryData';

const getPersistedState = (key, fallback) => {
  try {
    const stored = sessionStorage.getItem(`storefront_${key}`);
    return stored !== null ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

export function useStorefrontState() {
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

  const [priceRange, setPriceRange] = useState(() => getPersistedState('priceRange', [0, 100000]));
  const [minRating, setMinRating] = useState(() => getPersistedState('minRating', 0));
  const [sortOrder, setSortOrder] = useState(() => getPersistedState('sortOrder', 'relevance'));
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('storefront_search', JSON.stringify(searchTerm));
    sessionStorage.setItem('storefront_category', JSON.stringify(selectedCategory));
    sessionStorage.setItem('storefront_subcategory', JSON.stringify(selectedSubcategory));
    sessionStorage.setItem('storefront_priceRange', JSON.stringify(priceRange));
    sessionStorage.setItem('storefront_minRating', JSON.stringify(minRating));
    sessionStorage.setItem('storefront_sortOrder', JSON.stringify(sortOrder));
  }, [searchTerm, selectedCategory, selectedSubcategory, priceRange, minRating, sortOrder]);

  useEffect(() => {
    let timerId;
    const savedScroll = sessionStorage.getItem('storefront_scrollY');
    if (savedScroll) {
      timerId = setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll, 10));
        sessionStorage.removeItem('storefront_scrollY');
      }, 100);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    const urlSubcategory = searchParams.get('subcategory');

    if (urlCategory) {
      setSelectedCategory(urlCategory);
      setSelectedSubcategory(null);
      setSearchParams({}, { replace: true });
    } else if (urlSubcategory) {
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

    if (priceRange[0] > 0 || priceRange[1] < 100000) {
      products = products.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    }

    if (minRating > 0) {
      products = products.filter((p) => (p.ratingAverage || 0) >= minRating);
    }

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

  const activeCategoryData = useMemo(() => {
    if (selectedCategory === 'All') return null;
    return categoryData.find((c) => c.name === selectedCategory) || null;
  }, [selectedCategory]);

  return {
    navigate,
    isAuthenticated,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    setDebouncedSearch,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    priceRange,
    setPriceRange,
    minRating,
    setMinRating,
    sortOrder,
    setSortOrder,
    showFilters,
    setShowFilters,
    isBrowsingActive,
    isSearchOrFilterActive,
    infiniteData,
    errorMarketplace,
    refetchMarketplace,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    dealProducts,
    topSelling,
    newArrivals,
    userRecommendedItems,
    isLoadingUserRecs,
    displayedProducts,
    isLoading,
    isError,
    isFetching,
    wishlist,
    handleWishlistToggle,
    handleProductClick,
    handleCategoryClick,
    handleSubcategoryClick,
    resetFilters,
    resetCategory,
    clearFilters,
    activeCategoryData,
  };
}
