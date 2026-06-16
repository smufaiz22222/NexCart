import express from 'express';
import { checkout, createPrepaidOrder, getOrders, updateOrderStatus, verifyPrepaidOrder } from '../controllers/orderController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.post('/checkout', authenticate, checkout);
router.post('/prepaid/create', authenticate, createPrepaidOrder);
router.post('/prepaid/verify', authenticate, verifyPrepaidOrder);
router.get('/', authenticate, getOrders);
router.put('/:id/status', authenticate, updateOrderStatus);

export default router;
