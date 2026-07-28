import ProductImage from '../ProductImage';
import {
  Store,
  Heart,
  Star,
  ShoppingBag,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function ProductErrorState({ errorProduct, refetchProduct }) {
  return (
    <div className="rounded-2xl bg-white border border-[#e2e8f0] px-6 py-14 text-center shadow-sm font-sans">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
        <Store className="h-7 w-7 text-red-400" />
      </div>
      <p className="text-2xl font-black tracking-tight text-red-600">Failed to load product</p>
      <p className="mt-3 text-sm text-[#64748b]">
        {errorProduct?.message || 'Error occurred while loading product details.'}
      </p>
      <button
        type="button"
        onClick={() => refetchProduct()}
        className="mt-6 rounded-xl bg-[#4f46e5] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#4338ca] btn-press"
      >
        Retry Loading
      </button>
    </div>
  );
}

export function ProductLoadingSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#e2e8f0] border-t-[#4f46e5] animate-spin" />
        <p className="text-sm font-semibold text-[#64748b]">Loading product...</p>
      </div>
    </div>
  );
}

export function ProductNotFoundState({ navigate }) {
  return (
    <div className="rounded-2xl bg-white border border-[#e2e8f0] px-6 py-14 text-center shadow-sm">
      <p className="text-2xl font-black tracking-tight text-[#1e293b]">Product not found</p>
      <button
        type="button"
        onClick={() => navigate('/store')}
        className="mt-5 rounded-xl border border-[#e2e8f0] px-5 py-3 text-sm font-bold text-[#1e293b] hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all"
      >
        Return to storefront
      </button>
    </div>
  );
}

