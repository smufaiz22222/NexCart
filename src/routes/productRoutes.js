import express from 'express';
import {
  getProductById,
  addReview,
  createProduct,
  getProducts,
  getMarketplaceProducts,
  updateProduct,
} from '../controllers/productController.js';
import { authenticate, optionalAuthenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, getProducts);
router.post('/', authenticate, requireWholesaler, createProduct);
router.get('/marketplace', optionalAuthenticate, getMarketplaceProducts);
router.get('/:id', optionalAuthenticate, getProductById);
router.put('/:id', authenticate, requireWholesaler, updateProduct);
router.post('/:id/reviews', authenticate, addReview);

export default router;
