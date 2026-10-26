import { Router } from 'express';
import {
  getAll,
  getById,
  getBySlug,
  create,
  update,
  remove
} from '../controllers/category.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Public Storefront Endpoints
router.get('/', getAll);
router.get('/slug/:slug', getBySlug);
router.get('/:id', getById);

// Administrator Management Endpoints
router.post('/', authenticate, authorize('admin'), create);
router.patch('/:id', authenticate, authorize('admin'), update);
router.delete('/:id', authenticate, authorize('admin'), remove);

export default router;