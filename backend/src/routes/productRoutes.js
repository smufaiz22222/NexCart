import express from 'express';
import {
  getProductById,
  addReview,
  createProduct,
  getProducts,
  getMarketplaceProducts,
  updateProduct,
} from '../controllers/productController.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.get('/', getProducts);
router.post('/', requireWholesaler, createProduct);
router.get('/marketplace', authenticate, getMarketplaceProducts);
router.get('/:id', authenticate, getProductById);
router.put('/:id', requireWholesaler, updateProduct);
router.post('/:id/reviews', authenticate, addReview);

export default router;
