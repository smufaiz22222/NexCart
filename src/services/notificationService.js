import { prisma } from '../config/db.js';

/**
 * Resolves a Wholesaler profile ID to its associated User ID.
 * @param {string} wholesalerId
 * @param {object} [tx] Optional Prisma client
 * @returns {Promise<string|null>}
 */
export const getUserIdFromWholesalerId = async (wholesalerId, tx) => {
  const db = tx || prisma;
  const wholesaler = await db.wholesaler.findUnique({
    where: { id: wholesalerId },
    select: { userId: true },
  });
  return wholesaler ? wholesaler.userId : null;
};

/**
 * Create a new notification for a specific user.
 * @param {string} userId
 * @param {object} data
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} data.type
 * @param {string} [data.link]
 * @param {object} [tx] Optional Prisma transaction client
 */
export const createNotification = async (userId, { title, message, type, link }, tx) => {
  const db = tx || prisma;

  // Verify that the user exists to prevent foreign key violations (common with mock test data)
  const userExists = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userExists) {
    console.warn(`Skipped notification. User ID not found in database: ${userId}`);
    return null;
  }

  return db.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
    },
  });
};

/**
 * Create a new notification for a wholesaler using their wholesaler profile ID.
 * @param {string} wholesalerId
 * @param {object} data
 * @param {string} data.title
 * @param {string} data.message
 * @param {string} data.type
 * @param {string} [data.link]
 * @param {object} [tx] Optional Prisma transaction client
 */
export const createWholesalerNotification = async (wholesalerId, data, tx) => {
  const userId = await getUserIdFromWholesalerId(wholesalerId, tx);
  if (!userId) {
    console.error(`Could not resolve user ID for wholesaler: ${wholesalerId}`);
    return null;
  }
  return createNotification(userId, data, tx);
};

/**
 * Fetch all notifications for a specific user, sorted by creation date descending.
 * @param {string} userId
 */
export const getNotifications = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

/**
 * Fetch the count of unread notifications for a user.
 * @param {string} userId
 */
export const getUnreadCount = async (userId) => {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
};

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 * @param {string} userId
 */
export const markAsRead = async (notificationId, userId) => {
  return prisma.notification.update({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
};

/**
 * Mark all notifications for a user as read.
 * @param {string} userId
 */
export const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

/**
 * Delete a specific notification.
 * @param {string} notificationId
 * @param {string} userId
 */
export const deleteNotification = async (notificationId, userId) => {
  return prisma.notification.delete({
    where: { id: notificationId, userId },
  });
};

/**
 * Checks product stock level and creates a low stock alert for the wholesaler if necessary.
 * Prevents spamming alerts by checking if a stock alert was already sent in the last 24 hours.
 * @param {string} productId
 * @param {object} [tx] Optional Prisma transaction client
 */
export const checkAndNotifyLowStock = async (productId, tx) => {
  const db = tx || prisma;

  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      currentStock: true,
      minStock: true,
      wholesaler: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!product || !product.wholesaler?.userId) return;

  if (product.currentStock <= product.minStock) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Check if an alert was sent in the last 24 hours for this product
    const existingNotification = await db.notification.findFirst({
      where: {
        userId: product.wholesaler.userId,
        type: 'STOCK_ALERT',
        link: '/wholesaler/products',
        createdAt: { gte: yesterday },
        message: { contains: `"${product.name}"` },
      },
    });

    if (!existingNotification) {
      await db.notification.create({
        data: {
          userId: product.wholesaler.userId,
          title: 'Low Stock Alert',
          message: `Product "${product.name}" has reached low stock (${product.currentStock} units remaining).`,
          type: 'STOCK_ALERT',
          link: '/wholesaler/products',
        },
      });
    }
  }
};
