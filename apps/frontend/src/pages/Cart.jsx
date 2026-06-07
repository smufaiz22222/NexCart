import { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, MapPin, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import apiClient from '../api/axios';

export default function Cart() {
  const { cart, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState(''); 
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!shippingAddress.trim()) {
      return alert("Please enter a shipping address before placing your order.");
    }
    
    setIsProcessing(true);

    try {
      const orderItems = cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        recommendationId: item.recommendationContext?.recommendationId
      }));

      await apiClient.post('/orders/checkout', { items: orderItems, shippingAddress });
      
      alert('Order placed successfully!');
      clearCart();
      navigate('/orders');
    } catch (error) {
      alert(error.response?.data?.error || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#0a0a0a] font-sans selection:bg-amber-500/30 selection:text-amber-200">
        <div className="bg-[#1c1c1c] p-6 rounded-full mb-6 border border-zinc-800 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <ShoppingBag className="h-16 w-16 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-wide">Your cart is empty</h2>
        <p className="text-zinc-500 mt-2 mb-8 font-medium">Looks like you haven't added anything yet.</p>
        <button 
          onClick={() => navigate('/store')} 
          className="bg-amber-500 text-[#0a0a0a] px-8 py-3.5 rounded-md font-extrabold hover:bg-amber-400 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 tracking-wide"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans selection:bg-amber-500/30 selection:text-amber-200 bg-[#0a0a0a] min-h-screen">
      
      <button 
        onClick={() => navigate('/store')} 
        className="flex items-center text-zinc-400 hover:text-amber-400 font-bold text-sm tracking-wide transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
        Back to Storefront
      </button>

      <h1 className="text-3xl font-extrabold text-white mb-8 tracking-wide">Shopping Cart</h1>

      <div className="bg-[#1c1c1c] rounded-lg shadow-2xl border border-zinc-800 overflow-hidden">
        
        <ul className="divide-y divide-zinc-800/50">
          {cart.map((item) => (
            <li key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-800/20 transition-colors gap-6 sm:gap-0 group">
              
              <div className="flex items-center space-x-5">
                <div className="h-20 w-20 bg-[#F5F5F0] border border-zinc-700 rounded-md overflow-hidden shrink-0 flex items-center justify-center p-1 relative">
                  {item.selectedSize && (
                    <span className="absolute top-0 right-0 bg-[#1c1c1c] text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-bl-md border-b border-l border-zinc-700 z-10">
                      {item.selectedSize}
                    </span>
                  )}
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <ShoppingBag className="h-8 w-8 text-zinc-400" />
                  )}
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors leading-tight mb-1">{item.name}</h3>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                    Shop: <span className="text-zinc-300">{item.wholesaler?.businessName || 'Unknown'}</span>
                  </p>
                  <p className="text-lg font-black text-amber-500">₹{parseFloat(item.price).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end space-x-6 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="flex items-center border border-zinc-700 bg-[#0a0a0a] rounded-md shadow-inner">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-l-md transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 font-bold text-white text-sm min-w-[3rem] text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-r-md transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.id)} 
                  className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2.5 rounded-md transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        
        <div className="p-6 border-t border-zinc-800 bg-[#1c1c1c]">
          <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center mb-4">
            <MapPin className="h-4 w-4 mr-2" />
            Shipping Address
          </h3>
          <textarea
            required
            rows="3"
            className="w-full bg-[#0a0a0a] border border-zinc-700 rounded-md p-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none shadow-inner"
            placeholder="Enter your full delivery address (Street, City, State, ZIP)..."
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
          ></textarea>
        </div>

        <div className="bg-[#0a0a0a] p-6 sm:p-8 border-t border-zinc-800">
          <div className="flex justify-between items-end mb-8">
            <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Subtotal</span>
            <span className="text-3xl font-black text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              ₹{getTotalPrice().toFixed(2)}
            </span>
          </div>
          
          <button 
            onClick={handleCheckout} 
            disabled={isProcessing}
            className={`w-full flex justify-center items-center py-4 px-4 rounded-md font-extrabold text-lg transition-all duration-300 ${
              isProcessing 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-amber-500 text-[#0a0a0a] hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.99]'
            }`}
          >
            {isProcessing ? 'Processing Order...' : 'Place Secure Order'}
            {!isProcessing && <ArrowRight className="ml-2.5 h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
