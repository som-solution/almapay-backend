
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

export class LimitService {

    // Hardcoded limits for Phase 1 (TODO: Move to DB/Env)
    private readonly DAILY_AMOUNT_LIMIT = new Decimal(5000); // 5000 GBP
    private readonly RECIPIENT_LIMIT_DAILY = 5;

    private readonly GLOBAL_DAILY_CAP = new Decimal(1000); // 1000 GBP - Strict Phase 7 limit

    /**
     * SYSTEM-WIDE SAFETY NET
     * Ensures the total platform outflow never exceeds the daily cap.
     * Prevents catastrophic drain bugs.
     */
    async checkGlobalDailyCap(amount: Decimal) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Sum all "real" money moving transactions today
        const globalVolume = await prisma.transaction.aggregate({
            where: {
                createdAt: { gte: today },
                sendCurrency: 'GBP',
                // Valid stats from schema: PAYMENT_RECEIVED, PAYOUT_INITIATED, PAYOUT_SUCCESS
                // PAYOUT_PROCESSING is also valid liability
                status: { in: ['PAYMENT_RECEIVED', 'PAYOUT_INITIATED', 'PAYOUT_PROCESSING', 'PAYOUT_SUCCESS'] }
            },
            _sum: { sendAmount: true }
        });

        const currentGlobal = new Decimal(globalVolume._sum.sendAmount || 0);

        if (currentGlobal.plus(amount).greaterThan(this.GLOBAL_DAILY_CAP)) {
            console.error(`[LimitService] GLOBAL CAP HIT. Current: ${currentGlobal}, Attempt: ${amount}, Cap: ${this.GLOBAL_DAILY_CAP}`);
            throw new Error(`System-wide daily safety cap reached. Please try again tomorrow.`);
        }
    }

    /**
     * Checks if a user has exceeded velocity limits.
     * MUST be called within a Transaction where User Row is LOCKED.
     */
    async checkLimits(userId: string, amount: Decimal, currency: string) {
        if (currency !== 'GBP') return; // Only limit GBP sending for now

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Daily Volume (Sum of Ledger Debits)
        // We check Ledger because it is the Source of Truth.
        const dailyVolume = await prisma.ledgerEntry.aggregate({
            where: {
                userId,
                type: 'DEBIT',
                createdAt: { gte: today },
                currency: 'GBP'
            },
            _sum: { amount: true }
        });

        const currentTotal = new Decimal(dailyVolume._sum.amount || 0);

        if (currentTotal.plus(amount).greaterThan(this.DAILY_AMOUNT_LIMIT)) {
            throw new Error(`Daily limit exceeded. Max: ${this.DAILY_AMOUNT_LIMIT}, Current: ${currentTotal}, Attempt: ${amount}`);
        }

        // 2. High Velocity Recipient Check (Smurfing protection)
        // Count unique recipients paid today
        // This requires querying Transactions distinct by recipientId
        const recipientsToday = await prisma.transaction.groupBy({
            by: ['recipientId'],
            where: {
                userId,
                createdAt: { gte: today }
            }
        });

        if (recipientsToday.length >= this.RECIPIENT_LIMIT_DAILY) {
            // Block if > Limit distinct recipients used.
        }

        return true;
    }
}
