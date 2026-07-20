import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, Star, Store, Heart } from 'lucide-react';
import ProductImage from '../components/ProductImage';
import { useMarketplaceProductsInfinite, useWishlist, useToggleWishlist } from '../api/queries';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

export default function NewArrivals() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: wishlist = [] } = useWishlist({ enabled: isAuthenticated });
  const toggleWishlistMutation = useToggleWishlist();

  const {
    data: infiniteData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMarketplaceProductsInfinite({
    sortBy: 'newArrivals',
  });

  const products = useMemo(() => {
    return infiniteData?.pages?.flatMap((page) => page.products) || [];
  }, [infiniteData]);

  const totalCount = infiniteData?.pages?.[0]?.totalCount || 0;

  const handleWishlistToggle = (e, productId, name) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please log in to wishlist products');
      return;
    }
    toggleWishlistMutation.mutate(productId, {
      onSuccess: (res) => {
        toast.success(
          res.wishlisted ? `${name} added to wishlist` : `${name} removed from wishlist`
        );
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16">
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/store')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2e8f0] bg-white hover:bg-[#f1f5f9] transition"
            aria-label="Back to store"
          >
            <ArrowLeft className="h-4 w-4 text-[#475569]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316]">
              <Tag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">New Arrivals</h1>
              <p className="text-sm text-[#64748b]">Products added in the last 7 days</p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-[#e2e8f0]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-xl font-bold text-[#1e293b]">No new arrivals</p>
            <p className="mt-2 text-sm text-[#64748b]">
              No products were added in the last 7 days. Check back soon!
            </p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm text-[#64748b]">
              Showing {products.length} of {totalCount} products
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/store/product/${product.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/store/product/${product.id}`);
                    }
                  }}
                  aria-label={`View details for ${product.name}`}
                  className="group rounded-2xl bg-white p-3.5 text-left shadow-sm border border-[#e2e8f0]/60 transition hover:-translate-y-1 hover:shadow-md hover:border-[#4f46e5]/30 relative cursor-pointer"
                >
                  <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f1f5f9] p-3">
                    {product.discountPercent > 0 && (
                      <span className="absolute left-2.5 top-2.5 rounded bg-[#f97316] px-2 py-0.5 text-[10px] font-bold text-white z-10">
                        -{product.discountPercent}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleWishlistToggle(e, product.id, product.name)}
                      aria-label={
                        wishlist.some((item) => item.id === product.id)
                          ? `Remove ${product.name} from wishlist`
                          : `Add ${product.name} to wishlist`
                      }
                      className={`absolute right-2.5 top-2.5 z-10 p-2 rounded-full bg-white/80 hover:bg-white border border-[#e2e8f0]/40 hover:scale-110 shadow-sm transition-all duration-200 ${
                        wishlist.some((item) => item.id === product.id)
                          ? 'text-red-500'
                          : 'text-[#94a3b8] hover:text-red-500'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${wishlist.some((item) => item.id === product.id) ? 'fill-current' : ''}`}
                      />
                    </button>
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      category={product.category}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                    />
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
                      <span className="text-[11px] text-[#94a3b8]">
                        ({product.reviewCount || 0})
                      </span>
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
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasNextPage && (
              <div className="mt-10 flex flex-col items-center gap-3">
                <div className="w-full max-w-xs bg-[#f1f5f9] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[#4f46e5] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (products.length / totalCount) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-[#64748b]">
                  Showing {products.length} of {totalCount} products
                </p>
                <button
                  type="button"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  className="rounded-xl border border-[#e2e8f0] bg-white px-8 py-3.5 text-sm font-bold text-[#1e293b] shadow-sm transition hover:bg-[#4f46e5] hover:text-white hover:border-[#4f46e5] active:scale-95 disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}

            {!hasNextPage && products.length > 12 && (
              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="text-xs font-semibold text-[#64748b]">
                  You&apos;ve seen all {products.length} products
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
