import { Router } from 'express';
import { getAllTransactions, retryPayout, getUsers, refundTransaction, getAuditLogs } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/transactions', getAllTransactions);
router.post('/transactions/:id/retry', retryPayout);
router.post('/transactions/:id/refund', refundTransaction);
router.get('/users', getUsers);
router.get('/audit-logs', getAuditLogs);

export default router;

