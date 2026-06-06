import { logInteraction, logRecommendationEvent } from '../services/interactionService.js';

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
      metadata: req.body.metadata || {}
    });

    res.status(201).json({ message: 'Interaction logged', interaction });
  } catch (error) {
    console.error('Interaction Log Error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to log interaction' });
  }
};

export const createRecommendationEvent = async (req, res) => {
  try {
    const event = await logRecommendationEvent({
      recommendationId: req.body.recommendationId,
      productId: req.body.productId,
      eventType: req.body.eventType,
      userId: req.user?.userId,
      sessionId: req.body.sessionId
    });

    res.status(201).json({ message: 'Recommendation event logged', event });
  } catch (error) {
    console.error('Recommendation Event Error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to log recommendation event' });
  }
};
