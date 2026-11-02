import { Router } from 'express';
import {
  fetchUserCart,
  addItemToCart,
  updateItemQuantity,
  removeItem,
  emptyCart
} from '../controllers/cart.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All cart endpoints require an authenticated user session
router.use(authenticate);

router.get('/', fetchUserCart);
router.post('/items', addItemToCart);
router.patch('/items/:productId', updateItemQuantity);
router.delete('/items/:productId', removeItem);
router.delete('/clear', emptyCart);

export default router;