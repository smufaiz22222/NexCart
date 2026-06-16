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

        const token = localStorage.getItem('token');
        if (!token) {
          set({ hasHydrated: true });
          return;
        }

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
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isMutating: true });
          try {
            const res = await apiClient.get(`/products/${productId}`);
            const product = res.data;
            const currentCart = get().cart || [];
            const normalizedSelectedSize = selectedSize?.trim() || null;

            const existingIndex = currentCart.findIndex(
              (item) => item.productId === productId && item.selectedSize === normalizedSelectedSize
            );

            let nextCart = [...currentCart];
            if (existingIndex > -1) {
              const nextQty = nextCart[existingIndex].quantity + quantity;
              if (nextQty > product.currentStock) {
                throw new Error(`Only ${product.currentStock} units available for ${product.name}`);
              }
              nextCart[existingIndex] = {
                ...nextCart[existingIndex],
                quantity: nextQty,
                lineTotal: nextQty * Number(product.price),
              };
            } else {
              if (quantity > product.currentStock) {
                throw new Error(`Only ${product.currentStock} units available for ${product.name}`);
              }
              const tempId = `local-${productId}-${normalizedSelectedSize || 'nosize'}`;
              nextCart.push({
                id: tempId,
                productId,
                name: product.name,
                imageUrl: product.imageUrl,
                price: Number(product.price),
                wholesaler: product.wholesaler,
                selectedSize: normalizedSelectedSize,
                quantity,
                currentStock: product.currentStock,
                product,
                lineTotal: Number(product.price) * quantity,
                productSnapshot: {
                  id: product.id,
                  imageUrl: product.imageUrl,
                  name: product.name,
                  seller: product.wholesaler?.businessName || 'Unknown shop',
                  category: product.category,
                  price: Number(product.price),
                },
              });
            }

            const nextTotals = {
              itemCount: nextCart.reduce((sum, item) => sum + item.quantity, 0),
              subtotal: nextCart.reduce((sum, item) => sum + item.lineTotal, 0),
            };

            set({ cart: nextCart, totals: nextTotals });
            return { cart: nextCart, totals: nextTotals };
          } finally {
            set({ isMutating: false });
          }
        }

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
        const token = localStorage.getItem('token');
        if (!token) {
          if (quantity <= 0) {
            return get().removeFromCart(cartItemId);
          }
          set({ isMutating: true });
          try {
            const currentCart = get().cart || [];
            const nextCart = currentCart.map((item) => {
              if (item.id === cartItemId) {
                if (quantity > item.currentStock) {
                  throw new Error(`Only ${item.currentStock} units available for ${item.name}`);
                }
                return {
                  ...item,
                  quantity,
                  lineTotal: quantity * item.price,
                };
              }
              return item;
            });
            const nextTotals = {
              itemCount: nextCart.reduce((sum, item) => sum + item.quantity, 0),
              subtotal: nextCart.reduce((sum, item) => sum + item.lineTotal, 0),
            };
            set({ cart: nextCart, totals: nextTotals });
            return { cart: nextCart, totals: nextTotals };
          } finally {
            set({ isMutating: false });
          }
        }

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
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isMutating: true });
          try {
            const currentCart = get().cart || [];
            const nextCart = currentCart.filter((item) => item.id !== cartItemId);
            const nextTotals = {
              itemCount: nextCart.reduce((sum, item) => sum + item.quantity, 0),
              subtotal: nextCart.reduce((sum, item) => sum + item.lineTotal, 0),
            };
            set({ cart: nextCart, totals: nextTotals });
            return { cart: nextCart, totals: nextTotals };
          } finally {
            set({ isMutating: false });
          }
        }

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
        const token = localStorage.getItem('token');
        if (!token) {
          set({
            cart: [],
            totals: { itemCount: 0, subtotal: 0 },
          });
          return { cart: [], totals: { itemCount: 0, subtotal: 0 } };
        }

        set({ isMutating: true });
        try {
          const response = await apiClient.delete('/cart');
          set(normalizeCartResponse(response.data));
          return response.data;
        } finally {
          set({ isMutating: false });
        }
      },

      syncLocalCart: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const localCart = get().cart || [];
        if (localCart.length === 0) {
          await get().hydrateCart();
          return;
        }

        set({ isMutating: true });
        try {
          for (const item of localCart) {
            try {
              await apiClient.post('/cart/items', {
                productId: item.productId,
                selectedSize: item.selectedSize,
                quantity: item.quantity,
              });
            } catch (err) {
              console.error(`Failed to sync item ${item.name} to backend:`, err);
            }
          }
          const response = await apiClient.get('/cart');
          set({
            ...normalizeCartResponse(response.data),
          });
        } catch (error) {
          console.error('Failed to sync cart:', error);
          await get().hydrateCart();
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
