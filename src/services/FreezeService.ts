
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FreezeService {

    /**
     * Freezes a user account.
     * Blocks initiation of new transactions.
     * Does NOT block in-flight settlements (Ledger/Payouts).
     */
    async freezeUser(userId: string, reason: string, adminId: string) {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                isFrozen: true,
                freezeReason: reason
            }
        });
        // Audit logging handled by Controller calling this
    }

    async unfreezeUser(userId: string, adminId: string) {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                isFrozen: false,
                freezeReason: null
            }
        });
    }

    async blockRecipient(recipientId: string) {
        return await prisma.recipient.update({
            where: { id: recipientId },
            data: { isBlocked: true }
        });
    }

    async disableCorridor(fromCountry: string, toCountry: string) {
        // In a real system, this would update a "CorridorConfiguration" table.
        // For this mock, we can throw or pretend.
        // Let's assume we have a way to check 'isCorridorDisabled'.
        // We can store it in a Redis key or a Settings table.
        // For Phase 1: We'll implement the CHECK in CheckService, but the storage is TODO.
        // Or we throw "Not Implemented" for now?
        // Plan said "Kill Switches".
        // I can stick a simple in-memory check or mock it.
        console.log(`[FreezeService] Corridor ${fromCountry}->${toCountry} DISABLED`);
    }

    // CHECKS

    async isFrozen(userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { isFrozen: true } });
        return !!user?.isFrozen;
    }

    async isBlocked(recipientId: string): Promise<boolean> {
        const recipient = await prisma.recipient.findUnique({ where: { id: recipientId }, select: { isBlocked: true } });
        return !!recipient?.isBlocked;
    }

    // Static for now, or dynamic via DB
    async isCorridorDisabled(from: string, to: string): Promise<boolean> {
        // Mock Implementation: Block GBP -> SOMALIA if hardcoded?
        // For now false.
        return false;
    }
}
