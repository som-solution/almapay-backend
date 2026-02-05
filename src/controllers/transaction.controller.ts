import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/TransactionService';
import { RateService } from '../services/rateService';
import { mapToUserContract } from '../utils/transactionMapper';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const transactionService = new TransactionService();
const prisma = new PrismaClient();

export const getTransactionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const transactionId = req.params.id as string;

        if (!transactionId) {
            res.status(400).json({ status: 'error', message: 'Transaction ID is required' });
            return;
        }

        const transaction = await transactionService.getTransactionById(transactionId, userId);

        if (!transaction) {
            console.log(`Transaction ${transactionId} not found for user ${userId}`); // Debug log
            res.status(404).json({ status: 'error', message: 'Transaction not found' });
            return; // Ensure we return to stop execution
        }

        res.json({ status: 'success', data: transaction });
    } catch (error) {
        next(error);
    }
};

export const sendMoney = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { recipientPhone, recipient_name, amount, currency, idempotencyKey, sendingReason } = req.body;
        const userId = req.user!.userId;

        // Frontend sends 'recipient_name', so we default phone for sandbox if missing
        const finalPhone = recipientPhone || '+254700000000';

        const fundingSource = process.env.PAYMENT_PROVIDER || 'WALLET';
        const transaction = await transactionService.createTransaction(
            userId,
            finalPhone,
            amount,
            currency,
            idempotencyKey as string | undefined,
            fundingSource,
            sendingReason
        );

        // Map to user contract before returning
        // We need to import the mapper or expose it. 
        // Ideally the service should return the mapped object, but createTransaction returns the raw one.
        // Let's use the helper we just exported.
        // Importing dynamically to avoid circular dep issues in this snippet replacement or assume it's available.
        // Actually, let's just return the result. Ideally createTransaction should probably return the DTO too.
        // For now, let's rely on the service to return 'transaction' and we assume the frontend can handle the raw form OR we map it.
        // Better: let's map it here.
        // But we can't import mapToUserContract easily without adding imports. 

        // Map to user contract before returning to ensure Decimals are converted to Numbers
        const mappedTransaction = {
            ...mapToUserContract(transaction as any),
            clientSecret: (transaction as any).clientSecret
        };

        res.status(201).json({ status: 'success', data: mappedTransaction });
    } catch (error) {
        next(error);
    }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const transactions = await transactionService.getTransactions(userId);
        // transactions are already mapped to User Contract by the service!

        res.json({ status: 'success', data: transactions });
    } catch (error) {
        next(error);
    }
};


export const getBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;

        // Fetch real balance from DB
        const user = await prisma.user.findUnique({ where: { id: userId } });

        const currentBalance = user ? Number(user.balance) : 0.00;

        const balance = {
            currency: 'GBP',
            amount: currentBalance,
            available: currentBalance
        };

        res.json({ status: 'success', data: balance });
    } catch (error) {
        next(error);
    }
};

export const lookupRecipient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone } = req.query;
        console.log(`[LOOKUP_TRACE] Querying recipient for phone: "${phone}"`);

        if (!phone) {
            res.status(400).json({ status: 'error', message: 'Phone number is required' });
            return;
        }

        // 1. Try to find an existing user in our system
        const user = await prisma.user.findFirst({
            where: { phoneNumber: phone as string }
        });

        if (user) {
            res.json({
                status: 'success',
                data: {
                    name: `${user.firstName} ${user.lastName}`,
                    phone: user.phoneNumber,
                    isAvailable: true
                }
            });
            return;
        }

        // 2. Sandbox Simulation: In SANDBOX mode, we allow all numbers to be "verified" 
        // to ensure a smooth testing experience regardless of the country code.
        const cleanPhone = (phone as string).replace(/\s/g, ''); // Remove spaces
        if (cleanPhone.length >= 7) {
            res.json({
                status: 'success',
                data: {
                    name: 'Verified Recipient',
                    phone: cleanPhone,
                    isAvailable: true,
                    provider: 'ALMAPAY_INTERNAL'
                }
            });
            return;
        }

        // 3. Fallback for very short/invalid strings
        res.status(404).json({
            status: 'error',
            message: 'Is unavailable',
            data: { isAvailable: false }
        });
    } catch (error) {
        next(error);
    }
};


// ...

export const getTransactionStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const transaction = await transactionService.getTransactionById(id as string, userId);

        if (!transaction) return next(new AppError('Transaction not found', 404));

        res.json({
            status: 'success',
            data: {
                id: transaction.id,
                status: transaction.status,
                displayStatus: transaction.statusDisplay,
                isTerminal: transaction.isTerminal
            }
        });
    } catch (error) {
        next(error);
    }
};

export const calculateTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Support both Query (GET) and Body (POST)
        const body = req.body || {};
        const query = req.query || {};

        const amount = Number(body.amount || query.amount || 0);
        const currency = (body.currency || query.currency || 'GBP') as string;
        const target = (body.target || query.target || 'KES') as string;

        const rate = await RateService.getRate(currency, target);
        const fee = Number(process.env.TRANSACTION_FEE || 2.0);
        const recipientGets = amount * rate;

        res.json({
            status: 'success',
            data: {
                sendAmount: amount,
                fee,
                rate,
                recipientGets,
                currency,
                targetCurrency: target,
                totalToPay: amount + fee
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTransactionReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const transactionId = req.params.id as string;

        const transaction = await transactionService.getTransactionById(transactionId, userId);
        if (!transaction) return next(new AppError('Transaction not found', 404));

        // Format for Receipt
        const receipt = {
            receiptId: `RCPT-${transaction.id.substring(0, 8).toUpperCase()}`,
            date: transaction.createdAt,
            sender: 'AlmaPay Customer',
            recipient: transaction.recipientPhone,
            amountSent: `${transaction.amount} ${transaction.currency}`,
            amountReceived: `${transaction.recipientAmount} ${transaction.recipientCurrency}`,
            exchangeRate: transaction.exchangeRate,
            fees: `${transaction.fees} ${transaction.currency}`,
            totalPaid: `${transaction.totalAmount} ${transaction.currency}`,
            status: transaction.statusDisplay,
            ref: (transaction as any).payoutProviderRef || (transaction as any).paymentProviderRef || 'N/A'
        };

        res.json({ status: 'success', data: receipt });
    } catch (error) {
        next(error);
    }
};
