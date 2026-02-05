import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// Token management
import { login, register, getProfile, updateProfile, adminLogin, refreshToken, logout, changePassword, forgotPassword, resetPassword } from '../controllers/auth.controller';

// User authentication
router.post('/login', login);
router.post('/register', register);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Admin authentication (separate endpoint for security)
router.post('/admin/login', adminLogin);

// Shared profile endpoint
router.get('/me', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;
