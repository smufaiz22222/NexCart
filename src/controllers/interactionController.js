import {
  logInteraction,
  logRecommendationEvent,
  logRecommendationEvents,
  getUserWishlist,
  toggleUserWishlist,
} from '../services/interactionService.js';

export const createInteraction = async (req, res) => {
  try {
    const interaction = await logInteraction({
      userId: req.user?.userId,
      sessionId: req.body.sessionId,
      productId: req.body.productId,
      action: req.body.action,
      quantity: req.body.quantity,
      source: req.body.source,
      recommendationId: req.body.recommendationId,
      metadata: req.body.metadata || {},
    });

    res.status(201).json({ message: 'Interaction logged', interaction });
  } catch (error) {
    console.error('Interaction Log Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to log interaction' });
  }
};

export const createRecommendationEvent = async (req, res) => {
  try {
    const event = await logRecommendationEvent({
      recommendationId: req.body.recommendationId,
      productId: req.body.productId,
      eventType: req.body.eventType,
      userId: req.user?.userId,
      sessionId: req.body.sessionId,
    });

    res.status(201).json({ message: 'Recommendation event logged', event });
  } catch (error) {
    console.error('Recommendation Event Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to log recommendation event' });
  }
};

export const createRecommendationEvents = async (req, res) => {
  try {
    const result = await logRecommendationEvents({
      recommendationId: req.body.recommendationId,
      events: req.body.events,
      userId: req.user?.userId,
      sessionId: req.body.sessionId,
    });

    res.status(201).json({
      message: 'Recommendation events logged',
      count: result.count,
    });
  } catch (error) {
    console.error('Recommendation Events Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to log recommendation events' });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User unauthorized' });
    }
    const wishlistItems = await getUserWishlist(userId);
    // extract product objects from the interaction records
    const products = wishlistItems.map((item) => item.product);
    res.status(200).json({ products });
  } catch (error) {
    console.error('Get Wishlist Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to retrieve wishlist' });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { productId } = req.body;
    if (!userId) {
      return res.status(401).json({ error: 'User unauthorized' });
    }
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    const result = await toggleUserWishlist({ userId, productId });
    res.status(200).json(result);
  } catch (error) {
    console.error('Toggle Wishlist Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to toggle wishlist' });
  }
};
