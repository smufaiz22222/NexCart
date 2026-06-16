import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Store as StoreIcon } from 'lucide-react';
import apiClient from '../api/axios';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useProducts, productKeys } from '../api/queries';

export default function Store() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const { data: products = [], isLoading, isError, error, isFetching, refetch } = useProducts();

  // --- CART LOGIC ---
  const addToCart = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.productId === product.id);
      if (existing) {
        // Prevent adding more than what's in stock
        if (existing.quantity >= product.currentStock) return prevCart;
        return prevCart.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prevCart,
        { productId: product.id, name: product.name, price: product.price, quantity: 1 },
      ];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // --- CHECKOUT LOGIC ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      // Send the array of { productId, quantity } to our orderController
      await apiClient.post('/orders', {
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });

      toast.success('Order placed successfully! Invoice and Ledger updated.');
      setCart([]); // Clear cart

      // Invalidate query to get updated stock numbers
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to place order');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-red-500 space-y-4 font-sans">
        <p className="font-semibold text-center">
          Failed to load storefront: {error?.message || 'Unknown error'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md transition-all active:scale-[0.98]"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-amber-500 space-y-4">
        <StoreIcon className="h-8 w-8 animate-pulse" />
        <p className="font-medium tracking-widest uppercase text-sm">Loading storefront...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* LEFT: Product Grid (Takes up 2/3 of the screen) */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          Available Products
          {isFetching && !isLoading && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
              Syncing...
            </span>
          )}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 overflow-hidden flex flex-col group hover:shadow-2xl hover:border-amber-500/50 transition-all duration-300"
            >
              {/* Product Image Area - Soft Beige background for contrast */}
              <div className="h-48 bg-[#F5F5F0] flex items-center justify-center p-4 relative overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400">
                    <StoreIcon className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      No Image
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-white leading-snug group-hover:text-amber-400 transition-colors line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-sm text-zinc-400 mt-1 mb-5 flex-1 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                  <span className="text-xl font-extrabold text-amber-500">
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.currentStock <= 0}
                    className={`flex items-center px-4 py-2 text-sm font-semibold rounded-md transition-all duration-300 ${
                      product.currentStock > 0
                        ? 'bg-[#0a0a0a] border border-zinc-700 text-zinc-300 hover:bg-amber-500 hover:text-[#0a0a0a] hover:border-amber-500'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <Plus className={`h-4 w-4 ${product.currentStock > 0 ? 'mr-1.5' : 'hidden'}`} />
                    {product.currentStock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                </div>

                <div className="mt-3 flex justify-end">
                  <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                    {product.currentStock} units available
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Shopping Cart (Takes up 1/3 of the screen) */}
      <div className="bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 p-6 h-fit sticky top-24">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center tracking-wide">
          <ShoppingCart className="h-5 w-5 mr-2.5 text-amber-500" />
          Your Cart
        </h2>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 border border-dashed border-zinc-700 rounded-md bg-[#0a0a0a]/50">
            <ShoppingCart className="h-8 w-8 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm font-medium">Your cart is empty.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="flex justify-between items-center border-b border-zinc-800 py-3 last:border-0"
              >
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-zinc-100 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Qty: <span className="text-zinc-300 font-medium">{item.quantity}</span> × $
                    {item.price}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-amber-500 text-sm">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-5 mt-2 flex justify-between items-center border-t border-zinc-700">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Total
              </span>
              <span className="text-xl font-extrabold text-white">${cartTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className={`w-full mt-6 py-3.5 font-bold rounded-md transition-all duration-300 ${
                isCheckingOut
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-amber-500 text-[#0a0a0a] hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              }`}
            >
              {isCheckingOut ? 'Processing Order...' : 'Checkout & Place Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
