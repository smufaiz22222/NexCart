import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Star, Store, MessageSquare } from 'lucide-react';
import apiClient from '../api/axios';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { trackRecommendationClick } from '../utils/recommendation';
import { toast } from 'sonner';
import {
  useProductDetail,
  useSimilarProducts,
  useSubmitReview,
  useCreateRfq,
} from '../api/queries';

const getAttributionStorageKey = (productId) => `nexcart:recommendationAttribution:${productId}`;

const isValidAttributionContext = (context, productId) =>
  context?.recommendationId && context?.productId === productId;

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const addToCart = useCartStore((state) => state.addToCart);
  const loggedImpressionRecommendationIds = useRef(new Set());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const {
    data: product,
    isLoading: isLoadingProduct,
    isError: isErrorProduct,
    error: errorProduct,
    isFetching: isFetchingProduct,
    refetch: refetchProduct,
  } = useProductDetail(id);

  const { data: similarData, isLoading: isLoadingSimilarData } = useSimilarProducts(id);

  const [attributionRecommendationContext, setAttributionRecommendationContext] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  // B2B & B2C parameters
  const isB2BApproved = user?.businessProfile?.verification === 'APPROVED';
  const minQty = isB2BApproved ? product?.minOrderQty || 1 : 1;
  const [quantity, setQuantity] = useState(1);
  const [targetPrice, setTargetPrice] = useState('');
  const [targetQty, setTargetQty] = useState('');
  const [notes, setNotes] = useState('');
  const createRfq = useCreateRfq();

  useEffect(() => {
    if (product) {
      setQuantity(isB2BApproved ? product.minOrderQty || 1 : 1);
    }
  }, [product, isB2BApproved]);

  const similarProducts = useMemo(() => similarData?.recommendations || [], [similarData]);
  const similarRecommendationId = similarData?.recommendationId || null;

  const isLoading = isLoadingProduct;
  const isLoadingSimilar = isLoadingSimilarData;

  useEffect(() => {
    if (!product) return;
    if (product.sizes?.length > 0 && !selectedSize) {
      setSelectedSize(product.sizes[0]);
    } else if (!product.sizes?.length) {
      setSelectedSize(null);
    }
  }, [product, selectedSize]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    apiClient
      .post('/interactions', {
        productId: id,
        action: 'view',
        source: 'product_detail',
      })
      .catch((error) => console.error('Failed to log product view:', error));
  }, [id, isAuthenticated]);

  useEffect(() => {
    const incomingContext = location.state?.recommendationContext;

    if (isValidAttributionContext(incomingContext, id)) {
      sessionStorage.setItem(getAttributionStorageKey(id), JSON.stringify(incomingContext));
      startTransition(() => {
        setAttributionRecommendationContext(incomingContext);
      });
      return;
    }

    const storedContext = sessionStorage.getItem(getAttributionStorageKey(id));
    if (!storedContext) {
      startTransition(() => {
        setAttributionRecommendationContext(null);
      });
      return;
    }

    try {
      const parsedContext = JSON.parse(storedContext);
      startTransition(() => {
        setAttributionRecommendationContext(
          isValidAttributionContext(parsedContext, id) ? parsedContext : null
        );
      });
    } catch (error) {
      console.error('Failed to read attribution context:', error);
      sessionStorage.removeItem(getAttributionStorageKey(id));
      startTransition(() => {
        setAttributionRecommendationContext(null);
      });
    }
  }, [id, location.state]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!similarRecommendationId || similarProducts.length === 0) return;
    if (loggedImpressionRecommendationIds.current.has(similarRecommendationId)) return;

    loggedImpressionRecommendationIds.current.add(similarRecommendationId);
    apiClient
      .post('/interactions/recommendation-events', {
        recommendationId: similarRecommendationId,
        events: similarProducts.map((item) => ({
          productId: item.product.id,
          eventType: 'impression',
        })),
      })
      .catch((error) => console.error('Failed to log similar impressions:', error));
  }, [similarRecommendationId, similarProducts, isAuthenticated]);

  const handleAddToCart = async () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      return toast.warning('Please select a size first!');
    }

    if (isB2BApproved && quantity < product.minOrderQty) {
      return toast.warning(
        `Minimum Order Quantity (MOQ) for B2B accounts is ${product.minOrderQty} units.`
      );
    }

    try {
      await addToCart({
        productId: product.id,
        selectedSize: product.sizes?.length ? selectedSize : null,
        quantity: quantity,
        recommendationId: attributionRecommendationContext?.recommendationId || null,
        recommendationSource: attributionRecommendationContext?.source || null,
      });
      if (isAuthenticated) {
        apiClient
          .post('/interactions', {
            productId: product.id,
            action: 'cart',
            quantity: quantity,
            source: 'product_detail',
            recommendationId: attributionRecommendationContext?.recommendationId,
            metadata: attributionRecommendationContext
              ? { recommendationSource: attributionRecommendationContext.source }
              : {},
          })
          .catch((error) => console.error('Failed to log cart interaction:', error));
      }
      sessionStorage.removeItem(getAttributionStorageKey(product.id));
      toast.success('Added to cart!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add item to cart');
    }
  };

  const handleRfqSubmit = (e) => {
    e.preventDefault();
    if (!targetPrice || !targetQty) {
      return toast.warning('Please specify both target price and target quantity');
    }
    const parsedQty = parseInt(targetQty, 10);
    if (parsedQty < product.minOrderQty) {
      return toast.warning(`Target quantity must meet MOQ of ${product.minOrderQty} units.`);
    }

    createRfq.mutate(
      {
        productId: product.id,
        quantity: parsedQty,
        targetPrice: parseFloat(targetPrice),
        notes,
      },
      {
        onSuccess: () => {
          toast.success('Custom quote proposal submitted to wholesaler!');
          setTargetPrice('');
          setTargetQty('');
          setNotes('');
        },
        onError: (err) => {
          toast.error(err.response?.data?.error || 'Failed to submit quote proposal');
        },
      }
    );
  };

  const handleRecommendationClick = (recommendedProduct) => {
    trackRecommendationClick({
      apiClient,
      navigate,
      product: recommendedProduct,
      recommendationId: similarRecommendationId,
      source: 'similar_products',
      isAuthenticated,
    });
  };

  const submitReviewMutation = useSubmitReview(id);
  const isSubmittingReview = submitReviewMutation.isPending;

  const handleReviewSubmit = (event) => {
    event.preventDefault();
    submitReviewMutation.mutate(
      { rating, comment },
      {
        onSuccess: () => {
          setComment('');
          toast.success('Review posted!');
        },
        onError: (error) => {
          toast.error(error.response?.data?.error || 'Failed to post review');
        },
      }
    );
  };

  if (isErrorProduct) {
    return (
      <div className="rounded-[30px] bg-white px-6 py-14 text-center shadow-[0_18px_45px_rgba(22,20,18,0.05)] font-sans">
        <p className="text-2xl font-black tracking-tight text-red-500">Failed to load product</p>
        <p className="mt-3 text-sm text-[#6b665f]">
          {errorProduct?.message || 'Error occurred while loading product details.'}
        </p>
        <button
          onClick={() => refetchProduct()}
          className="mt-6 rounded-full bg-[#161412] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#2c2926]"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-full bg-white px-6 py-4 text-sm font-bold text-[#161412] shadow-[0_16px_40px_rgba(22,20,18,0.08)]">
          Loading product...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-[30px] bg-white px-6 py-14 text-center shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
        <p className="text-2xl font-black tracking-tight text-[#161412]">Product not found</p>
        <button
          onClick={() => navigate('/store')}
          className="mt-5 rounded-full border border-[#161412] px-5 py-3 text-sm font-bold text-[#161412]"
        >
          Return to storefront
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12 text-[#161412]">
      <button
        onClick={() => navigate('/store')}
        className="inline-flex items-center gap-2 rounded-full border border-[#ddd7cc] bg-white px-4 py-3 text-sm font-bold text-[#161412]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to store
      </button>

      <section className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[34px] bg-white p-5 shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
          <div className="flex aspect-square items-center justify-center rounded-[28px] bg-[#f0eeea] p-8">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-contain mix-blend-multiply"
              />
            ) : (
              <Store className="h-14 w-14 text-[#a49d92]" />
            )}
          </div>
        </div>

        <div className="rounded-[34px] bg-white p-7 shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8f5d31]">
            {product.category || 'General'}
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight flex items-center gap-3">
            {product.name}
            {isFetchingProduct && !isLoadingProduct && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#8f5d31]/10 text-[#8f5d31] border border-[#8f5d31]/20 animate-pulse font-sans">
                Syncing...
              </span>
            )}
          </h1>

          <div className="mt-4 flex items-center gap-2 text-[#161412]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-4 w-4 ${index < Math.round(product.ratingAverage || 0) ? 'fill-current' : ''}`}
              />
            ))}
            <span className="text-sm text-[#6b665f]">
              {product.ratingAverage || 0}/5 · {product.reviewCount || product.reviews?.length || 0}{' '}
              reviews
            </span>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className="text-4xl font-black tracking-tight">
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <>
                <span className="text-xl font-semibold text-[#8b857c] line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
                <span className="rounded-full bg-[#f8dfdb] px-3 py-1 text-sm font-bold text-[#a44737]">
                  -{product.discountPercent}%
                </span>
              </>
            )}
          </div>

          {isB2BApproved && product.priceTiers?.length > 0 && (
            <div className="mt-6 p-4 rounded-2xl bg-[#f8f6f1] border border-[#ddd7cc] text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8b857c] mb-3">
                Wholesale Volume Price Tiers
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {product.priceTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex justify-between border-b border-[#ddd7cc]/40 pb-2"
                  >
                    <span className="font-semibold text-[#6b665f]">{tier.minQuantity}+ units</span>
                    <span className="font-black text-[#161412]">
                      {formatCurrency(tier.unitPrice)} / unit
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 text-base leading-8 text-[#5f5951]">
            {product.description || 'No description provided for this product.'}
          </p>

          <div className="mt-6 rounded-[26px] bg-[#f8f6f1] px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">Sold by</p>
            <p className="mt-2 text-lg font-black tracking-tight flex items-center justify-between">
              {product.wholesaler?.businessName || 'Unknown shop'}
              <button
                onClick={() => navigate('/store/dashboard')}
                className="text-xs font-black uppercase tracking-wider text-amber-600 hover:text-amber-700 flex items-center gap-1 bg-transparent border-none outline-none cursor-pointer"
              >
                View Price Desk
              </button>
            </p>
          </div>

          {product.sizes?.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">
                Select size
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                      selectedSize === size
                        ? 'bg-[#161412] text-white'
                        : 'border border-[#ddd7cc] bg-[#fbfaf7] text-[#161412]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity selector and checkout */}
          <div className="mt-8 grid grid-cols-[120px_1fr] gap-4 items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c] mb-3">
                Quantity
              </p>
              <div className="flex items-center justify-between border border-[#ddd7cc] rounded-full px-3 py-3 bg-[#fbfaf7]">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(minQty, quantity - 1))}
                  className="font-bold text-[#6b665f] hover:text-[#161412] px-1"
                >
                  -
                </button>
                <span className="font-bold text-sm font-mono">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="font-bold text-[#6b665f] hover:text-[#161412] px-1"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className="flex items-center justify-center gap-2 rounded-full bg-[#161412] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#2d2a27]"
            >
              <ShoppingBag className="h-5 w-5" />
              Add to cart
            </button>
          </div>

          {isB2BApproved && product.minOrderQty > 1 && (
            <p className="mt-3 text-xs font-semibold text-amber-600">
              ⚠️ Minimum Wholesale Order Quantity (MOQ) is {product.minOrderQty} units.
            </p>
          )}

          {/* RFQ Quote Proposal Form */}
          {isB2BApproved && (
            <div className="mt-8 pt-6 border-t border-[#f3efe8]">
              <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500" /> Request Custom Quote (RFQ)
              </h3>
              <p className="text-xs text-[#6b665f] mt-1 leading-relaxed">
                Negotiate prices below tiers by proposing your target bid directly to the
                wholesaler.
              </p>
              <form onSubmit={handleRfqSubmit} className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8f877b] uppercase tracking-wider mb-1">
                      Target Quantity
                    </label>
                    <input
                      required
                      type="number"
                      min={product.minOrderQty || 1}
                      value={targetQty}
                      onChange={(e) => setTargetQty(e.target.value)}
                      placeholder={`Min ${product.minOrderQty}`}
                      className="w-full px-3 py-2 bg-[#fbfaf7] border border-[#ddd7cc] rounded-xl text-xs focus:outline-none focus:border-[#161412] font-mono text-[#161412]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8f877b] uppercase tracking-wider mb-1">
                      Target Price (₹/unit)
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder={`Catalog is ₹${product.price}`}
                      className="w-full px-3 py-2 bg-[#fbfaf7] border border-[#ddd7cc] rounded-xl text-xs focus:outline-none focus:border-[#161412] font-mono text-[#161412]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8f877b] uppercase tracking-wider mb-1">
                    Comments / Terms
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe custom logistics, contracts, etc."
                    className="w-full px-3 py-2 bg-[#fbfaf7] border border-[#ddd7cc] rounded-xl text-xs focus:outline-none focus:border-[#161412] text-[#161412]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={createRfq.isPending}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-[#0a0a0a] font-bold text-xs uppercase tracking-widest py-3.5 rounded-full transition-all"
                >
                  {createRfq.isPending ? 'Uploading Bid...' : 'Submit Target Price Offer'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[34px] bg-white p-7 shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
          <h2 className="text-3xl font-black tracking-tight">Reviews</h2>
          {isAuthenticated ? (
            <form
              onSubmit={handleReviewSubmit}
              className="mt-6 space-y-4 rounded-[28px] bg-[#f8f6f1] p-5"
            >
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      rating === value ? 'bg-[#161412] text-white' : 'bg-white text-[#161412]'
                    }`}
                  >
                    {value} Star
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Share your product experience"
                rows={4}
                className="w-full rounded-[22px] border border-[#ddd7cc] bg-white px-4 py-4 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={isSubmittingReview}
                className="rounded-full bg-[#161412] px-5 py-3 text-sm font-bold text-white"
              >
                {isSubmittingReview ? 'Posting review...' : 'Post review'}
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-[28px] bg-[#f8f6f1] p-6 text-center border border-dashed border-[#ddd7cc]">
              <p className="text-sm font-semibold text-[#6b665f]">
                You must be logged in to leave a review.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                className="mt-4 rounded-full bg-[#161412] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#2c2926]"
              >
                Login / Register
              </button>
            </div>
          )}

          <div className="mt-6 space-y-4">
            {(product.reviews || []).length ? (
              product.reviews.map((review) => (
                <div key={review.id} className="rounded-[24px] border border-[#ece7de] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#161412]">
                      {review.user?.name || 'Customer'}
                    </p>
                    <span className="text-sm text-[#6b665f]">{review.rating}/5</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#5f5951]">
                    {review.comment || 'No comment left.'}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#ddd7cc] px-5 py-8 text-sm text-[#6b665f]">
                No reviews yet. Be the first to review this product.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[34px] bg-white p-7 shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
          <h2 className="text-3xl font-black tracking-tight">You might also like</h2>
          <div className="mt-6 grid gap-4">
            {isLoadingSimilar ? (
              <div className="rounded-[24px] bg-[#f8f6f1] px-5 py-8 text-sm font-semibold text-[#6b665f]">
                Loading similar products...
              </div>
            ) : similarProducts.length > 0 ? (
              similarProducts.map((item) => (
                <button
                  key={item.product.id}
                  onClick={() => handleRecommendationClick(item.product)}
                  className="flex items-center gap-4 rounded-[26px] bg-[#f8f6f1] p-4 text-left transition hover:bg-[#f1ede6]"
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-[22px] bg-white p-3">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-full w-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <Store className="h-8 w-8 text-[#a49d92]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                      {item.product.category || 'General'}
                    </p>
                    <p className="mt-2 text-base font-black tracking-tight text-[#161412]">
                      {item.product.name}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#161412]">
                      {formatCurrency(item.product.price)}
                    </p>
                    {item.reasons?.[0] && (
                      <p className="mt-2 text-xs leading-5 text-[#6b665f]">{item.reasons[0]}</p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#ddd7cc] px-5 py-8 text-sm text-[#6b665f]">
                Similar products will appear after recommendation jobs are built.
              </div>
            )}
          </div>
        </div>
      </section>
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
