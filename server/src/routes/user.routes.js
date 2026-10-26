import { Router } from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Customer profile routes (All protected)
router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);
router.patch('/me/password', authenticate, changePassword);

// RBAC Protected Test Endpoint (Accessible by admin role only)
router.get('/admin-check', authenticate, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized: You have verified admin privileges',
    user: req.user
  });
});

export default router;