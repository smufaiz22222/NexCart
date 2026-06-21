import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Package, ShoppingBag, Star } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-[#EFEFEF] rounded mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 rounded-xl bg-[#EFEFEF] border border-[#C0C0C0]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans text-[#16171a]">
      {/* Back button */}
      <button
        onClick={() => navigate('/store')}
        className="flex items-center text-sm font-bold text-[#6C757D] hover:text-[#0047AB] transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Store
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Heart className="w-7 h-7 text-red-500 fill-red-500" />
            Wishlist
          </h1>
          <p className="text-sm text-[#6C757D] mt-1">
            Keep track of style discoveries and items you want to monitor
          </p>
        </div>
        <span className="text-xs font-mono text-[#6C757D] border border-[#C0C0C0] px-3 py-1.5 rounded-lg bg-[#EFEFEF]">
          {wishlistProducts.length} item{wishlistProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#C0C0C0] rounded-2xl bg-white">
          <Heart className="w-14 h-14 text-[#C0C0C0] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#161412]">Your wishlist is empty</h2>
          <p className="text-sm text-[#6C757D] mt-2 max-w-sm mx-auto">
            Explore the fashion storefront catalog and click the Heart icon on items you love.
          </p>
          <button
            onClick={() => navigate('/store')}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#0047AB] hover:bg-[#003B91] text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Browse Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {wishlistProducts.map((product) => (
            <div
              key={product.id}
              className="group rounded-xl border border-[#ddd7cc] bg-white hover:border-[#0047AB] hover:shadow-lg hover:shadow-[#0047AB]/5 transition-all duration-200 flex flex-col overflow-hidden relative"
            >
              {/* Heart Icon Toggle */}
              <button
                onClick={() => handleRemoveFromWishlist(product.id, product.name)}
                className="absolute right-3 top-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white text-red-500 hover:scale-110 shadow-sm border border-[#ddd7cc]/40 transition-all duration-200"
                title="Remove from Wishlist"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>

              {/* Product Image */}
              <div
                onClick={() => navigate(`/store/product/${product.id}`)}
                className="h-44 bg-[#faf9f7] flex items-center justify-center border-b border-[#EFEFEF] cursor-pointer overflow-hidden"
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Package className="w-10 h-10 text-[#C0C0C0]" />
                )}
              </div>

              {/* Product Info */}
              <div className="p-4 flex flex-col flex-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#6C757D]">
                  {product.category || 'General'}
                </span>
                <h3
                  onClick={() => navigate(`/store/product/${product.id}`)}
                  className="text-sm font-bold text-[#161412] line-clamp-2 mt-1 cursor-pointer hover:text-[#0047AB] transition-colors"
                >
                  {product.name}
                </h3>

                {product.wholesaler?.businessName && (
                  <p className="text-[10px] text-[#6C757D] mt-1">
                    by {product.wholesaler.businessName}
                  </p>
                )}

                {product.ratingAverage > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-semibold text-[#6C757D]">
                      {Number(product.ratingAverage).toFixed(1)}/5 ({product.reviewCount || 0})
                    </span>
                  </div>
                )}

                <div className="mt-auto pt-3">
                  <p className="text-base font-bold font-mono text-[#0047AB]">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(Number(product.price))}
                  </p>
                </div>

                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.currentStock <= 0}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#161412] hover:bg-[#0047AB] disabled:bg-[#C0C0C0] disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {product.currentStock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
