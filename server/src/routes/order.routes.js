import { Router } from 'express';
import { fetchUserOrders, fetchOrderById, checkout } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// All order endpoints require an authenticated user session
router.use(authenticate);

// Customer order history
router.get('/', fetchUserOrders);

// Atomic Checkout & Order Placement
router.post('/checkout', checkout);

// Customer order details (strictly scoped to owner)
router.get('/:id', fetchOrderById);

export default router;
