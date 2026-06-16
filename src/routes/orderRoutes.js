import express from 'express';
import {
  checkout,
  createOrderIssue,
  createPrepaidOrder,
  getOrders,
  updateOrderIssue,
  updateOrderStatus,
  verifyPrepaidOrder,
} from '../controllers/orderController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.post('/checkout', authenticate, checkout);
router.post('/prepaid/create', authenticate, createPrepaidOrder);
router.post('/prepaid/verify', authenticate, verifyPrepaidOrder);
router.get('/', authenticate, getOrders);
router.put('/:id/status', authenticate, updateOrderStatus);
router.post('/:id/issues', authenticate, createOrderIssue);
router.put('/issues/:issueId', authenticate, updateOrderIssue);

export default router;
