import { Router } from 'express';
import { getAllTransactions, retryPayout, getUsers, refundTransaction, getAuditLogs, getProviderCapabilities } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/transactions', getAllTransactions);
router.get('/transactions/:id/trace', async (req, res, next) => {
    try {
        const { TransactionService } = require('../services/transactionService');
        const transactionService = new TransactionService();
        const logs = await transactionService.getTransactionHistory(req.params.id);
        res.json({ status: 'success', data: logs });
    } catch (error) {
        next(error);
    }
});
router.post('/transactions/:id/retry', retryPayout);
router.post('/transactions/:id/refund', refundTransaction);
router.get('/users', getUsers);
router.get('/audit-logs', getAuditLogs);
router.get('/provider-capabilities', getProviderCapabilities);

export default router;

