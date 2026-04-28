import express from 'express';
import { checkout, getOrders, updateOrderStatus } from '../controllers/orderController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.post('/checkout', authenticate, checkout);
router.get('/', authenticate, getOrders);
router.put('/:id/status', authenticate, updateOrderStatus);

export default router;
