import express from 'express';
import {
  approveReturn,
  cancelOrderItem,
  checkout,
  createDisputeSellerNote,
  createItemDispute,
  createOrderIssue,
  createPrepaidOrder,
  getOrders,
  receiveReturn,
  rejectReturn,
  resolveOrderItemDispute,
  requestReturn,
  retryReturnRefund,
  retryOrderItemRefund,
  updateDisputeStatus,
  updateOrderIssue,
  updateOrderStatus,
  verifyPrepaidOrder,
  verifyBankPayment,
} from '../controllers/orderController.js';
import { receiveRazorpayWebhook } from '../controllers/paymentWebhookController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/razorpay/webhook', receiveRazorpayWebhook);

router.use(authenticate);
router.post('/checkout', checkout);
router.post('/prepaid/create', createPrepaidOrder);
router.post('/prepaid/verify', verifyPrepaidOrder);
router.get('/', getOrders);
router.post('/:id/items/:itemId/cancel', cancelOrderItem);
router.post('/:id/items/:itemId/retry-refund', retryOrderItemRefund);
router.post('/:id/items/:itemId/request-return', requestReturn);
router.post('/:id/items/:itemId/approve-return', approveReturn);
router.post('/:id/items/:itemId/reject-return', rejectReturn);
router.post('/:id/items/:itemId/receive-return', receiveReturn);
router.post('/:id/items/:itemId/retry-return-refund', retryReturnRefund);
router.post('/:orderId/items/:itemId/disputes', createItemDispute);
router.patch('/:orderId/items/:itemId/disputes/:disputeId/status', updateDisputeStatus);
router.patch('/:orderId/items/:itemId/disputes/:disputeId/resolve', resolveOrderItemDispute);
router.post('/:orderId/items/:itemId/disputes/:disputeId/internal-notes', createDisputeSellerNote);
router.put('/:id/status', updateOrderStatus);
router.post('/:id/verify-bank-payment', verifyBankPayment);
router.post('/:id/issues', createOrderIssue);
router.put('/issues/:issueId', updateOrderIssue);

export default router;
