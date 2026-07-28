import express from 'express';
import {
  addB2BCartItem,
  clearB2BCart,
  getB2BCart,
  removeB2BCartItem,
  updateB2BCartItem,
} from '../controllers/b2bCartController.js';
import { b2bCheckout } from '../controllers/b2bCheckoutController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getB2BCart);
router.post('/items', addB2BCartItem);
router.patch('/items/:id', updateB2BCartItem);
router.delete('/items/:id', removeB2BCartItem);
router.delete('/', clearB2BCart);
router.post('/checkout', b2bCheckout);

export default router;
