import { PrismaClient, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditService {
    async logAction(params: {
        action: AuditAction;
        adminUserId?: string;
        adminEmail?: string;
        targetType?: string;
        targetId?: string | number;
        details?: any;
        ipAddress?: string;
    }) {
        return await prisma.auditLog.create({
            data: {
                action: params.action,
                adminUserId: params.adminUserId,
                adminEmail: params.adminEmail,
                targetType: params.targetType,
                targetId: params.targetId?.toString(),
                details: params.details ? JSON.stringify(params.details) : null,
                ipAddress: params.ipAddress
            }
        });
    }

    /**
     * Log transaction status changes with full context
     * CRITICAL: Every state change MUST be logged
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

        return this.logAction({
            action: 'TRANSACTION_STATUS_CHANGE',
            adminUserId: params.actorType === 'ADMIN' ? params.actorId : undefined,
            targetType: 'Transaction',
            targetId: params.transactionId,
            details,
            ipAddress: params.ipAddress
        });
    }

    async getAllLogs() {
        return await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 logs
        });
    }

    async getLogsByAdmin(adminUserId: string) {
        return await prisma.auditLog.findMany({
            where: { adminUserId },
            orderBy: { createdAt: 'desc' }
        });
    }
}
