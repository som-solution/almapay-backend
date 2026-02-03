import { Router } from 'express';
import { registerDeviceToken, getNotifications, markAsRead } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/register', registerDeviceToken);
router.get('/', getNotifications);
router.post('/:id/read', markAsRead);

export default router;
