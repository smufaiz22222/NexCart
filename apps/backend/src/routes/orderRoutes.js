import express from 'express';
import { checkout, getOrders, updateOrderStatus } from '../controllers/orderController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply base authentication to make sure the user is logged in

// Route: POST /api/orders
// Desc: Place a new order (Deducts stock, creates invoice, updates ledger)
router.post('/checkout', authenticate, checkout);
router.get('/', authenticate, getOrders);
router.put('/:id/status', authenticate, updateOrderStatus);

// (We can add a GET route here later for Customers to view their order history!)

export default router;