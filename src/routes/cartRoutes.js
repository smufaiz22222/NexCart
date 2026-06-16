import express from 'express';
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../controllers/cartController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate, requireRoles('CUSTOMER'));

router.get('/', getCart);
router.post('/items', addCartItem);
router.patch('/items/:id', updateCartItem);
router.delete('/items/:id', removeCartItem);
router.delete('/', clearCart);

export default router;
