import { handleRazorpayWebhook } from '../services/razorpayWebhookService.js';

export const receiveRazorpayWebhook = async (req, res) => {
  try {
    const result = await handleRazorpayWebhook({
      rawBody: req.body,
      signature: req.headers['x-razorpay-signature'],
    });

    res.status(200).json({
      received: true,
      event: result.event,
      handled: result.handled,
      reason: result.reason || null,
    });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    res.status(error.statusCode || 400).json({
      error: error.message || 'Failed to process Razorpay webhook',
    });
  }
};
