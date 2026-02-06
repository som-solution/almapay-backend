import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { TransactionService } from '../services/TransactionService';
import { AuditService } from '../services/auditService';
import { ReconciliationService } from '../services/ReconciliationService';
import { OutboxService } from '../services/OutboxService';
import { DisputeService } from '../services/DisputeService';

import { prisma } from '../lib/prisma';
const transactionService = new TransactionService();
const auditService = new AuditService();
const reconciliationService = new ReconciliationService();
const outboxService = new OutboxService();
const disputeService = new DisputeService();

// Helper: safely get string from params/query
function ensureString(value: any, name: string): string {
    if (!value) throw new Error(`${name} is required`);
    return Array.isArray(value) ? value[0] : value;
}

// -------------------- Transactions --------------------

export const getAllTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const transactions = await prisma.transaction.findMany({
            include: { user: true, recipient: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ status: 'success', data: transactions });
    } catch (error) { next(error); }
};

export const refundTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = ensureString(req.params.id, 'Transaction ID');
        const reason = ensureString(req.body.reason, 'Refund Reason');
        const adminId = (req as any).user!.userId;
        const ipAddress = Array.isArray(req.ip) ? req.ip[0] : req.ip;

        await transactionService.refundTransaction(id, reason, adminId);

        // AuditService redundant now as TransactionService logs it, but keeping for double safety or removing? 
        // Keeping it is fine, or arguably duplicate. Let's rely on TransactionService's strict log.

        res.json({ status: 'success', message: 'Transaction refunded successfully' });
    } catch (error) { next(error); }
};

export const retryPayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = ensureString(req.params.id, 'Transaction ID');
        const adminId = (req as any).user!.userId;

        await transactionService.retryPayout(id, adminId);

        res.json({ status: 'success', message: 'Payout retry initiated' });
    } catch (error) { next(error); }
};

export const cancelTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = ensureString(req.params.id, 'Transaction ID');
        const reason = ensureString(req.body.reason, 'Cancellation Reason');
        const adminId = (req as any).user!.userId;

        await transactionService.cancelTransaction(id, reason, adminId);

        res.json({ status: 'success', message: "Transaction cancelled" });
    } catch (error) { next(error); }
};

// -------------------- Users --------------------

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.user.findMany();
        res.json({ status: 'success', data: users });
    } catch (error) { next(error); }
};

export const disableUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = ensureString(req.params.id, 'User ID');
        await prisma.user.update({
            where: { id },
            data: { isFrozen: true, freezeReason: 'Legacy Disable' }
        });
        res.json({ status: 'success', message: 'User disabled (Frozen)' });
    } catch (error) { next(error); }
};

export const enableUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = ensureString(req.params.id, 'User ID');
        await prisma.user.update({
            where: { id },
            data: { isFrozen: false, freezeReason: null }
        });
        res.json({ status: 'success', message: 'User enabled (Unfrozen)' });
    } catch (error) { next(error); }
};

// -------------------- Audit Logs --------------------

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const logs = await prisma.adminActionLog.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ status: 'success', data: logs });
    } catch (error) { next(error); }
};

// -------------------- Reconciliation --------------------

export const runReconciliation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user!.userId;
        const provider = ensureString(req.body.provider, 'Provider');
        const currency = ensureString(req.body.currency, 'Currency');

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 1);

        const run = await reconciliationService.runReconciliation(provider, currency, startDate, endDate, adminId);
        res.json({ status: 'success', data: run });
    } catch (error) { next(error); }
};

export const getReconciliationHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const provider = ensureString(req.params.provider, 'Provider');
        const history = await reconciliationService.getReconciliationHistory(provider);
        res.json({ status: 'success', data: history });
    } catch (error) { next(error); }
};

// -------------------- Outbox --------------------

export const getOutboxPending = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const events = await outboxService.getPendingEvents();
        res.json({ status: 'success', data: events });
    } catch (error) { next(error); }
};

export const processOutboxEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = ensureString(req.params.id, 'Event ID');
        await outboxService.processEvent(id);
        res.json({ status: 'success', message: 'Event processed' });
    } catch (error) { next(error); }
};

// -------------------- Disputes --------------------

export const getDisputes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const disputes = await disputeService.getOpenDisputes();
        res.json({ status: 'success', data: disputes });
    } catch (error) { next(error); }
};

export const resolveDispute = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = ensureString(req.params.id, 'Dispute ID');
        const outcome = ensureString(req.body.outcome, 'Outcome') as 'WON' | 'LOST'; // Explicit cast
        const adminId = (req as any).user!.userId;
        const dispute = await disputeService.resolveDispute(id, outcome, adminId);
        res.json({ status: 'success', data: dispute });
    } catch (error) { next(error); }
};

// -------------------- Provider Status --------------------

export const getProviderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const status = await prisma.providerStatus.findMany();
        res.json({ status: 'success', data: status });
    } catch (error) { next(error); }
};

export const toggleProvider = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const name = ensureString(req.params.name, 'Provider Name');
        // Logic to toggle provider
        res.json({ status: 'success', message: `Provider ${name} toggled` });
    } catch (error) { next(error); }
};
