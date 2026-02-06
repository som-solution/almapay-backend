
import { PrismaClient, LedgerType, User } from '@prisma/client';
import { Decimal } from 'decimal.js';

import { prisma } from '../lib/prisma';

export class LedgerService {

    /**
     * The single entry point for all money movement.
     * Enforces:
     * 1. Atomic Locking of User Row
     * 2. Monotonic Sequencing
     * 3. Balance Checks (No negative balance for DEBIT)
     * 4. Idempotency (via composite key)
     * @param prismaClient Optional external transaction client
     */
    async recordEntry(
        txId: string,
        userId: string,
        type: LedgerType,
        amount: Decimal,
        currency: string,
        sourceRef?: string,
        prismaClient?: any
    ) {
        const execute = async (tx: any) => {
            // 1. LOCK User Row for Atomic Balance & Sequence
            await tx.$executeRaw`SELECT * FROM "User" WHERE id = ${userId} FOR UPDATE`;

            const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

            // 2. Validate Currency
            if (user.currency !== currency) {
                throw new Error(`Currency mismatch: User ${user.currency} vs Tx ${currency}`);
            }

            // 3. Determine new balance
            const currentBalance = new Decimal(user.balance);
            let newBalance = currentBalance;

            if (type === 'DEBIT' || type === 'CHARGEBACK') {
                newBalance = currentBalance.minus(amount);
            } else {
                newBalance = currentBalance.plus(amount);
            }

            // 4. Critical Safety Check
            if (type === 'DEBIT' && newBalance.lessThan(0)) {
                throw new Error('Insufficient Funds');
            }

            // 5. Generate Monotonic Sequence
            const sequence = await tx.ledgerEntry.count({
                where: { userId: userId, currency: currency }
            });
            const nextSequence = BigInt(sequence + 1);

            // 6. Write Ledger Entry
            const entry = await tx.ledgerEntry.create({
                data: {
                    transactionId: txId,
                    userId: userId,
                    type: type,
                    amount: new Decimal(amount),
                    currency: currency,
                    balanceAfter: newBalance,
                    sequence: nextSequence,
                    sourceRef: sourceRef
                }
            });

            // 7. Update User Cache
            await tx.user.update({
                where: { id: userId },
                data: { balance: newBalance }
            });

            return entry;
        };

        if (prismaClient) {
            return await execute(prismaClient);
        } else {
            return await prisma.$transaction(async (tx) => {
                return await execute(tx);
            });
        }
    }

    async getRealBalance(userId: string): Promise<Decimal> {
        const dbCredits = await prisma.ledgerEntry.aggregate({
            where: {
                userId,
                OR: [{ type: 'CREDIT_PAYOUT' }, { type: 'CREDIT_REFUND' }]
            },
            _sum: { amount: true }
        });

        const dbDebits = await prisma.ledgerEntry.aggregate({
            where: {
                userId,
                OR: [{ type: 'DEBIT' }, { type: 'CHARGEBACK' }]
            },
            _sum: { amount: true }
        });

        const credits = new Decimal(dbCredits._sum.amount || 0);
        const debits = new Decimal(dbDebits._sum.amount || 0);

        return credits.minus(debits);
    }

    async verifyConsistency(userId: string) {
        const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
        const realBalance = await this.getRealBalance(userId);
        const cachedBalance = new Decimal(user.balance);

        if (!realBalance.equals(cachedBalance)) {
            console.error(`[CRITICAL] Ledger Mismatch for User ${userId}. Cache: ${cachedBalance}, Real: ${realBalance}`);
            return false;
        }
        return true;
    }
}
