import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
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
  useWishlist,
  useToggleWishlist,
} from '../api/queries';
import {
  ProductMediaGallery,
  ProductPurchasePanel,
  SimilarProductsSection,
  ProductReviewsSection,
  ProductErrorState,
  ProductLoadingSkeleton,
  ProductNotFoundState,
} from '../components/product/ProductDetailComponents';
import {
  useProductAttribution,
  getAttributionStorageKey,
} from '../components/product/useProductAttribution';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const addToCart = useCartStore((state) => state.addToCart);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const { data: wishlist = [] } = useWishlist({ enabled: isAuthenticated });
  const toggleWishlistMutation = useToggleWishlist();
  const isWishlisted = useMemo(() => wishlist.some((item) => item.id === id), [wishlist, id]);

  const handleWishlistToggle = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to wishlist products');
      return;
    }
    toggleWishlistMutation.mutate(id, {
      onSuccess: (data) => {
        if (data.wishlisted) {
          toast.success(`${product?.name || 'Product'} added to wishlist`);
        } else {
          toast.success(`${product?.name || 'Product'} removed from wishlist`);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to update wishlist');
      },
    });
  };

  const {
    data: product,
    isLoading: isLoadingProduct,
    isError: isErrorProduct,
    error: errorProduct,
    isFetching: isFetchingProduct,
    refetch: refetchProduct,
  } = useProductDetail(id);

  const { data: similarData, isLoading: isLoadingSimilarData } = useSimilarProducts(id);

  const [selectedSize, setSelectedSize] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewPage, setReviewPage] = useState(1);
  const reviewsPerPage = 4;
  // B2B & B2C parameters
  const hasApprovedB2BAccess =
    user?.businessProfile?.verification === 'APPROVED' &&
    user?.businessProfile?.status === 'ACTIVE';
  const minQty = 1;
  const [quantity, setQuantity] = useState(1);
  const [targetPrice, setTargetPrice] = useState('');
  const [targetQty, setTargetQty] = useState('');
  const [notes, setNotes] = useState('');
  const createRfq = useCreateRfq();

  useEffect(() => {
    if (product) {
      setQuantity(1);
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      if (product.sizes?.length > 0 && !selectedSize) {
        setSelectedSize(product.sizes[0]);
      } else if (!product.sizes?.length) {
        setSelectedSize(null);
      }
    }
  }, [product, selectedSize]);

  const similarProducts = useMemo(() => similarData?.recommendations || [], [similarData]);
  const similarRecommendationId = similarData?.recommendationId || null;

  const isLoading = isLoadingProduct;
  const isLoadingSimilar = isLoadingSimilarData;

  const { attributionRecommendationContextRef, logSimilarImpressions } = useProductAttribution(
    id,
    isAuthenticated,
    location.state
  );

  useEffect(() => {
    logSimilarImpressions(similarRecommendationId, similarProducts);
  }, [similarRecommendationId, similarProducts, isAuthenticated, logSimilarImpressions]);

  const handleAddToCart = async () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      return toast.warning('Please select a size first!');
    }

    try {
      await addToCart({
        productId: product.id,
        selectedSize: product.sizes?.length ? selectedSize : null,
        quantity: quantity,
        recommendationId: attributionRecommendationContextRef.current?.recommendationId || null,
        recommendationSource: attributionRecommendationContextRef.current?.source || null,
      });
      if (isAuthenticated) {
        apiClient
          .post('/interactions', {
            productId: product.id,
            action: 'cart',
            quantity: quantity,
            source: 'product_detail',
            recommendationId: attributionRecommendationContextRef.current?.recommendationId,
            metadata: attributionRecommendationContextRef.current
              ? { recommendationSource: attributionRecommendationContextRef.current.source }
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
    return <ProductErrorState errorProduct={errorProduct} refetchProduct={refetchProduct} />;
  }

  if (isLoading) {
    return <ProductLoadingSkeleton />;
  }

  if (!product) {
    return <ProductNotFoundState navigate={navigate} />;
  }

  return (
    <div className="space-y-10 pb-16 text-[#1e293b] animate-slide-in sm:space-y-12">
      <button
        type="button"
        onClick={() => navigate('/store')}
        className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm font-semibold text-[#64748b] hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to store
      </button>

      {/* Main Product Section */}
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] items-start">
        <ProductMediaGallery
          product={product}
          isWishlisted={isWishlisted}
          handleWishlistToggle={handleWishlistToggle}
          formatCurrency={formatCurrency}
        />

        <ProductPurchasePanel
          product={product}
          isFetchingProduct={isFetchingProduct}
          isLoadingProduct={isLoadingProduct}
          hasApprovedB2BAccess={hasApprovedB2BAccess}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          quantity={quantity}
          setQuantity={setQuantity}
          minQty={minQty}
          handleAddToCart={handleAddToCart}
          handleRfqSubmit={handleRfqSubmit}
          targetQty={targetQty}
          setTargetQty={setTargetQty}
          targetPrice={targetPrice}
          setTargetPrice={setTargetPrice}
          notes={notes}
          setNotes={setNotes}
          createRfq={createRfq}
          formatCurrency={formatCurrency}
          navigate={navigate}
        />
      </section>

      <SimilarProductsSection
        similarProducts={similarProducts}
        isLoadingSimilar={isLoadingSimilar}
        handleRecommendationClick={handleRecommendationClick}
        formatCurrency={formatCurrency}
      />

      <ProductReviewsSection
        product={product}
        isAuthenticated={isAuthenticated}
        rating={rating}
        setRating={setRating}
        comment={comment}
        setComment={setComment}
        handleReviewSubmit={handleReviewSubmit}
        isSubmittingReview={isSubmittingReview}
        reviewPage={reviewPage}
        setReviewPage={setReviewPage}
        reviewsPerPage={reviewsPerPage}
      />
    </div>
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
