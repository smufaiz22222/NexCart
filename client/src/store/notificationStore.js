import { create } from 'zustand';
import apiClient from '../api/axios.js';
import { toast } from 'sonner';

let pollInterval = null;

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    try {
      const response = await apiClient.get('/notifications');
      const { notifications, unreadCount } = response.data;

      const oldNotifications = get().notifications;
      if (oldNotifications.length > 0) {
        const oldIds = new Set(oldNotifications.map((n) => n.id));
        const newItems = notifications.filter((n) => !oldIds.has(n.id) && !n.isRead);

        if (newItems.length > 0) {
          newItems.forEach((n) => {
            toast(n.title, {
              description: n.message,
              duration: 6000,
              action: n.link
                ? {
                    label: 'View',
                    onClick: () => {
                      window.location.href = n.link;
                    },
                  }
                : undefined,
            });
          });
        }
      }

      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  },

  markAsRead: async (id) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      set((state) => {
        const updated = state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
        const unread = updated.filter((n) => !n.isRead).length;
        return { notifications: updated, unreadCount: unread };
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.put('/notifications/read-all');
      set((state) => {
        const updated = state.notifications.map((n) => ({ ...n, isRead: true }));
        return { notifications: updated, unreadCount: 0 };
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  deleteNotification: async (id) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== id);
        const unread = updated.filter((n) => !n.isRead).length;
        return { notifications: updated, unreadCount: unread };
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  startPolling: (intervalMs = 30000) => {
    if (pollInterval) return;
    get().fetchNotifications();
    pollInterval = setInterval(() => {
      get().fetchNotifications();
    }, intervalMs);
  },

  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  },
}));

export default useNotificationStore;
