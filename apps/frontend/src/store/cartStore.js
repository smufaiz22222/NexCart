import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  cart: [],
  
  addToCart: (product) => {
    const currentCart = get().cart;
    const existingItem = currentCart.find(item => item.id === product.id);
    
    if (existingItem) {
      set({ 
        cart: currentCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        ) 
      });
    } else {
      set({ cart: [...currentCart, { ...product, quantity: 1 }] });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(item => item.id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) return get().removeFromCart(productId);
    set({
      cart: get().cart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    });
  },

  clearCart: () => set({ cart: [] }),

  getTotalItems: () => {
    return get().cart.reduce((total, item) => total + item.quantity, 0);
  },

  getTotalPrice: () => {
    return get().cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}));

export default useCartStore;
