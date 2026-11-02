import { Router } from 'express';
import {
  fetchUserWishlist,
  addItemToWishlist,
  removeItem,
  moveToCart
} from '../controllers/wishlist.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/', fetchUserWishlist);
router.post('/items', addItemToWishlist);
router.delete('/items/:productId', removeItem);
router.post('/items/:productId/move-to-cart', moveToCart);

export default router;