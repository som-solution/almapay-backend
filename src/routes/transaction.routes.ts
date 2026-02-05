import { Router } from 'express';
import { sendMoney, getHistory, getBalance, getTransactionById, lookupRecipient, getTransactionStatus, calculateTransfer, getTransactionReceipt } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public Routes
router.get('/calculate', calculateTransfer);

// Protected Routes
router.use(authenticate);

router.get('/:id/receipt', getTransactionReceipt);
router.get('/recipient/lookup', lookupRecipient);
router.post('/send', sendMoney);
router.get('/balance', getBalance);
router.get('/', getHistory);
router.get('/:id/status', getTransactionStatus);
router.get('/:id', getTransactionById);

export default router;

