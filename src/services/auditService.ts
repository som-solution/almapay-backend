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
