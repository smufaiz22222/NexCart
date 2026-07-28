import { create } from 'zustand';
import {
  fetchB2BCart,
  addB2BCartItem as apiAddItem,
  updateB2BCartItem as apiUpdateItem,
  removeB2BCartItem as apiRemoveItem,
  clearB2BCart as apiClearCart,
  b2bCheckout as apiCheckout,
} from '../api/b2bCartApi';

/**
 * B2B Cart Store — syncs with server-side B2BCart via /api/b2b-cart.
 * Completely independent from the regular B2C cart.
 */
const useB2BCartStore = create((set, get) => ({
  items: [],
  totals: { itemCount: 0, subtotal: 0 },
  isLoading: false,
  isMutating: false,
  hasHydrated: false,
  error: null,

  hydrateCart: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const { data } = await fetchB2BCart();
      set({
        items: data.items || [],
        totals: data.totals || { itemCount: 0, subtotal: 0 },
        hasHydrated: true,
      });
    } catch (error) {
      set({ items: [], totals: { itemCount: 0, subtotal: 0 }, hasHydrated: true });
      if (error.response?.status !== 403) {
        set({ error: error.response?.data?.error || 'Failed to load B2B cart' });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async ({ productId, rfqId, quantity, unitPrice }) => {
    set({ isMutating: true, error: null });
    try {
      const { data } = await apiAddItem({ productId, rfqId, quantity, unitPrice });
      set({ items: data.items || [], totals: data.totals || { itemCount: 0, subtotal: 0 } });
      return data;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to add item' });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  updateQuantity: async (itemId, quantity) => {
    set({ isMutating: true, error: null });
    try {
      const { data } = await apiUpdateItem(itemId, quantity);
      set({ items: data.items || [], totals: data.totals || { itemCount: 0, subtotal: 0 } });
      return data;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to update item' });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  removeItem: async (itemId) => {
    set({ isMutating: true, error: null });
    try {
      const { data } = await apiRemoveItem(itemId);
      set({ items: data.items || [], totals: data.totals || { itemCount: 0, subtotal: 0 } });
      return data;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to remove item' });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  clearCart: async () => {
    set({ isMutating: true, error: null });
    try {
      const { data } = await apiClearCart();
      set({ items: data.items || [], totals: data.totals || { itemCount: 0, subtotal: 0 } });
      return data;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to clear cart' });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  checkout: async ({ addressId, paymentReferenceNo, paymentReceiptUrl }) => {
    set({ isMutating: true, error: null });
    try {
      const { data } = await apiCheckout({ addressId, paymentReferenceNo, paymentReceiptUrl });
      set({ items: [], totals: { itemCount: 0, subtotal: 0 } });
      return data;
    } catch (error) {
      set({ error: error.response?.data?.error || 'Failed to checkout' });
      throw error;
    } finally {
      set({ isMutating: false });
    }
  },

  getTotalItems: () => get().totals.itemCount,
  getSubtotal: () => get().totals.subtotal,
}));

export default useB2BCartStore;
