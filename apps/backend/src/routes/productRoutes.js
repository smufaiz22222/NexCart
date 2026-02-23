import express from 'express';
import { createProduct, getProducts, getMarketplaceProducts } from '../controllers/productController.js';
import { authenticate, requireWholesaler } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply the authentication and tenant-isolation middlewares to ALL routes in this file
router.use(authenticate);
// router.use(requireWholesaler);

// Route: POST /api/products
// Desc: Create a new product for the logged-in wholesaler
// router.post('/', createProduct);

// Route: GET /api/products
// Desc: Get all products for the logged-in wholesaler
router.get('/', getProducts);
router.post('/', requireWholesaler, createProduct);
router.get('/marketplace', authenticate, getMarketplaceProducts);
export default router;