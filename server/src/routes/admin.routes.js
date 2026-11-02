import { Router } from 'express';
import {
  fetchMetrics,
  fetchProducts,
  updateStock,
  toggleStatus
} from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Strict RBAC: All admin routes require authenticated session with 'admin' role
router.use(authenticate, authorize('admin'));

router.get('/metrics', fetchMetrics);
router.get('/products', fetchProducts);
router.patch('/products/:id/stock', updateStock);
router.patch('/products/:id/toggle-status', toggleStatus);

export default router;