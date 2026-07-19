import { create } from 'zustand';
import apiClient, { injectAuthHandlers } from '../api/axios.js';
import useCartStore from './cartStore.js';
import queryClient from '../api/queryClient.js';
import { clearAuthSessionHint, setAuthSessionHint } from '../utils/sessionHint.js';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isBootstrapping: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user } = response.data;

      queryClient.clear();
      setAuthSessionHint();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isBootstrapping: false,
        error: null,
      });

      if (user?.role === 'CUSTOMER') {
        await useCartStore.getState().syncLocalCart();
      }

      return user;
    } catch (error) {
      clearAuthSessionHint();
      set({
        error: error.response?.data?.error || 'Login failed. Please check your credentials.',
        isLoading: false,
        isAuthenticated: false,
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

  initializeSession: async () => {
    set({ isBootstrapping: true });
    try {
      const response = await apiClient.get('/auth/profile');
      const user = response.data?.user || null;

      if (!user) {
        clearAuthSessionHint();
        set({ user: null, isAuthenticated: false, isBootstrapping: false });
        return null;
      }

      setAuthSessionHint();
      set({
        user,
        isAuthenticated: true,
        isBootstrapping: false,
        error: null,
      });
      return user;
    } catch {
      clearAuthSessionHint();
      set({
        user: null,
        isAuthenticated: false,
        isBootstrapping: false,
      });
      return null;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Backend logout failed:', error);
    } finally {
      clearAuthSessionHint();
      queryClient.clear();
      set({ user: null, isAuthenticated: false, isBootstrapping: false });
    }
  },

  setUser: (user) => {
    if (user) {
      setAuthSessionHint();
    } else {
      clearAuthSessionHint();
    }

    set({
      user,
      isAuthenticated: Boolean(user),
    });
  },
}));

injectAuthHandlers(
  async () => {
    await useAuthStore.getState().logout();
  },
  (featureAccess, onboardingStatus) => {
    const currentStore = useAuthStore.getState();
    if (currentStore.user) {
      const updatedUser = {
        ...currentStore.user,
        featureAccess,
      };
      if (onboardingStatus) {
        updatedUser.wholesalerProfile = {
          ...updatedUser.wholesalerProfile,
          onboardingStatus,
        };
      }
      currentStore.setUser(updatedUser);
    }
  }
);

export default useAuthStore;
