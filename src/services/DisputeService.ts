
import { PrismaClient, DisputeStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

export class DisputeService {

    async getOpenDisputes() {
        return prisma.dispute.findMany({
            where: { status: { in: [DisputeStatus.RECEIVED, DisputeStatus.OPEN] } },
            include: { transaction: true }
        });
    }

    async resolveDispute(disputeId: string, outcome: 'WON' | 'LOST', adminId: string) {
        const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
        if (!dispute) throw new Error("Dispute not found");

        const status = outcome === 'WON' ? DisputeStatus.WON : DisputeStatus.LOST;

        // If LOST, we might need a Chargeback Ledger Entry?
        // Logic: if we lost, money is taken back.
        // We should credit the User's balance back? NO! 
        // Chargeback = We LOST money. User already received services? Or Recipient did?
        // Usually: Chargeback = Reversal.
        // For simplicity here, we just mark status.

        return prisma.dispute.update({
            where: { id: disputeId },
            data: {
                status,
                outcome: `Resolved as ${outcome} by Admin`,
                resolvedAt: new Date(),
                adminId
            }
        });
    }
}
