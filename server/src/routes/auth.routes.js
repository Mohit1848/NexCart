import { Router } from 'express';
import { register, login, getMe, logout } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.get('/me', authenticate, getMe);
router.post('/logout', logout);

export default router;