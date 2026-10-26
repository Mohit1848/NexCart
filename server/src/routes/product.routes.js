import { Router } from 'express';
import {
  listProducts,
  getById,
  getBySlug,
  create,
  update,
  remove
} from '../controllers/product.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Public Customer Storefront Endpoints
router.get('/', listProducts);
router.get('/slug/:slug', getBySlug);
router.get('/:id', getById);

// Administrator Product Management Endpoints
router.post('/', authenticate, authorize('admin'), create);
router.patch('/:id', authenticate, authorize('admin'), update);
router.delete('/:id', authenticate, authorize('admin'), remove);

export default router;