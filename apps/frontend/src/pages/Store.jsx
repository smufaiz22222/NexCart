import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import apiClient from '../api/axios';

export default function Store() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiClient.get('/products');
        setProducts(response.data.products);
      } catch (error) {
        console.error('Failed to fetch products', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

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
      return [...prevCart, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
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
        items: cart.map(item => ({ productId: item.productId, quantity: item.quantity }))
      });
      
      alert('Order placed successfully! Invoice and Ledger updated.');
      setCart([]); // Clear cart
      
      // Re-fetch products to get updated stock numbers
      const response = await apiClient.get('/products');
      setProducts(response.data.products);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to place order');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoading) return <div className="text-center py-20 text-gray-500">Loading storefront...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT: Product Grid (Takes up 2/3 of the screen) */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Available Products</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="h-48 bg-gray-100 flex items-center justify-center">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-gray-400">No Image</span>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-4 flex-1">{product.description}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xl font-extrabold text-blue-600">${parseFloat(product.price).toFixed(2)}</span>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.currentStock <= 0}
                    className="flex items-center px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {product.currentStock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">{product.currentStock} units available</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Shopping Cart (Takes up 1/3 of the screen) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit sticky top-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-blue-600" />
          Your Cart
        </h2>

        {cart.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Your cart is empty.</p>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.productId} className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity} x ${item.price}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-between items-center text-lg font-bold text-gray-900">
              <span>Total:</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full mt-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400"
            >
              {isCheckingOut ? 'Processing...' : 'Checkout & Place Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}