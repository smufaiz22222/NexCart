import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Package, ShoppingBag, Star, Trash2 } from 'lucide-react';
import { useWishlist, useToggleWishlist } from '../api/queries';
import useCartStore from '../store/cartStore';
import { toast } from 'sonner';

export default function Wishlist() {
  const navigate = useNavigate();
  const { data: wishlistProducts = [], isLoading } = useWishlist();
  const toggleWishlistMutation = useToggleWishlist();
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAddToCart = async (product) => {
    try {
      await addToCart({
        productId: product.id,
        quantity: 1,
        selectedSize: null,
      });
      toast.success(`${product.name} added to cart`);
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
    }
  };

  const handleRemoveFromWishlist = async (productId, name) => {
    toggleWishlistMutation.mutate(productId, {
      onSuccess: () => {
        toast.success(`${name} removed from wishlist`);
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to update wishlist');
      },
    });
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-10 w-56 bg-[#f1f5f9] rounded-xl mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-[#f1f5f9] border border-[#e2e8f0]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans text-[#1e293b]">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/store/dashboard')}
          className="flex items-center text-sm font-semibold text-[#64748b] hover:text-[#4f46e5] transition-colors group mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ef4444] to-[#f97316]">
              <Heart className="h-5 w-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#1e293b]">Wishlist</h1>
              <p className="text-sm text-[#64748b] mt-0.5">Items you've saved for later</p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#64748b] border border-[#e2e8f0] px-3 py-1.5 rounded-full bg-[#f1f5f9] font-mono">
            {wishlistProducts.length} item{wishlistProducts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[#e2e8f0] rounded-2xl bg-white">
          <div className="w-16 h-16 rounded-2xl bg-[#fef2f2] flex items-center justify-center mx-auto mb-5">
            <Heart className="w-8 h-8 text-[#fca5a5]" />
          </div>
          <h2 className="text-lg font-bold text-[#1e293b]">Your wishlist is empty</h2>
          <p className="text-sm text-[#64748b] mt-2 max-w-sm mx-auto">
            Explore the storefront and tap the heart icon on items you love to save them here.
          </p>
          <button
            onClick={() => navigate('/store')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 stagger-children">
          {wishlistProducts.map((product) => (
            <div
              key={product.id}
              className="group rounded-xl border border-[#e2e8f0] bg-white hover:border-[#4f46e5] hover:shadow-lg hover:shadow-[#4f46e5]/5 transition-all duration-200 flex flex-col overflow-hidden relative card-hover-lift animate-slide-in"
            >
              {/* Remove from Wishlist */}
              <button
                onClick={() => handleRemoveFromWishlist(product.id, product.name)}
                className="absolute right-3 top-3 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-red-50 text-[#94a3b8] hover:text-red-500 shadow-sm border border-[#e2e8f0] hover:border-red-200 transition-all duration-200 hover:scale-110"
                title="Remove from Wishlist"
              >
                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
              </button>

              {/* Product Image */}
              <div
                onClick={() => navigate(`/store/product/${product.id}`)}
                className="h-44 bg-[#f8fafc] flex items-center justify-center border-b border-[#e2e8f0] cursor-pointer overflow-hidden relative"
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Package className="w-10 h-10 text-[#94a3b8]" />
                )}
                {product.currentStock <= 0 && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 flex flex-col flex-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748b]">
                  {product.category || 'General'}
                </span>
                <h3
                  onClick={() => navigate(`/store/product/${product.id}`)}
                  className="text-sm font-bold text-[#1e293b] line-clamp-2 mt-1 cursor-pointer hover:text-[#4f46e5] transition-colors"
                >
                  {product.name}
                </h3>

                {product.wholesaler?.businessName && (
                  <p className="text-[10px] text-[#64748b] mt-1">
                    by {product.wholesaler.businessName}
                  </p>
                )}

                {product.ratingAverage > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-semibold text-[#64748b]">
                      {Number(product.ratingAverage).toFixed(1)} ({product.reviewCount || 0})
                    </span>
                  </div>
                )}

                <div className="mt-auto pt-3">
                  <p className="text-base font-black font-mono text-[#4f46e5]">
                    {formatCurrency(product.price)}
                  </p>
                </div>

                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.currentStock <= 0}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e293b] hover:bg-[#4f46e5] disabled:bg-[#e2e8f0] disabled:text-[#94a3b8] disabled:cursor-not-allowed text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all btn-press"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {product.currentStock > 0 ? 'Add to Cart' : 'Unavailable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
