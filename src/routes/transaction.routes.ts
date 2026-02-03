import { Router } from 'express';
import { sendMoney, getHistory, getBalance, getTransactionById, lookupRecipient } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/recipient/lookup', lookupRecipient);
router.post('/send', sendMoney);
router.get('/balance', getBalance);
router.get('/', getHistory);
router.get('/:id', getTransactionById);

export default router;

