import { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import apiClient from '../api/axios';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      // Map frontend cart data to what the backend expects
      const orderItems = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }));

      await apiClient.post('/orders/checkout', { items: orderItems });
      
      alert('Order placed successfully!');
      clearCart();
      navigate('/store'); // Send them back to the store
    } catch (error) {
      alert(error.response?.data?.error || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <ShoppingBag className="h-20 w-20 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="text-gray-500 mt-2 mb-6">Looks like you haven't added anything yet.</p>
        <button onClick={() => navigate('/store')} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {cart.map((item) => (
            <li key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBag className="h-8 w-8 text-gray-400 m-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">Shop: {item.wholesaler?.businessName || 'Unknown'}</p>
                  <p className="text-sm font-bold text-blue-600 mt-1">₹{item.price.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                {/* Quantity Controls */}
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-l-lg">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-r-lg">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-2">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        
        <div className="bg-gray-50 p-6 border-t border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-medium text-gray-700">Subtotal</span>
            <span className="text-2xl font-bold text-gray-900">₹{getTotalPrice().toFixed(2)}</span>
          </div>
          
          <button 
            onClick={handleCheckout} 
            disabled={isProcessing}
            className="w-full flex justify-center items-center bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing Order...' : 'Place Secure Order'}
            {!isProcessing && <ArrowRight className="ml-2 h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}