import express from 'express';
import {
  approveReturn,
  cancelOrderItem,
  checkout,
  createOrderIssue,
  createPrepaidOrder,
  getOrders,
  receiveReturn,
  rejectReturn,
  requestReturn,
  retryReturnRefund,
  retryOrderItemRefund,
  updateOrderIssue,
  updateOrderStatus,
  verifyPrepaidOrder,
} from '../controllers/orderController.js';
import { receiveRazorpayWebhook } from '../controllers/paymentWebhookController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/razorpay/webhook', receiveRazorpayWebhook);

router.use(authenticate);
router.post('/checkout', authenticate, checkout);
router.post('/prepaid/create', authenticate, createPrepaidOrder);
router.post('/prepaid/verify', authenticate, verifyPrepaidOrder);
router.get('/', authenticate, getOrders);
router.post('/:id/items/:itemId/cancel', authenticate, cancelOrderItem);
router.post('/:id/items/:itemId/retry-refund', authenticate, retryOrderItemRefund);
router.post('/:id/items/:itemId/request-return', authenticate, requestReturn);
router.post('/:id/items/:itemId/approve-return', authenticate, approveReturn);
router.post('/:id/items/:itemId/reject-return', authenticate, rejectReturn);
router.post('/:id/items/:itemId/receive-return', authenticate, receiveReturn);
router.post('/:id/items/:itemId/retry-return-refund', authenticate, retryReturnRefund);
router.put('/:id/status', authenticate, updateOrderStatus);
router.post('/:id/issues', authenticate, createOrderIssue);
router.put('/issues/:issueId', authenticate, updateOrderIssue);

export default router;
