import ProductGridSkeleton from './ProductGridSkeleton';
import EmptyState from './EmptyState';
import ProductCard from './ProductCard';
import FilterPanel from './FilterPanel';

export default function StorefrontProductsGrid({
  statusFlags = {},
  debouncedSearch,
  selectedSubcategory,
  selectedCategory,
  infiniteData,
  displayedProducts,
  setShowFilters,
  sortOrder,
  setSortOrder,
  priceRange,
  setPriceRange,
  minRating,
  setMinRating,
  resetFilters,
  errorMarketplace,
  refetchMarketplace,
  clearFilters,
  handleProductClick,
  wishlist,
  handleWishlistToggle,
  fetchNextPage,
}) {
  const {
    isSearchOrFilterActive,
    isFetching,
    showFilters,
    isError,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
  } = statusFlags;
  return (
    <section id="products-section" className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
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
          <p className="text-xl font-black tracking-tight text-red-500">Failed to load products</p>
          <p className="mt-3 text-sm leading-7 text-[#64748b]">
            {errorMarketplace?.message || 'Error occurred while loading marketplace items.'}
          </p>
          <button
            type="button"
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
  );
}
