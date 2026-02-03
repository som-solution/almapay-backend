import { PrismaClient, TransactionStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import {
    assertTransitionAllowed,
    canRetry,
    canRefund,
    InvalidStateTransitionError
} from '../domain/transactionStateMachine';
import { AuditService } from './auditService';
import { getPaymentProvider, getPayoutProvider } from '../providers/providerFactory';
import { mapToUserContract } from '../utils/transactionMapper';
import { NotificationService } from './notificationService';
import { RateService } from './rateService';

const prisma = new PrismaClient();
const auditService = new AuditService();

export class TransactionService {
    private notificationService = new NotificationService();

    /**
     * CRITICAL: Private method to transition status with guards and audit logging
     * All status changes MUST go through this method
     */
    private async transitionStatus(
        transactionId: string,
        newStatus: TransactionStatus,
        actorId?: string,
        actorType: 'USER' | 'ADMIN' | 'SYSTEM' = 'SYSTEM',
        ipAddress?: string
    ) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx) {
            throw new AppError('Transaction not found', 404);
        }

        const oldStatus = tx.status;

        // ENFORCE STATE MACHINE (Critical!)
        assertTransitionAllowed(oldStatus, newStatus);

        // Update transaction
        console.log(`[STATUS_TRACE] ${transactionId}: ${oldStatus} -> ${newStatus}`);
        const updatedTx = await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: newStatus }
        });

        // Log state change for audit trail
        await auditService.logStatusChange({
            transactionId,
            fromStatus: oldStatus,
            toStatus: newStatus,
            actorId,
            actorType,
            ipAddress
        });

        return updatedTx;
    }

    async createTransaction(senderUserId: string, recipientPhone: string, amount: number, currency: string, idempotencyKey?: string, fundingSource: string = 'WALLET', sendingReason?: string) {
        // 1. Check Balance & Deduct (Atomic) - Only if funding from internal WALLET
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: senderUserId } });
            if (!user) throw new AppError('User not found', 404);

            // Compliance check: > 300 GBP requires reason
            if (currency === 'GBP' && amount > 300 && !sendingReason) {
                throw new AppError('Compliance: Transactions over £300 require a reason for sending.', 400);
            }

            if (fundingSource === 'WALLET') {
                // user.balance is already a Decimal thanks to Prisma
                if (user.balance.lessThan(amount)) {
                    throw new AppError('Insufficient balance', 400);
                }

                // Deduct balance immediately
                await tx.user.update({
                    where: { id: senderUserId },
                    data: { balance: { decrement: amount } }
                });
            } else {
                console.log(`[TransactionService] Bypassing balance check for funding source: ${fundingSource}`);
            }

            // 2. Create Transaction in CREATED state
            const baseCurrency = process.env.BASE_CURRENCY || 'GBP';
            const exchangeRate = await RateService.getRate(baseCurrency, 'KES');
            const fees = Number(process.env.TRANSACTION_FEE) || 2.0;
            const netAmount = amount; // The amount to be converted
            const totalAmount = amount + fees; // The amount charged to card/balance
            const recipientAmount = amount * exchangeRate;

            const transaction = await tx.transaction.create({
                data: {
                    senderUserId,
                    recipientPhone,
                    amount: netAmount,
                    currency: baseCurrency,
                    idempotencyKey,
                    exchangeRate: exchangeRate,
                    fees: fees,
                    discount: 0.0,
                    totalAmount: totalAmount,
                    recipientCountry: 'KE',
                    recipientCurrency: 'KES',
                    recipientAmount: recipientAmount,
                    status: TransactionStatus.CREATED,
                    sendingReason: sendingReason,
                },
            });

            // 3. Trigger async processing
            return transaction;
        }).then(async (transaction: any) => {
            // 4. Immediately transition to PAYMENT_PENDING and process
            await this.transitionStatus(
                transaction.id,
                TransactionStatus.PAYMENT_PENDING,
                senderUserId,
                'USER'
            );

            // 5. Process payment
            // For mobile, we might need to wait for the clientSecret
            const result = await this.processPayment(transaction.id);

            return {
                ...transaction,
                clientSecret: result?.clientSecret
            };
        });
    }

    async processPayment(transactionId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== TransactionStatus.PAYMENT_PENDING) return;

        try {
            // Get payment provider from factory
            const paymentProvider = getPaymentProvider();

            // Initiate payment with provider
            console.log(`[PAYMENT_TRACE] Triggering initiatePayment for tx ${transactionId}`);
            const result = await paymentProvider.initiatePayment({
                transactionId,
                amount: Number(tx.amount),
                currency: tx.currency,
                customer: {
                    name: tx.senderUserId
                }
            });
            console.log(`[PAYMENT_TRACE] Provider responded with ref: ${result.providerReference}`);

            // Store provider details
            const updated = await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    paymentProvider: paymentProvider.name,
                    paymentProviderRef: result.providerReference
                }
            });

            return {
                transaction: updated,
                clientSecret: result.clientSecret
            };

        } catch (error) {
            console.error(`[ProcessPayment] Error for tx ${transactionId}:`, error);

            // Transition: PAYMENT_PENDING → PAYMENT_FAILED
            const updatedTx = await this.transitionStatus(
                transactionId,
                TransactionStatus.PAYMENT_FAILED,
                undefined,
                'SYSTEM'
            );

            // AUTO-REFUND: Return money to user
            await prisma.user.update({
                where: { id: tx.senderUserId },
                data: { balance: { increment: tx.amount } }
            });

            console.log(`[AutoRefund] Refunded ${tx.amount} to user ${tx.senderUserId} for tx ${transactionId}`);

            // Notify User
            await this.notificationService.notifyTransactionUpdate(updatedTx.senderUserId, updatedTx);
        }
    }

    async initiatePayout(transactionId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.status !== TransactionStatus.PAYMENT_SUCCESS) return;

        // Transition: PAYMENT_SUCCESS → PAYOUT_PENDING
        await this.transitionStatus(
            transactionId,
            TransactionStatus.PAYOUT_PENDING,
            undefined,
            'SYSTEM'
        );

        // Get payout provider from factory
        const payoutProvider = getPayoutProvider();

        // Initiate payout with provider
        console.log(`[PAYOUT_TRACE] Triggering initiatePayout for tx ${transactionId}`);
        const result = await payoutProvider.initiatePayout({
            transactionId,
            amount: Number(tx.amount),
            currency: tx.currency,
            recipient: {
                phone: tx.recipientPhone,
                country: 'KE'  // TODO: Get from transaction/user data
            }
        });
        console.log(`[PAYOUT_TRACE] Provider responded with ref: ${result.providerReference}`);

        // Store provider details
        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                payoutProvider: payoutProvider.name,
                payoutProviderRef: result.providerReference
            }
        });

        // Note: Success will come via webhook (async)
    }

    async getTransactions(userId: string) {
        const transactions = await prisma.transaction.findMany({
            where: { senderUserId: userId },
            orderBy: { createdAt: 'desc' },
        });

        return transactions.map(mapToUserContract);
    }

    async getTransactionById(transactionId: string, userId: string) {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        // Security check: Ensure transaction belongs to user
        if (!transaction || transaction.senderUserId !== userId) {
            return null;
        }

        return mapToUserContract(transaction);
    }

    async getAllTransactions() {
        return prisma.transaction.findMany({
            include: { sender: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async retryPayout(transactionId: string, adminId?: string, ipAddress?: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });

        if (!tx) {
            throw new AppError('Transaction not found', 404);
        }

        // Check if retry is allowed
        if (!canRetry(tx.status)) {
            throw new InvalidStateTransitionError(
                `Cannot retry transaction in ${tx.status} status. Only PAYMENT_FAILED or PAYOUT_FAILED can be retried.`
            );
        }

        if (tx.status === TransactionStatus.PAYOUT_FAILED) {
            // Transition: PAYOUT_FAILED → PAYOUT_PENDING
            await this.transitionStatus(
                transactionId,
                TransactionStatus.PAYOUT_PENDING,
                adminId,
                'ADMIN',
                ipAddress
            );

            // Retry payout
            this.initiatePayout(transactionId);
        } else if (tx.status === TransactionStatus.PAYMENT_FAILED) {
            // Transition: PAYMENT_FAILED → PAYMENT_PENDING
            await this.transitionStatus(
                transactionId,
                TransactionStatus.PAYMENT_PENDING,
                adminId,
                'ADMIN',
                ipAddress
            );

            // Retry payment
            this.processPayment(transactionId);
        }
    }

    async refundTransaction(transactionId: string, adminId?: string, ipAddress?: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });

        if (!tx) {
            throw new AppError('Transaction not found', 404);
        }

        // CRITICAL: Check if refund is allowed
        if (!canRefund(tx.status)) {
            throw new InvalidStateTransitionError(
                `Cannot refund transaction in ${tx.status} status. ` +
                `Only PAYOUT_FAILED transactions can be refunded. ` +
                `Successful payouts are final and cannot be reversed.`
            );
        }

        // Transition: PAYOUT_FAILED → REFUND_PENDING
        await this.transitionStatus(
            transactionId,
            TransactionStatus.REFUND_PENDING,
            adminId,
            'ADMIN',
            ipAddress
        );

        // Process refund (simulated for sandbox)
        // In production, this would call payment provider's refund API

        // Transition: REFUND_PENDING → REFUNDED (final)
        const refundedTx = await this.transitionStatus(
            transactionId,
            TransactionStatus.REFUNDED,
            adminId,
            'ADMIN',
            ipAddress
        );

        return refundedTx;
    }

    async getTransactionHistory(transactionId: string) {
        const logs = await prisma.auditLog.findMany({
            where: {
                targetType: 'Transaction',
                targetId: transactionId,
                action: 'TRANSACTION_STATUS_CHANGE'
            },
            orderBy: { createdAt: 'asc' }
        });

        return logs.map(log => ({
            ...log,
            details: log.details ? JSON.parse(log.details) : null
        }));
    }

    /**
     * WEBHOOK HANDLERS (Called by sandbox provider webhooks)
     */

    async handlePaymentSuccess(transactionId: string) {
        console.log(`[WEBHOOK_TRACE] handlePaymentSuccess called for tx ${transactionId}`);
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx) {
            console.error(`[WEBHOOK_TRACE] Transaction ${transactionId} not found!`);
            throw new AppError('Transaction not found', 404);
        }

        // Only process if in PAYMENT_PENDING state
        if (tx.status !== TransactionStatus.PAYMENT_PENDING) {
            console.warn(`[WEBHOOK_TRACE] Transaction ${transactionId} is in ${tx.status}, expected PAYMENT_PENDING. Skipping.`);
            return;
        }

        // Transition: PAYMENT_PENDING → PAYMENT_SUCCESS
        await this.transitionStatus(
            transactionId,
            TransactionStatus.PAYMENT_SUCCESS,
            undefined,
            'SYSTEM'
        );

        // Auto-trigger payout
        console.log(`[WEBHOOK_TRACE] Auto-triggering initiatePayout for tx ${transactionId}`);
        await this.initiatePayout(transactionId);
    }

    async handlePaymentFailure(transactionId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx) {
            throw new AppError('Transaction not found', 404);
        }

        // Only process if in PAYMENT_PENDING state
        if (tx.status !== TransactionStatus.PAYMENT_PENDING) {
            console.warn(`[Payment Failed] Transaction ${transactionId} is in ${tx.status}, expected PAYMENT_PENDING`);
            return;
        }

        // Transition: PAYMENT_PENDING → PAYMENT_FAILED
        const updatedTx = await this.transitionStatus(
            transactionId,
            TransactionStatus.PAYMENT_FAILED,
            undefined,
            'SYSTEM'
        );

        // Notify User
        await this.notificationService.notifyTransactionUpdate(updatedTx.senderUserId, updatedTx);
    }

    async handlePayoutSuccess(transactionId: string, payoutId?: string) {
        console.log(`[WEBHOOK_TRACE] handlePayoutSuccess called for tx ${transactionId}`);
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx) {
            console.error(`[WEBHOOK_TRACE] Transaction ${transactionId} not found!`);
            throw new AppError('Transaction not found', 404);
        }

        // Only process if in PAYOUT_PENDING state
        if (tx.status !== TransactionStatus.PAYOUT_PENDING) {
            console.warn(`[WEBHOOK_TRACE] Transaction ${transactionId} is in ${tx.status}, expected PAYOUT_PENDING. Skipping.`);
            return;
        }

        // Transition: PAYOUT_PENDING → PAYOUT_SUCCESS (FINAL)
        const updatedTx = await this.transitionStatus(
            transactionId,
            TransactionStatus.PAYOUT_SUCCESS,
            undefined,
            'SYSTEM'
        );

        // Notify User
        console.log(`[WEBHOOK_TRACE] Final success reached for tx ${transactionId}. Notifying user.`);
        await this.notificationService.notifyTransactionUpdate(updatedTx.senderUserId, updatedTx);
    }

    async handlePayoutFailure(transactionId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx) {
            throw new AppError('Transaction not found', 404);
        }

        // Only process if in PAYOUT_PENDING state
        if (tx.status !== TransactionStatus.PAYOUT_PENDING) {
            console.warn(`[Payout Failed] Transaction ${transactionId} is in ${tx.status}, expected PAYOUT_PENDING`);
            return;
        }

        // Transition: PAYOUT_PENDING → PAYOUT_FAILED
        const updatedTx = await this.transitionStatus(
            transactionId,
            TransactionStatus.PAYOUT_FAILED,
            undefined,
            'SYSTEM'
        );

        // Notify User
        await this.notificationService.notifyTransactionUpdate(updatedTx.senderUserId, updatedTx);
    }
}
