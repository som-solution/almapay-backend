import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transactionService';
import { AuditService } from '../services/auditService';
import { PrismaClient } from '@prisma/client';

const transactionService = new TransactionService();
const auditService = new AuditService();
const prisma = new PrismaClient();

export const getAllTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const transactions = await transactionService.getAllTransactions();
        res.json({ status: 'success', data: transactions });
    } catch (error) {
        next(error);
    }
};

export const retryPayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const ipAddress = Array.isArray(req.ip) ? req.ip[0] : req.ip;
        const adminId = req.user!.userId;

        // Pass adminId and ipAddress for audit logging
        await transactionService.retryPayout(id as string, adminId, ipAddress);

        // Additional audit log for admin action
        await auditService.logAction({
            action: 'TRANSACTION_RETRY',
            adminUserId: adminId,
            targetType: 'Transaction',
            targetId: id as string,
            ipAddress: ipAddress
        });

        res.json({ status: 'success', message: 'Payout retry initiated' });
    } catch (error) {
        next(error);
    }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.user.findMany();
        res.json({ status: 'success', data: users });
    } catch (error) {
        next(error);
    }
};

export const refundTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const ipAddress = Array.isArray(req.ip) ? req.ip[0] : req.ip;
        const adminId = req.user!.userId;

        // Pass adminId and ipAddress for audit logging
        const transaction = await transactionService.refundTransaction(id as string, adminId, ipAddress);

        // Additional audit log for admin action
        await auditService.logAction({
            action: 'TRANSACTION_REFUND',
            adminUserId: adminId,
            targetType: 'Transaction',
            targetId: id as string,
            details: { amount: transaction.amount.toString(), currency: transaction.currency },
            ipAddress: ipAddress
        });

        res.json({
            success: true,
            message: 'Transaction refunded successfully',
            transaction
        });
    } catch (error) {
        next(error);
    }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const logs = await auditService.getAllLogs();

        // Format logs for frontend
        const formattedLogs = logs.map(log => ({
            ...log,
            details: log.details ? JSON.parse(log.details) : null,
            createdAt: log.createdAt.toISOString()
        }));

        res.json({ status: 'success', data: formattedLogs });
    } catch (error) {
        next(error);
    }
};

export const getProviderCapabilities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { PROVIDER_CAPABILITIES } = require('../providers/providerCapabilities');
        res.json({ status: 'success', data: PROVIDER_CAPABILITIES });
    } catch (error) {
        next(error);
    }
};
