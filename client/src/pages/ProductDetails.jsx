import { startTransition, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Star, Store } from 'lucide-react';
import apiClient from '../api/axios';
import useCartStore from '../store/cartStore';

const getAttributionStorageKey = (productId) => `nexcart:recommendationAttribution:${productId}`;

const isValidAttributionContext = (context, productId) =>
  context?.recommendationId && context?.productId === productId;

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const addToCart = useCartStore((state) => state.addToCart);
  const loggedImpressionRecommendationIds = useRef(new Set());

  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [similarRecommendationId, setSimilarRecommendationId] = useState(null);
  const [attributionRecommendationContext, setAttributionRecommendationContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await apiClient.get(`/products/${id}`);
        setProduct(response.data);
        if (response.data.sizes?.length > 0) {
          setSelectedSize(response.data.sizes[0]);
        } else {
          setSelectedSize(null);
        }
        apiClient
          .post('/interactions', {
            productId: id,
            action: 'view',
            source: 'product_detail',
          })
          .catch((error) => console.error('Failed to log product view:', error));
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

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
    const fetchSimilarProducts = async () => {
      setIsLoadingSimilar(true);
      try {
        const response = await apiClient.get(`/recommendations/products/${id}/similar?limit=8`);
        setSimilarProducts(response.data.recommendations || []);
        setSimilarRecommendationId(response.data.recommendationId || null);
      } catch (error) {
        console.error('Failed to load similar products:', error);
        setSimilarProducts([]);
      } finally {
        setIsLoadingSimilar(false);
      }
    };

    fetchSimilarProducts();
  }, [id]);

  useEffect(() => {
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
  }, [similarRecommendationId, similarProducts]);

  const handleAddToCart = async () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      return alert('Please select a size first!');
    }

    try {
      await addToCart({
        productId: product.id,
        selectedSize: product.sizes?.length ? selectedSize : null,
        quantity: 1,
        recommendationId: attributionRecommendationContext?.recommendationId || null,
        recommendationSource: attributionRecommendationContext?.source || null,
      });
      apiClient
        .post('/interactions', {
          productId: product.id,
          action: 'cart',
          quantity: 1,
          source: 'product_detail',
          recommendationId: attributionRecommendationContext?.recommendationId,
          metadata: attributionRecommendationContext
            ? { recommendationSource: attributionRecommendationContext.source }
            : {},
        })
        .catch((error) => console.error('Failed to log cart interaction:', error));
      sessionStorage.removeItem(getAttributionStorageKey(product.id));
      alert('Added to cart!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add item to cart');
    }
  };

  const handleRecommendationClick = (recommendedProduct) => {
    let recommendationContext = null;

    if (similarRecommendationId) {
      recommendationContext = {
        recommendationId: similarRecommendationId,
        productId: recommendedProduct.id,
        source: 'similar_products',
      };

      apiClient
        .post('/interactions/recommendation-event', {
          recommendationId: similarRecommendationId,
          productId: recommendedProduct.id,
          eventType: 'click',
        })
        .catch((error) => console.error('Failed to log recommendation click:', error));
    }

    navigate(
      `/store/product/${recommendedProduct.id}`,
      recommendationContext ? { state: { recommendationContext } } : undefined
    );
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setIsSubmittingReview(true);
    try {
      const response = await apiClient.post(`/products/${id}/reviews`, { rating, comment });
      setProduct((current) => ({
        ...current,
        reviews: [response.data.review, ...(current?.reviews || [])],
        reviewCount: Number(current?.reviewCount || 0) + 1,
      }));
      setComment('');
      alert('Review posted!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to post review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">{product.name}</h1>

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

          <p className="mt-6 text-base leading-8 text-[#5f5951]">
            {product.description || 'No description provided for this product.'}
          </p>

          <div className="mt-6 rounded-[26px] bg-[#f8f6f1] px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">Sold by</p>
            <p className="mt-2 text-lg font-black tracking-tight">
              {product.wholesaler?.businessName || 'Unknown shop'}
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

          <button
            onClick={handleAddToCart}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[#161412] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#2d2a27]"
          >
            <ShoppingBag className="h-5 w-5" />
            Add to cart
          </button>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[34px] bg-white p-7 shadow-[0_18px_45px_rgba(22,20,18,0.05)]">
          <h2 className="text-3xl font-black tracking-tight">Reviews</h2>
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
