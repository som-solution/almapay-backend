
import { Request, Response, NextFunction } from 'express';
// import { FreezeService } from '../services/FreezeService'; // Legacy?
import { AuditService } from '../services/auditService';
import { PrismaClient } from '@prisma/client';
import { TransactionService } from '../services/TransactionService'; // PascalCase
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';

import { prisma } from '../lib/prisma';
// const freezeService = new FreezeService();
const auditService = new AuditService();
const transactionService = new TransactionService();

export class AdminSafetyController {

    // POST /api/v1/admin/users/:id/freeze
    // Roles: SUPER_ADMIN
    async freezeUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const adminId = (req as any).user.id;

            if (!reason) throw new AppError('Freeze reason is mandatory', 400);

            // Legacy FreezeService replacement
            await prisma.user.update({
                where: { id: id as string },
                data: { isFrozen: true, freezeReason: reason || "Admin Frozen" }
            });

            await auditService.logAction({
                action: 'FREEZE_USER',
                adminUserId: adminId,
                targetType: 'User',
                targetId: id as string,
                reason: reason,
                ipAddress: req.ip as string // Force string
            });

            res.status(200).json({ status: 'success', message: 'User frozen' });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/admin/transactions/:id/finalize
    // Roles: SUPER_ADMIN
    async finalizeTransaction(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { reason, providerRef } = req.body;
            const adminId = (req as any).user.id;

            if (!reason) throw new AppError('Justification is mandatory for manual finalization', 400);

            // Check for Disputes (TODO: Move to Service)
            // For now, Controller orchestrates safety checks before calling update
            // But ideally Service handles logic. 
            // Since TransactionService refactor didn't include 'finalizeManual', we do it here safely OR fail if complicated.
            // Let's rely on adding a method to TransactionService dynamicially or just using DB access if I had it.
            // But I only have TransactionService instance.
            // I should have implemented finalizeManual in TransactionService.
            // Workaround: Call transitionStatus? 
            // No, finalize is setting FIELDS, not just status.
            // I will implement a quick 'finalizeManual' in TransactionService via a PR/Change.
            // Wait, I can just use prisma client directly if I import it, OR add method.
            // Adding method is cleaner.

            // Call Service Method
            await transactionService.finalizeManual(id as string, reason, providerRef, adminId);

            res.status(200).json({ status: 'success', message: 'Transaction finalized manually' });

        } catch (error) {
            next(error);
        }
    }
}
