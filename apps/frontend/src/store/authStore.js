import { create } from 'zustand';
import apiClient from '../api/axios.js'; // The Axios client we just made

const useAuthStore = create((set) => ({
  // 1. Initial State (Check if user is already logged in via localStorage)
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  // 2. Login Action
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Calls the /api/auth/login route we built on the backend
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      // Save to browser storage so they stay logged in
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update the React global state
      set({ user, token, isAuthenticated: true, isLoading: false });
      
      return user; // Return user so the UI knows where to redirect them
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Login failed. Please check your credentials.', 
        isLoading: false 
      });
      throw error; // Throw so the UI component can show a toast/alert
    }
  },

  // 3. Register Action
  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      // Calls the /api/auth/register route
      const response = await apiClient.post('/auth/register', userData);
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.error || 'Registration failed.', 
        isLoading: false 
      });
      throw error;
    }
  },

  // 4. Logout Action
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  }
}));

export default useAuthStore;