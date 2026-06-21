import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const message = error.response?.data?.error || '';
    const isAuthRoute =
      url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/logout');
    const isExpiredTokenError =
      status === 403 && typeof message === 'string' && /invalid or expired token/i.test(message);
    const shouldForceLogout = !isAuthRoute && (status === 401 || isExpiredTokenError);

    if (shouldForceLogout) {
      try {
        const useAuthStore = (await import('../store/authStore')).default;
        await useAuthStore.getState().logout();
      } catch (logoutError) {
        console.error('Logout during response intercept failed:', logoutError);
      }

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (status === 403 && error.response?.data?.featureAccess) {
      try {
        const useAuthStore = (await import('../store/authStore')).default;
        const currentStore = useAuthStore.getState();
        if (currentStore.user) {
          const updatedUser = {
            ...currentStore.user,
            featureAccess: error.response.data.featureAccess,
          };
          if (error.response.data.onboardingStatus) {
            updatedUser.wholesalerProfile = {
              ...updatedUser.wholesalerProfile,
              onboardingStatus: error.response.data.onboardingStatus,
            };
          }
          currentStore.setUser(updatedUser);
        }
      } catch (e) {
        console.error('Failed to sync featureAccess from 403 error:', e);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
