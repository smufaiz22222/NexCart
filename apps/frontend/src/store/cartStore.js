import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  cart: [],
  
  // Add an item to the cart, or increase its quantity if it's already there
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

  // Remove completely
  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(item => item.id !== productId) });
  },

  // Adjust quantity manually
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) return get().removeFromCart(productId);
    set({
      cart: get().cart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    });
  },

  clearCart: () => set({ cart: [] }),

  // Helper to get total items (e.g., 3 apples + 2 shirts = 5 items)
  getTotalItems: () => {
    return get().cart.reduce((total, item) => total + item.quantity, 0);
  },

  // Helper to get total price
  getTotalPrice: () => {
    return get().cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}));

export default useCartStore;