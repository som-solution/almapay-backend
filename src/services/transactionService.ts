
import { PrismaClient, TransactionStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { AppError } from '../middleware/errorHandler';
import { LedgerService } from './LedgerService';
import { RateService } from './RateService';
import { PayoutService } from './PayoutService';
import { getPaymentProvider } from './adapters/payment/PaymentProviderFactory';
import { mapToUserContract } from '../utils/transactionMapper';
import { TransactionStateMachine } from '../domain/TransactionStateMachine';
import { LimitService } from './LimitService';

import { prisma } from '../lib/prisma';
const ledgerService = new LedgerService();
const payoutService = new PayoutService();

export class TransactionService {

    /**
     * Transition a transaction through the state machine
     */
    async transitionStatus(transactionId: string, event: any, adminId?: string, role?: string) {
        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!tx) throw new AppError('Transaction not found', 404);

        const nextStatus = TransactionStateMachine.transition(tx.status, event);

        // Update DB
        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: nextStatus
            }
        });

        // Audit Log
        if (adminId) {
            await prisma.adminActionLog.create({
                data: {
                    adminId,
                    actionType: `STATUS_CHANGE_${event}`,
                    targetId: transactionId,
                    targetType: 'TRANSACTION',
                    metadata: { from: tx.status, to: nextStatus, event } as any
                }
            });
        }

        return updated;
    }

    async createTransaction(senderUserId: string, recipientPhone: string, amount: number, currency: string, idempotencyKey?: string, fundingSource: string = 'WALLET', sendingReason?: string) {
        // 0. Explicit Idempotency Check (Senior Standard)
        if (idempotencyKey) {
            const existing = await prisma.transaction.findUnique({
                where: { idempotencyKey },
                include: { snapshot: true }
            });
            if (existing) {
                console.log(`[IDEMPOTENCY] Returning existing transaction for key ${idempotencyKey}`);
                return existing;
            }
        }

        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: senderUserId } });
            if (!user) throw new AppError('User not found', 404);

            // Compliance check
            if (currency === 'GBP' && amount > 300 && !sendingReason) {
                throw new AppError('Compliance: Transactions over £300 require a reason for sending.', 400);
            }

            // KILL-SWITCH: Check Payment Provider Status ATOMICALLY
            const providerStatus = await tx.providerStatus.findUnique({ where: { name: 'PAYMENT' } });
            if (providerStatus && !providerStatus.isEnabled) {
                throw new AppError('Payment processing is currently suspended', 503);
            }

            // SAFETY NET: Global Daily Cap
            const limitService = new LimitService();
            await limitService.checkGlobalDailyCap(new Decimal(amount));

            // 1. Calculate Rates & Fees
            const baseCurrency = process.env.BASE_CURRENCY || 'GBP';
            const exchangeRate = await RateService.getRate(baseCurrency, 'KES');
            const fees = Number(process.env.TRANSACTION_FEE) || 2.0;
            const netAmount = new Decimal(amount);
            const feeAmount = new Decimal(fees);
            const totalAmount = netAmount.plus(feeAmount);
            const recipientAmount = netAmount.times(exchangeRate);

            // 2. Create Transaction Record (Unit of Work)
            const transaction = await tx.transaction.create({
                data: {
                    userId: senderUserId,
                    recipientId: (await this.getRecipientId(tx, senderUserId, recipientPhone)),
                    sendAmount: netAmount,
                    sendCurrency: baseCurrency,
                    receiveAmount: recipientAmount,
                    receiveCurrency: 'KES',
                    fee: feeAmount,
                    rate: new Decimal(exchangeRate),
                    idempotencyKey,
                    status: TransactionStatus.CREATED,
                    sendingReason: sendingReason,
                    snapshot: {
                        create: {
                            amount: netAmount,
                            fee: feeAmount,
                            rate: new Decimal(exchangeRate),
                            rateValues: { base: baseCurrency, target: 'KES', rate: exchangeRate },
                            payoutParams: { phone: recipientPhone }
                        }
                    }
                },
            });

            // 3. Ledger Debit (If Wallet funded) - ATOMIC with Real ID
            if (fundingSource === 'WALLET') {
                const totalDeduct = netAmount.plus(feeAmount);
                await ledgerService.recordEntry(
                    transaction.id,
                    senderUserId,
                    'DEBIT',
                    totalDeduct,
                    baseCurrency,
                    `Remittance to ${recipientPhone}`,
                    tx // ATOMICITY
                );
            }

            return transaction;
        }).then(async (transaction: any) => {
            // Post-Transaction Logic
            if (fundingSource === 'WALLET') {
                // Success -> Move to PAYMENT_RECEIVED
                await this.transitionStatus(transaction.id, 'PAYMENT_AUTHORIZED');
                await this.transitionStatus(transaction.id, 'PAYMENT_CAPTURED');

                // Trigger Payout
                this.initiatePayout(transaction.id);
            } else {
                // External Funding (Card/Stripe)
                try {
                    const user = await prisma.user.findUnique({ where: { id: senderUserId } });
                    if (!user) throw new AppError('User not found', 404);

                    const paymentProvider = getPaymentProvider();
                    const paymentResult = await paymentProvider.initiatePayment({
                        transactionId: transaction.id,
                        amount: Number(transaction.sendAmount) + Number(transaction.fee),
                        currency: transaction.sendCurrency,
                        customer: {
                            name: user.firstName + ' ' + user.lastName,
                            email: user.email,
                            phone: user.phoneNumber || undefined
                        }
                    });

                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            paymentIntentId: paymentResult.providerReference,
                        },
                    });

                    (transaction as any).clientSecret = paymentResult.clientSecret;

                } catch (error) {
                    console.error('Payment initiation error:', error);
                    throw new AppError('Failed to initiate external payment.', 500);
                }
            }

            return transaction;
        });
    }

    private async getRecipientId(tx: any, userId: string, phone: string) {
        const recipient = await tx.recipient.findFirst({
            where: { userId, phoneNumber: phone }
        });
        if (recipient) return recipient.id;

        // Auto-create in sandbox
        const created = await tx.recipient.create({
            data: {
                userId,
                firstName: 'Sandbox',
                lastName: 'Recipient',
                phoneNumber: phone,
                mobileProvider: 'M-PESA',
                country: 'KE'
            }
        });
        return created.id;
    }

    async initiatePayout(transactionId: string) {
        try {
            const tx = await prisma.transaction.findUnique({
                where: { id: transactionId },
                include: { snapshot: true }
            });

            if (!tx || !tx.snapshot) return;

            // KILL-SWITCH: Check Payout Provider Status
            const providerStatus = await prisma.providerStatus.findUnique({ where: { name: 'PAYOUT' } });
            if (providerStatus && !providerStatus.isEnabled) {
                console.warn(`Payout suspended for ${transactionId}`);
                // Optionally transition to PAYOUT_FAILED or just halt? 
                // Halting allows retry later. Falling means manual intervention.
                // Let's halt and throw to stop process.
                throw new AppError('Payout processing suspended', 503);
            }

            // State Machine
            await this.transitionStatus(transactionId, 'PAYOUT_INITIATED');

            // Call Payout Provider
            const payoutResult = await payoutService.processPayout({
                transactionId: tx.id,
                amount: Number(tx.receiveAmount),
                currency: tx.receiveCurrency,
                recipientPhone: (tx.snapshot as any).payoutParams.phone
            });

            if (payoutResult.success) {
                await this.handlePayoutSuccess(transactionId, payoutResult.providerRef);
            } else {
                await this.handlePayoutFailure(transactionId);
            }
        } catch (error) {
            console.error('Payout error:', error);
            await this.handlePayoutFailure(transactionId);
        }
    }

    /**
     * ADMIN: Cancel a transaction safely
     * Enforces strict state checks + audit logging
     */
    async cancelTransaction(transactionId: string, reason: string, adminId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx) throw new AppError('Transaction not found', 404);

        // Strict check: Only early states can be cancelled
        if (!['CREATED', 'PENDING_PAYMENT', 'PAYMENT_FAILED', 'AUTHORIZATION_EXPIRED'].includes(tx.status)) {
            throw new AppError(`Cannot cancel transaction in state ${tx.status}`, 400);
        }

        await this.transitionStatus(transactionId, 'CANCELLED', adminId);

        // Log specific reason
        await prisma.adminActionLog.create({
            data: {
                adminId,
                actionType: 'MANUAL_CANCEL',
                targetId: transactionId,
                targetType: 'TRANSACTION',
                reason,
                metadata: { originalStatus: tx.status } as any
            }
        });
    }

    /**
     * ADMIN: Retry a failed payout
     */
    async retryPayout(transactionId: string, adminId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx) throw new AppError('Transaction not found', 404);

        if (tx.status !== 'PAYOUT_FAILED') {
            throw new AppError('Can only retry PAYOUT_FAILED transactions', 400);
        }

        // Log explicit intent
        await prisma.adminActionLog.create({
            data: {
                adminId,
                actionType: 'MANUAL_RETRY',
                targetId: transactionId,
                targetType: 'TRANSACTION'
            }
        });

        // Re-enter payout flow
        await this.initiatePayout(transactionId);
    }

    /**
     * ADMIN: Refund a completed transaction
     * Must be ATOMIC with Ledger Credit
     */
    async refundTransaction(transactionId: string, reason: string, adminId: string) {
        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx) throw new AppError('Tx not found', 404);

        // State Machine: REFUND_REQUESTED
        await this.transitionStatus(transactionId, 'REFUND_REQUESTED', adminId);

        // Ledger Credit
        const refundAmount = new Decimal(tx.sendAmount).plus(tx.fee);

        await ledgerService.recordEntry(
            transactionId,
            tx.userId,
            'CREDIT_REFUND',
            refundAmount,
            tx.sendCurrency,
            `Refund for ${transactionId}`
        );

        await prisma.adminActionLog.create({
            data: {
                adminId,
                actionType: 'MANUAL_REFUND',
                targetId: transactionId,
                targetType: 'TRANSACTION',
                reason
            }
        });
    }

    async handlePaymentSuccess(transactionId: string) {
        await this.transitionStatus(transactionId, 'PAYMENT_AUTHORIZED');
        await this.transitionStatus(transactionId, 'PAYMENT_RECEIVED');
        // Trigger payout sequence
        this.initiatePayout(transactionId);
    }

    async handlePaymentFailure(transactionId: string) {
        await this.transitionStatus(transactionId, 'PAYMENT_FAILED');
    }

    async handlePayoutSuccess(transactionId: string, payoutId?: string) {
        if (payoutId) {
            await prisma.transaction.update({
                where: { id: transactionId },
                data: { payoutProviderRef: payoutId }
            });
        }
        await this.transitionStatus(transactionId, 'PAYOUT_SUCCESS');
    }

    async handlePayoutFailure(transactionId: string) {
        await this.transitionStatus(transactionId, 'PAYOUT_FAILED');
    }

    async finalizeManual(transactionId: string, reason: string, providerRef: string | undefined, adminId: string) {
        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { dispute: true }
        });

        if (!tx) throw new AppError('Transaction not found', 404);
        if (tx.dispute && tx.dispute.status === 'OPEN') {
            throw new AppError('Cannot finalize transaction with OPEN dispute', 409);
        }

        if (providerRef) {
            await prisma.transaction.update({
                where: { id: transactionId },
                data: { payoutProviderRef: providerRef }
            });
        }

        if (tx.status !== TransactionStatus.PAYOUT_SUCCESS) {
            await this.transitionStatus(transactionId, 'PAYOUT_SUCCESS', adminId);
        }

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                finalizedAt: new Date(),
                isProvisional: false,
                chargebackWindowEndsAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
            }
        });
    }

    async getTransactionById(transactionId: string, userId: string) {
        const tx = await prisma.transaction.findFirst({
            where: { id: transactionId, userId },
            include: { recipient: true }
        });
        if (!tx) return null;
        return mapToUserContract(tx);
    }

    async getTransactions(userId: string) {
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { recipient: true }
        });
        return transactions.map(tx => mapToUserContract(tx));
    }
}
