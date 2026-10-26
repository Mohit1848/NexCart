import { Router } from 'express';
import { getHealthStatus, getReadinessStatus } from '../controllers/health.controller.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Liveness check (process status)
 * @access  Public
 */
router.get('/', getHealthStatus);

/**
 * @route   GET /api/health/ready
 * @desc    Readiness check (database connectivity status)
 * @access  Public
 */
router.get('/ready', getReadinessStatus);

export default router;