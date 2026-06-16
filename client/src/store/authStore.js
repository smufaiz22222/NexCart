import { create } from 'zustand';
import apiClient from '../api/axios.js';
import useCartStore from './cartStore.js';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, token, isAuthenticated: true, isLoading: false, error: null });

      // Sync local cart items to the database cart
      if (user?.role === 'CUSTOMER') {
        await useCartStore.getState().syncLocalCart();
      }

      return user;
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Login failed. Please check your credentials.',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const payload = {
        ...userData,
        email: userData.email.trim().toLowerCase(),
      };

      delete payload.confirmPassword;

      const response = await apiClient.post('/auth/register', payload);
      set({ isLoading: false, error: null });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Registration failed.',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
