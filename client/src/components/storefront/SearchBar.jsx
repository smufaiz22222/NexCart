import { ChevronRight, Search, X } from 'lucide-react';

export default function SearchBar({
  searchTerm,
  setSearchTerm,
  debouncedSearch,
  setDebouncedSearch,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  isSearchOrFilterActive,
  clearFilters,
  resetCategory,
}) {
  return (
    <section className="border-b border-[#e2e8f0] bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              className="w-full rounded-full border border-[#e2e8f0] bg-white px-4 py-3 text-xs font-bold text-[#64748b] transition hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5] sm:w-auto"
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
  );
}