export function ProductMediaGallery({
  product,
  isWishlisted,
  handleWishlistToggle,
  formatCurrency,
}) {
  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-[#f8fafc] via-[#eef2ff] to-[#f5f3ff] border border-[#e2e8f0] p-4 shadow-sm overflow-hidden relative sm:p-6">
        <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-5rem)] flex-wrap gap-2">
          {product.originalPrice > product.price && (
            <span className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              -{product.discountPercent}% OFF
            </span>
          )}
          {product.currentStock <= 5 && product.currentStock > 0 && (
            <span className="rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
              Only {product.currentStock} left
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleWishlistToggle}
          className={`absolute top-4 right-4 z-10 p-2.5 rounded-xl border backdrop-blur-sm transition-all duration-200 btn-press shadow-sm ${
            isWishlisted
              ? 'border-red-200 bg-red-50/90 text-red-500 hover:bg-red-100'
              : 'border-white/60 bg-white/80 text-[#64748b] hover:text-[#4f46e5] hover:border-[#4f46e5]'
          }`}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
        <div className="flex aspect-square items-center justify-center p-5 sm:p-8">
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            category={product.category}
            className="h-full w-full object-contain drop-shadow-lg transition-transform duration-500 hover:scale-105"
          />
        </div>
      </div>

      {/* Product Highlights & Delivery Info */}
      <div className="mt-4 rounded-2xl bg-white border border-[#e2e8f0] p-5 space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-9 h-9 rounded-lg bg-[#eef2ff] flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-[#4f46e5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            {(() => {
              const fee = Number(product.deliveryFee ?? product.wholesaler?.deliveryFee ?? 0);
              const threshold = product.wholesaler?.freeDeliveryThreshold
                ? Number(product.wholesaler.freeDeliveryThreshold)
                : null;

              if (fee <= 0) {
                return (
                  <>
                    <p className="font-bold text-[#1e293b] text-xs">Free Delivery</p>
                    <p className="text-[11px] text-[#64748b]">
                      From {product.wholesaler?.businessName || 'this seller'}
                    </p>
                  </>
                );
              }
              if (threshold) {
                return (
                  <>
                    <p className="font-bold text-[#1e293b] text-xs">
                      Free Delivery above {formatCurrency(threshold)}
                    </p>
                    <p className="text-[11px] text-[#64748b]">
                      From {product.wholesaler?.businessName || 'this seller'}
                    </p>
                  </>
                );
              }
              return (
                <>
                  <p className="font-bold text-[#1e293b] text-xs">
                    Delivery: {formatCurrency(fee)}
                  </p>
                  <p className="text-[11px] text-[#64748b]">
                    From {product.wholesaler?.businessName || 'this seller'}
                  </p>
                </>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-9 h-9 rounded-lg bg-[#eef2ff] flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-[#4f46e5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#1e293b] text-xs">Cash on Delivery</p>
            <p className="text-[11px] text-[#64748b]">Pay when you receive</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-9 h-9 rounded-lg bg-[#eef2ff] flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-[#4f46e5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#1e293b] text-xs">Secure Payment</p>
            <p className="text-[11px] text-[#64748b]">100% secure checkout</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="w-9 h-9 rounded-lg bg-[#eef2ff] flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4 text-[#4f46e5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#1e293b] text-xs">Genuine Product</p>
            <p className="text-[11px] text-[#64748b]">Verified seller guarantee</p>
          </div>
        </div>
      </div>

      {/* Stock Status */}
      <div className="mt-4 rounded-2xl bg-white border border-[#e2e8f0] p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-2">
          Availability
        </p>
        {product.currentStock > 0 ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-700">In Stock</span>
            <span className="text-xs text-[#64748b]">({product.currentStock} units available)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm font-bold text-red-600">Out of Stock</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductPurchasePanel({
  product,
  isFetchingProduct,
  isLoadingProduct,
  hasApprovedB2BAccess,
  selectedSize,
  setSelectedSize,
  quantity,
  setQuantity,
  minQty,
  handleAddToCart,
  handleRfqSubmit,
  targetQty,
  setTargetQty,
  targetPrice,
  setTargetPrice,
  notes,
  setNotes,
  createRfq,
  formatCurrency,
  navigate,
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#e2e8f0] shadow-sm p-5 space-y-6 sm:p-7">
      {/* Breadcrumb / Category */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#eef2ff] border border-[#c7d2fe] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4f46e5]">
          {product.category || 'General'}
        </span>
        {isFetchingProduct && !isLoadingProduct && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
            Syncing...
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-black leading-tight tracking-tight text-[#0f172a] sm:text-3xl lg:text-4xl">
        {product.name}
      </h1>

      {/* Rating */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-5 w-5 ${index < Math.round(product.ratingAverage || 0) ? 'fill-amber-400 text-amber-400' : 'text-[#e2e8f0] fill-[#e2e8f0]'}`}
            />
          ))}
        </div>
        <span className="text-sm font-semibold text-[#64748b]">{product.ratingAverage || 0}/5</span>
        <span className="text-sm text-[#94a3b8]">·</span>
        <span className="text-sm text-[#64748b]">
          {product.reviewCount || product.reviews?.length || 0} reviews
        </span>
      </div>

      {/* Price */}
      <div className="flex flex-wrap items-baseline gap-3 pt-2">
        <span className="text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">
          {formatCurrency(product.price)}
        </span>
        {product.originalPrice > product.price && (
          <span className="text-lg font-semibold text-[#94a3b8] line-through">
            {formatCurrency(product.originalPrice)}
          </span>
        )}
      </div>

      {hasApprovedB2BAccess && product.priceTiers?.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-[#f5f3ff] border border-[#ddd6fe] text-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7c3aed] mb-3">
            Wholesale Volume Price Tiers
          </p>
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            {product.priceTiers.map((tier) => (
              <div key={tier.id} className="flex justify-between border-b border-[#ddd6fe]/40 pb-2">
                <span className="font-semibold text-[#64748b]">{tier.minQuantity}+ units</span>
                <span className="font-black text-[#1e293b]">
                  {formatCurrency(tier.unitPrice)} / unit
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-sm leading-7 text-[#64748b] border-t border-[#e2e8f0] pt-6">
        {product.description || 'No description provided for this product.'}
      </p>

      {/* Seller Info */}
      <div className="flex flex-col gap-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Sold by</p>
          <p className="mt-1 text-base font-bold text-[#1e293b]">
            {product.wholesaler?.businessName || 'Unknown shop'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/store/dashboard/rfqs')}
          className="w-full rounded-lg border border-[#c7d2fe] bg-[#eef2ff] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#4f46e5] transition-colors btn-press hover:text-[#4338ca] sm:w-auto sm:py-1.5"
        >
          Request Quote
        </button>
      </div>

      {product.sizes?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#1e293b] mb-3">
            Select size
          </p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`rounded-lg px-5 py-2.5 text-sm font-bold transition-all btn-press ${
                  selectedSize === size
                    ? 'bg-[#0f172a] text-white shadow-md'
                    : 'border border-[#e2e8f0] bg-white text-[#1e293b] hover:border-[#0f172a]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity selector and checkout */}
      <div className="flex flex-col gap-4 pt-4 border-t border-[#e2e8f0] sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-[130px]">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1e293b] mb-2">Quantity</p>
          <div className="flex items-center justify-between border border-[#e2e8f0] rounded-lg px-1 py-1 bg-white">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(minQty, quantity - 1))}
              className="w-9 h-9 rounded-md bg-[#f1f5f9] text-[#64748b] hover:bg-[#eef2ff] hover:text-[#4f46e5] font-bold transition-colors flex items-center justify-center"
            >
              -
            </button>
            <span className="font-bold text-base font-mono text-[#0f172a] min-w-8 text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 rounded-md bg-[#f1f5f9] text-[#64748b] hover:bg-[#eef2ff] hover:text-[#4f46e5] font-bold transition-colors flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#4f46e5] px-6 py-4 text-sm font-bold text-white transition-all hover:bg-[#4338ca] shadow-lg shadow-[#4f46e5]/25 hover:shadow-xl hover:shadow-[#4f46e5]/30 hover:-translate-y-0.5 btn-press sm:flex-1 sm:min-w-[220px]"
        >
          <ShoppingBag className="h-5 w-5" />
          Add to Cart
        </button>
      </div>

      {hasApprovedB2BAccess && product.minOrderQty > 1 && (
        <p className="mt-3 text-xs font-semibold text-amber-600">
          ⚠️ Minimum Wholesale Order Quantity (MOQ) is {product.minOrderQty} units.
        </p>
      )}

      {/* RFQ Quote Proposal Form */}
      {hasApprovedB2BAccess && (
        <div className="rounded-xl bg-[#faf5ff] border border-[#ddd6fe] p-5">
          <h3 className="font-bold text-sm tracking-tight flex items-center gap-2 text-[#1e293b]">
            <MessageSquare className="w-4 h-4 text-[#7c3aed]" /> Request Custom Quote
          </h3>
          <p className="text-[11px] text-[#64748b] mt-1 leading-relaxed">
            Propose your target bid directly to the wholesaler for bulk pricing.
          </p>
          <form onSubmit={handleRfqSubmit} className="mt-3 space-y-2.5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="product-details-rfq-quantity"
                  className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1"
                >
                  Quantity
                </label>
                <input
                  id="product-details-rfq-quantity"
                  required
                  type="number"
                  min={product.minOrderQty || 1}
                  value={targetQty}
                  onChange={(e) => setTargetQty(e.target.value)}
                  placeholder={`Min ${product.minOrderQty}`}
                  className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] font-mono text-[#1e293b] transition-all"
                />
              </div>
              <div>
                <label
                  htmlFor="product-details-rfq-price"
                  className="block text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-1"
                >
                  Price (₹/unit)
                </label>
                <input
                  id="product-details-rfq-price"
                  required
                  type="number"
                  step="0.01"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder={`₹${product.price}`}
                  className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] font-mono text-[#1e293b] transition-all"
                />
              </div>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Notes"
              placeholder="Notes (logistics, contracts, etc.)"
              className="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] text-[#1e293b] transition-all"
            />
            <button
              type="submit"
              disabled={createRfq.isPending}
              className="w-full bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] hover:from-[#6d28d9] hover:to-[#4338ca] disabled:opacity-50 text-white font-bold text-[11px] uppercase tracking-wider py-2.5 rounded-lg transition-all shadow-sm btn-press"
            >
              {createRfq.isPending ? 'Submitting...' : 'Submit Price Offer'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function SimilarProductsSection({
  similarProducts,
  isLoadingSimilar,
  handleRecommendationClick,
  formatCurrency,
}) {
  return (
    <section className="rounded-2xl bg-white border border-[#e2e8f0] p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black tracking-tight text-[#0f172a]">You might also like</h2>
      <div className="mt-5 flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {isLoadingSimilar ? (
          <div className="min-w-full rounded-xl bg-[#f8fafc] border border-[#e2e8f0] px-5 py-8 text-sm font-semibold text-[#64748b] text-center animate-pulse">
            Loading similar products...
          </div>
        ) : similarProducts.length > 0 ? (
          similarProducts.map((item) => (
            <button
              key={item.product.id}
              type="button"
              onClick={() => handleRecommendationClick(item.product)}
              className="min-w-[160px] max-w-[160px] flex-shrink-0 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-3 text-left transition-all hover:border-[#4f46e5] hover:shadow-md hover:shadow-[#4f46e5]/5 card-hover-subtle sm:min-w-[180px] sm:max-w-[180px]"
            >
              <div className="flex h-28 w-full items-center justify-center rounded-lg bg-white border border-[#e2e8f0] p-2 mb-3">
                {item.product.imageUrl ? (
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Store className="h-8 w-8 text-[#94a3b8]" />
                )}
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#4f46e5]">
                {item.product.category || 'General'}
              </p>
              <p className="mt-1 text-xs font-bold tracking-tight text-[#1e293b] line-clamp-2">
                {item.product.name}
              </p>
              <p className="mt-1.5 text-sm font-black font-mono text-[#4f46e5]">
                {formatCurrency(item.product.price)}
              </p>
            </button>
          ))
        ) : (
          <div className="min-w-full rounded-xl border border-dashed border-[#e2e8f0] px-5 py-8 text-sm text-[#64748b] text-center">
            Similar products will appear after recommendation jobs are built.
          </div>
        )}
      </div>
    </section>
  );
}

export function ProductReviewsSection({
  product,
  isAuthenticated,
  rating,
  setRating,
  comment,
  setComment,
  handleReviewSubmit,
  isSubmittingReview,
  reviewPage,
  setReviewPage,
  reviewsPerPage,
}) {
  const reviews = product.reviews || [];

  return (
    <section className="rounded-2xl bg-white border border-[#e2e8f0] p-5 shadow-sm sm:p-7">
      <h2 className="flex flex-wrap items-center gap-2 text-xl font-black tracking-tight text-[#0f172a]">
        <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
        Customer Reviews
        {reviews.length > 0 && (
          <span className="text-xs font-mono font-bold text-[#64748b] bg-[#f1f5f9] border border-[#e2e8f0] px-2 py-0.5 rounded-lg">
            {reviews.length}
          </span>
        )}
      </h2>

      {isAuthenticated ? (
        <form
          onSubmit={handleReviewSubmit}
          className="mt-6 space-y-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-5"
        >
          <div className="flex flex-wrap gap-2.5">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all btn-press ${
                  rating === value
                    ? 'bg-[#4f46e5] text-white shadow-sm'
                    : 'bg-white border border-[#e2e8f0] text-[#1e293b] hover:border-[#4f46e5]'
                }`}
              >
                {value} Star
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            aria-label="Review comment"
            placeholder="Share your product experience"
            rows={3}
            className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] transition-all"
          />
          <button
            type="submit"
            disabled={isSubmittingReview}
            className="rounded-xl bg-[#1e293b] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#4f46e5] transition-all btn-press"
          >
            {isSubmittingReview ? 'Posting review...' : 'Post review'}
          </button>
        </form>
      ) : (
        <div className="mt-6 rounded-xl bg-[#f8fafc] border border-dashed border-[#e2e8f0] p-6 text-center">
          <p className="text-sm font-semibold text-[#64748b]">
            You must be logged in to leave a review.
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
            className="mt-4 rounded-xl bg-[#4f46e5] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#4338ca] btn-press"
          >
            Login / Register
          </button>
        </div>
      )}

      {/* Paginated Reviews */}
      <div className="mt-6">
        {reviews.length > 0 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {reviews
                .slice((reviewPage - 1) * reviewsPerPage, reviewPage * reviewsPerPage)
                .map((review) => (
                  <div key={review.id} className="rounded-xl border border-[#e2e8f0] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-[#1e293b]">
                        {review.user?.name || 'Customer'}
                      </p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-[#64748b]">{review.rating}/5</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#64748b] line-clamp-3">
                      {review.comment || 'No comment left.'}
                    </p>
                  </div>
                ))}
            </div>

            {/* Pagination controls */}
            {reviews.length > reviewsPerPage && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  aria-label="Previous review page"
                  onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                  disabled={reviewPage === 1}
                  className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:border-[#4f46e5] hover:text-[#4f46e5] disabled:opacity-30 disabled:cursor-not-allowed transition-all btn-press"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from(
                  { length: Math.ceil(reviews.length / reviewsPerPage) },
                  (_, i) => i + 1
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setReviewPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all btn-press ${
                      reviewPage === page
                        ? 'bg-[#4f46e5] text-white shadow-sm'
                        : 'border border-[#e2e8f0] text-[#64748b] hover:border-[#4f46e5] hover:text-[#4f46e5]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Next review page"
                  onClick={() =>
                    setReviewPage((p) =>
                      Math.min(Math.ceil(reviews.length / reviewsPerPage), p + 1)
                    )
                  }
                  disabled={reviewPage >= Math.ceil(reviews.length / reviewsPerPage)}
                  className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:border-[#4f46e5] hover:text-[#4f46e5] disabled:opacity-30 disabled:cursor-not-allowed transition-all btn-press"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-[#e2e8f0] px-5 py-8 text-sm text-[#64748b] text-center">
            No reviews yet. Be the first to review this product.
          </div>
        )}
      </div>
    </section>
  );
}
