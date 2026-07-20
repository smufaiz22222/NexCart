import HeroBanner from '../components/storefront/HeroBanner';
import SearchBar from '../components/storefront/SearchBar';
import CategorySelector from '../components/storefront/CategorySelector';
import NewsletterBanner from '../components/storefront/NewsletterBanner';
import StorefrontProductsGrid from '../components/storefront/StorefrontProductsGrid';
import StorefrontBrowseSections from '../components/storefront/StorefrontBrowseSections';
import { useStorefrontState } from '../components/storefront/useStorefrontState';

export default function Storefront() {
  const state = useStorefrontState();

  return (
    <div className="bg-[#f8fafc] pb-16 text-[#1e293b]">
      {/* Hero Banner with Search */}
      <HeroBanner />

      {/* Search Bar Section */}
      <SearchBar
        searchTerm={state.searchTerm}
        setSearchTerm={state.setSearchTerm}
        debouncedSearch={state.debouncedSearch}
        setDebouncedSearch={state.setDebouncedSearch}
        selectedCategory={state.selectedCategory}
        setSelectedCategory={state.setSelectedCategory}
        selectedSubcategory={state.selectedSubcategory}
        setSelectedSubcategory={state.setSelectedSubcategory}
        isSearchOrFilterActive={state.isSearchOrFilterActive}
        clearFilters={state.clearFilters}
        resetCategory={state.resetCategory}
      />

      {/* Category Navigation Grid */}
      <CategorySelector
        selectedCategory={state.selectedCategory}
        handleCategoryClick={state.handleCategoryClick}
        activeCategoryData={state.activeCategoryData}
        selectedSubcategory={state.selectedSubcategory}
        handleSubcategoryClick={state.handleSubcategoryClick}
        clearFilters={state.clearFilters}
      />

      <StorefrontBrowseSections
        isBrowsingActive={state.isBrowsingActive}
        isAuthenticated={state.isAuthenticated}
        dealProducts={state.dealProducts}
        topSelling={state.topSelling}
        newArrivals={state.newArrivals}
        userRecommendedItems={state.userRecommendedItems}
        isLoadingUserRecs={state.isLoadingUserRecs}
        handleProductClick={state.handleProductClick}
        wishlist={state.wishlist}
        handleWishlistToggle={state.handleWishlistToggle}
        navigate={state.navigate}
      />

      <StorefrontProductsGrid
        statusFlags={{
          isSearchOrFilterActive: state.isSearchOrFilterActive,
          isFetching: state.isFetching,
          showFilters: state.showFilters,
          isError: state.isError,
          isLoading: state.isLoading,
          hasNextPage: state.hasNextPage,
          isFetchingNextPage: state.isFetchingNextPage,
        }}
        debouncedSearch={state.debouncedSearch}
        selectedSubcategory={state.selectedSubcategory}
        selectedCategory={state.selectedCategory}
        infiniteData={state.infiniteData}
        displayedProducts={state.displayedProducts}
        setShowFilters={state.setShowFilters}
        sortOrder={state.sortOrder}
        setSortOrder={state.setSortOrder}
        priceRange={state.priceRange}
        setPriceRange={state.setPriceRange}
        minRating={state.minRating}
        setMinRating={state.setMinRating}
        resetFilters={state.resetFilters}
        errorMarketplace={state.errorMarketplace}
        refetchMarketplace={state.refetchMarketplace}
        clearFilters={state.clearFilters}
        handleProductClick={state.handleProductClick}
        wishlist={state.wishlist}
        handleWishlistToggle={state.handleWishlistToggle}
        fetchNextPage={state.fetchNextPage}
      />

      {/* Newsletter / CTA Banner */}
      <NewsletterBanner />
    </div>
  );
}
