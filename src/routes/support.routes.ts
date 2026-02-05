import { Router } from 'express';
import { contactSupport } from '../controllers/support.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/notify', contactSupport);

export default router;
