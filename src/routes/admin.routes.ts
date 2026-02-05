import { Router } from 'express';
import { getAllTransactions, retryPayout, getUsers, refundTransaction, getAuditLogs, disableUser, enableUser, cancelTransaction, runReconciliation, getReconciliationHistory, getOutboxPending, processOutboxEvent, getDisputes, resolveDispute, getProviderStatus, toggleProvider } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);


// Transactions
router.get('/transactions', getAllTransactions);
router.post('/transactions/:id/cancel', cancelTransaction);
router.post('/transactions/:id/retry', retryPayout);
router.post('/transactions/:id/refund', refundTransaction);

// Users
router.get('/users', getUsers);
router.post('/users/:id/disable', disableUser);
router.post('/users/:id/enable', enableUser);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

// Reconciliation
router.post('/reconciliation/run', runReconciliation);
router.get('/reconciliation/:provider', getReconciliationHistory);

// Outbox / Reliability
router.get('/outbox/pending', getOutboxPending);
router.post('/outbox/:id/process', processOutboxEvent);

// Disputes
router.get('/disputes', getDisputes);
router.post('/disputes/:id/resolve', resolveDispute); // e.g. body: { outcome: 'WON' }

// Providers
router.get('/providers/status', getProviderStatus);
router.post('/providers/:name/toggle', toggleProvider);

export default router;


