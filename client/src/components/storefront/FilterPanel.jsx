import { RotateCcw, SlidersHorizontal, Star, X } from 'lucide-react';

export default function FilterPanel({
  showFilters,
  setShowFilters,
  sortOrder,
  setSortOrder,
  priceRange,
  setPriceRange,
  minRating,
  setMinRating,
  resetFilters,
  displayedProductsCount,
}) {
  return (
    <>
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
              aria-label="Clear rating filter"
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
              aria-label="Clear price filter"
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
              Showing {displayedProductsCount} product
              {displayedProductsCount !== 1 ? 's' : ''}
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
    </>
  );
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}
