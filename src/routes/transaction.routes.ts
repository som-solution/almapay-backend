import { Router } from 'express';
import { sendMoney, getHistory, getBalance } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/send', sendMoney);
router.get('/', getHistory);
router.get('/balance', getBalance);

export default router;

