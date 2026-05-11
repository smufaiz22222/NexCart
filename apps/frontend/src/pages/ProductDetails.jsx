import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Store, ArrowLeft, MessageSquare, Package } from 'lucide-react';
import apiClient from '../api/axios';
import useCartStore from '../store/cartStore';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToCart = useCartStore((state) => state.addToCart);
  
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await apiClient.get(`/products/${id}`);
        setProduct(response.data);
        if (response.data.sizes && response.data.sizes.length > 0) {
          setSelectedSize(response.data.sizes[0]);
        }
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (product.sizes?.length > 0 && !selectedSize) {
      return alert("Please select a size first!");
    }
    
    addToCart({ ...product, selectedSize });
    alert("Added to cart!");
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      const res = await apiClient.post(`/products/${id}/reviews`, { rating, comment });
      setProduct({
        ...product,
        reviews: [res.data.review, ...product.reviews]
      });
      setComment('');
      alert("Review posted!");
    } catch (error) {
      alert(error.response?.data?.error || "Failed to post review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-amber-500 space-y-4">
        <Package className="h-10 w-10 animate-pulse" />
        <p className="font-medium tracking-widest uppercase text-sm">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-zinc-500 space-y-4">
        <Store className="h-12 w-12 text-zinc-700" />
        <p className="text-lg">Product not found.</p>
        <button onClick={() => navigate('/store')} className="mt-4 text-amber-500 hover:text-amber-400 font-medium hover:underline">
          Return to Storefront
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Navbar Area */}
      <div className="bg-[#0a0a0a]/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center">
          <button 
            onClick={() => navigate('/store')} 
            className="flex items-center text-zinc-400 hover:text-amber-400 font-bold text-sm tracking-wide transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
            Back to Store
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        
        {/* MAIN PRODUCT CONTAINER - Added items-start and gap-8 */}
        <div className="bg-[#1c1c1c] rounded-xl shadow-2xl border border-zinc-800 p-6 md:p-8 flex flex-col md:flex-row items-start gap-8 md:gap-12">
          
          {/* LEFT: Image Box - Now strictly 1/3 width, perfect square, white bg only here */}
          <div className="w-full md:w-1/3 bg-[#F5F5F0] rounded-xl flex items-center justify-center aspect-square relative shadow-inner overflow-hidden border border-zinc-300 flex-shrink-0 md:sticky md:top-28">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-full h-full object-contain mix-blend-multiply p-6 drop-shadow-xl" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-400">
                <Store className="h-16 w-16 mb-4 opacity-50 text-zinc-300" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">No Image</span>
              </div>
            )}
          </div>

          {/* RIGHT: Text & Details - Takes up 2/3 width */}
          <div className="w-full md:w-2/3 flex flex-col justify-start">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2">
              {product.category || 'General'}
            </span>
            <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight tracking-wide">
              {product.name}
            </h1>
            
            <p className="text-sm text-zinc-400 flex items-center mb-6 border-b border-zinc-800 pb-6">
              <Store className="h-4 w-4 mr-2" />
              Sold by: <span className="font-bold text-zinc-200 ml-1.5">{product.wholesaler?.businessName || 'Unknown Shop'}</span>
            </p>

            <div className="text-4xl font-black text-amber-500 mb-6 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              ₹{parseFloat(product.price).toFixed(2)}
            </div>

            <p className="text-zinc-400 leading-relaxed mb-8 flex-grow whitespace-pre-wrap">
              {product.description || "No description provided for this product."}
            </p>

            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Select Size:</h3>
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-5 py-2.5 rounded-md font-bold text-sm border transition-all duration-200 ${
                        selectedSize === size 
                          ? 'bg-amber-500 text-[#0a0a0a] border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                          : 'bg-[#0a0a0a] text-zinc-300 border-zinc-700 hover:border-amber-500/50 hover:text-amber-400'
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
              className="w-full md:w-fit px-12 bg-amber-500 text-[#0a0a0a] py-4 rounded-md font-extrabold text-lg hover:bg-amber-400 transition-all duration-300 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-[0.98]"
            >
              <ShoppingCart className="h-6 w-6 mr-2.5" />
              Add to Cart
            </button>
          </div>
        </div>

        {/* REVIEWS SECTION */}
        <div className="mt-8 bg-[#1c1c1c] rounded-xl shadow-2xl border border-zinc-800 p-8 md:p-12">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center tracking-wide">
            <MessageSquare className="h-6 w-6 mr-3 text-amber-500" />
            Customer Reviews
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            <div className="md:col-span-1 bg-[#0a0a0a] rounded-lg p-6 border border-zinc-800 h-fit shadow-inner">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-5">Write a Review</h3>
              <form onSubmit={handleReviewSubmit}>
                <div className="mb-5">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Rating</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button type="button" key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                        <Star className={`h-7 w-7 transition-colors ${rating >= star ? 'fill-amber-500 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'text-zinc-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Review (Optional)</label>
                  <textarea
                    rows="4"
                    className="w-full bg-[#1c1c1c] border border-zinc-700 rounded-md p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"
                    placeholder="What did you think about this product?"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  ></textarea>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmittingReview} 
                  className="w-full bg-[#1c1c1c] text-amber-500 border border-amber-500/50 py-3 rounded-md font-bold text-sm hover:bg-amber-500 hover:text-[#0a0a0a] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingReview ? 'Posting...' : 'Post Review'}
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-6">
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((review, idx) => (
                  <div key={idx} className="border-b border-zinc-800 pb-6 last:border-0 hover:bg-zinc-800/20 p-4 -mx-4 rounded-lg transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                      <div className="flex items-center">
                        <span className="font-bold text-white mr-3 bg-zinc-800 px-3 py-1 rounded-full text-sm">
                          {review.user?.name || "Customer"}
                        </span>
                        <div className="flex mr-3">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-zinc-700'}`} />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs font-mono text-zinc-500 mt-2 sm:mt-0">
                        {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-zinc-400 text-sm leading-relaxed bg-[#0a0a0a]/50 p-4 rounded-md border border-zinc-800/50">
                        "{review.comment}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-zinc-500 bg-[#0a0a0a] rounded-lg border border-dashed border-zinc-800 flex flex-col items-center">
                  <Star className="h-8 w-8 text-zinc-700 mb-3" />
                  <p className="font-medium tracking-wide">No reviews yet.</p>
                  <p className="text-sm mt-1">Be the first to share your thoughts on this product!</p>
                </div>
              )}
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}