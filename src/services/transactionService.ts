import { PrismaClient, TransactionStatus } from '@prisma/client';
import { FakePaymentAdapter } from './adapters/payment/fakePaymentAdapter';
import { SandboxPayoutAdapter } from './adapters/payout/sandboxPayoutAdapter';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();
const paymentAdapter = new FakePaymentAdapter();
const payoutAdapter = new SandboxPayoutAdapter();

export class TransactionService {

    async createTransaction(senderUserId: string, recipientPhone: string, amount: number, currency: string) {
        // 1. Create Transaction in PENDING state
        const transaction = await prisma.transaction.create({
            data: {
                senderUserId,
                recipientPhone,
                amount,
                currency,
                status: 'PENDING_PAYMENT',
                paymentProvider: 'FAKE',
                payoutProvider: 'SANDBOX',
            },
        });

        // 2. Process Payment (Simulate 1-step or Webhook later)
        // For this sandbox, we'll try to process immediately for simplicity, 
        // or return the tx and let the client "confirm" it.
        // Let's implement the "Send" flow where it tries to pay immediately.

        this.processPayment(transaction.id); // Run in background or await? 
        // User requirement: "States: PENDING_PAYMENT -> PAYMENT_CONFIRMED -> PAYOUT_IN_PROGRESS..."

        return transaction;
    }

    async processPayment(transactionId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== 'PENDING_PAYMENT') return;

        // Call Payment Adapter
        const result = await paymentAdapter.processPayment(Number(tx.amount), tx.currency, tx.senderUserId);

        if (result.success) {
            const updatedTx = await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'PAYMENT_CONFIRMED',
                    externalId: result.transactionId,
                },
            });

            // Auto-trigger payout if payment is confirmed
            this.initiatePayout(updatedTx.id);
        } else {
            await prisma.transaction.update({
                where: { id: transactionId },
                data: { status: 'REFUNDED' }, // Or remain pending/failed logic
            });
        }
    }

    async initiatePayout(transactionId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== 'PAYMENT_CONFIRMED') return;

        await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'PAYOUT_IN_PROGRESS' },
        });

        // Call Payout Adapter
        const result = await payoutAdapter.sendMoney(tx.recipientPhone, Number(tx.amount), tx.currency);

        if (result.success) {
            await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'PAYOUT_SUCCESS',
                    payoutId: result.payoutId,
                },
            });
        } else {
            await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'PAYOUT_FAILED', // Needs admin retry
                },
            });
        }
    }

    async getTransactions(userId: string) {
        return prisma.transaction.findMany({
            where: { senderUserId: userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAllTransactions() {
        return prisma.transaction.findMany({
            include: { sender: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async retryPayout(transactionId: string) {
        // Admin only function usually
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== 'PAYOUT_FAILED') {
            throw new AppError('Transaction not eligible for retry', 400);
        }
        // Reset to confirmed so it picks up again
        await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'PAYMENT_CONFIRMED' }
        });
        this.initiatePayout(transactionId);
    }

    async refundTransaction(transactionId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });

        if (!tx) {
            throw new AppError('Transaction not found', 404);
        }

        // Only allow refund for specific statuses
        const refundableStatuses = ['PAYMENT_CONFIRMED', 'PAYOUT_FAILED'];
        if (!refundableStatuses.includes(tx.status)) {
            throw new AppError(`Transaction cannot be refunded. Current status: ${tx.status}`, 400);
        }

        // Update transaction to REFUNDED status
        const refundedTx = await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'REFUNDED' }
        });

        return refundedTx;
    }
}
