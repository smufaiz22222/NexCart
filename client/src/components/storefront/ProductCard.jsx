import { Heart, Star, Store } from 'lucide-react';

export default function ProductCard({ product, onClick, isWishlisted, onWishlistToggle }) {
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

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}
