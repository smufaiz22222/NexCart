import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/axios';

const normalizeCartResponse = (data) => ({
  cart: data?.cart || data?.items || [],
  totals: {
    itemCount: data?.totals?.itemCount || 0,
    subtotal: data?.totals?.subtotal || 0,
  },
});

const useCartStore = create(
  persist(
    (set, get) => ({
      cart: [],
      totals: {
        itemCount: 0,
        subtotal: 0,
      },
      isHydrating: false,
      isMutating: false,
      hasHydrated: false,

      hydrateCart: async () => {
        if (get().isHydrating) return;

        set({ isHydrating: true });
        try {
          const response = await apiClient.get('/cart');
          set({
            ...normalizeCartResponse(response.data),
            hasHydrated: true,
          });
        } catch (error) {
          set({
            cart: [],
            totals: { itemCount: 0, subtotal: 0 },
            hasHydrated: true,
          });
          throw error;
        } finally {
          set({ isHydrating: false });
        }
      },

      addToCart: async ({
        productId,
        selectedSize,
        quantity = 1,
        recommendationId = null,
        recommendationSource = null,
      }) => {
        set({ isMutating: true });
        try {
          const response = await apiClient.post('/cart/items', {
            productId,
            selectedSize: selectedSize?.trim() || null,
            quantity,
            recommendationId,
            recommendationSource,
          });
          set(normalizeCartResponse(response.data));
          return response.data;
        } finally {
          set({ isMutating: false });
        }
      },

      updateQuantity: async (cartItemId, quantity) => {
        if (quantity <= 0) {
          return get().removeFromCart(cartItemId);
        }

        set({ isMutating: true });
        try {
          const response = await apiClient.patch(`/cart/items/${cartItemId}`, { quantity });
          set(normalizeCartResponse(response.data));
          return response.data;
        } finally {
          set({ isMutating: false });
        }
      },

      removeFromCart: async (cartItemId) => {
        set({ isMutating: true });
        try {
          const response = await apiClient.delete(`/cart/items/${cartItemId}`);
          set(normalizeCartResponse(response.data));
          return response.data;
        } finally {
          set({ isMutating: false });
        }
      },

      clearCart: async () => {
        set({ isMutating: true });
        try {
          const response = await apiClient.delete('/cart');
          set(normalizeCartResponse(response.data));
          return response.data;
        } finally {
          set({ isMutating: false });
        }
      },

      resetCartState: () =>
        set({
          cart: [],
          totals: { itemCount: 0, subtotal: 0 },
          hasHydrated: false,
          isHydrating: false,
          isMutating: false,
        }),

      getTotalItems: () => get().totals.itemCount,
      getTotalPrice: () => get().totals.subtotal,
    }),
    {
      name: 'nexcart-cart-storage',
      partialize: (state) => ({
        cart: state.cart,
        totals: state.totals,
      }),
    }
  )
);

export default useCartStore;
