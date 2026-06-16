import express from 'express';
import {
  createAddress,
  deleteAddress,
  getAddresses,
  lookupPincode,
  setDefaultAddress,
  updateAddress,
} from '../controllers/addressController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate, requireRoles('CUSTOMER'));

router.get('/', getAddresses);
router.get('/pincode/:postalCode', lookupPincode);
router.post('/', createAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

export default router;
