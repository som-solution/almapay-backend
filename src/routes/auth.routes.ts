import { Router } from 'express';
import { login, register, getProfile, adminLogin } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// User authentication
router.post('/login', login);
router.post('/register', register);

// Admin authentication (separate endpoint for security)
router.post('/admin/login', adminLogin);

// Shared profile endpoint
router.get('/me', authenticate, getProfile);

export default router;
