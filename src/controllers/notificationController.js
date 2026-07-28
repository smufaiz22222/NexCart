import * as notificationService from '../services/notificationService.js';

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = await notificationService.getNotifications(userId);
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error('Get Notifications Controller Error:', error);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await notificationService.markAsRead(id, userId);
    res.status(200).json({ message: 'Notification marked as read successfully' });
  } catch (error) {
    console.error('Mark As Read Controller Error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await notificationService.markAllAsRead(userId);
    res.status(200).json({ message: 'All notifications marked as read successfully' });
  } catch (error) {
    console.error('Mark All As Read Controller Error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await notificationService.deleteNotification(id, userId);
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete Notification Controller Error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
