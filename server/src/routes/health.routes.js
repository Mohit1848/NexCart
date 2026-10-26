import { Router } from 'express';
import { getHealthStatus } from '../controllers/health.controller.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Check server health and readiness
 * @access  Public
 */
router.get('/', getHealthStatus);

export default router;
