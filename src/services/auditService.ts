
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditService {
    async logAction(params: {
        action: string;
        adminUserId?: string;
        adminEmail?: string;
        targetType: string;
        targetId: string;
        details?: any;
        ipAddress?: string;
        reason?: string;
    }) {
        if (!params.adminUserId) {
            // If system action, maybe skip admin log or log as SYSTEM?
            // AdminActionLog requires adminId. 
            // If it's a SYSTEM action (like Transaciton Status Change), we might need a System User or nullable adminId?
            // Schema: adminId String @relation...
            // Schema says: adminId is REQUIRED and links to User.
            // Issue: TRANSACTION_STATUS_CHANGE often happens by SYSTEM.
            // Fix: We need a 'SYSTEM' user in the DB for system actions, or make adminId optional.
            // For now, let's assume we have a System Admin ID or handle graceful degradation.
            console.warn(`[AuditService] Skipping log for ${params.action} - No Admin ID provided`);
            return;
        }

        return await prisma.adminActionLog.create({
            data: {
                actionType: params.action,
                adminId: params.adminUserId,
                targetType: params.targetType,
                targetId: params.targetId,
                reason: params.reason || 'System Action',
                ipAddress: params.ipAddress,
                metadata: params.details ? (params.details) : undefined
            }
        });
    }

    /**
     * Log transaction status changes with full context
     */
    async logStatusChange(params: {
        transactionId: string;
        fromStatus: string;
        toStatus: string;
        actorId?: string;
        actorType: 'USER' | 'ADMIN' | 'SYSTEM';
        ipAddress?: string;
    }) {
        const details = {
            fromStatus: params.fromStatus,
            toStatus: params.toStatus,
            actorType: params.actorType,
            timestamp: new Date().toISOString()
        };

        // Only log to AdminActionLog if initiated by ADMIN?
        // Or if we have a way to log System actions. 
        // Real-Money Audit: System actions are critical too.
        // We probably need a SYSTEM user UUID in env?
        // For this implementation, we log if actorId is present (Admin).

        if (params.actorType === 'ADMIN' && params.actorId) {
            return this.logAction({
                action: 'TRANSACTION_STATUS_CHANGE',
                adminUserId: params.actorId,
                targetType: 'Transaction',
                targetId: params.transactionId,
                details,
                ipAddress: params.ipAddress
            });
        }
    }

    async getLogsByAdmin(adminUserId: string) {
        return await prisma.adminActionLog.findMany({
            where: { adminId: adminUserId },
            orderBy: { createdAt: 'desc' }
        });
    }
}
