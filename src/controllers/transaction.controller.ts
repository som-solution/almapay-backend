import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transactionService';

const transactionService = new TransactionService();

export const sendMoney = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { recipientPhone, recipient_name, amount, currency } = req.body;
        const userId = req.user!.userId;

        // Frontend sends 'recipient_name', so we default phone for sandbox if missing
        const finalPhone = recipientPhone || '+254700000000';

        const transaction = await transactionService.createTransaction(userId, finalPhone, amount, currency);
        res.status(201).json({ status: 'success', data: transaction });
    } catch (error) {
        next(error);
    }
};

export const getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const transactions = await transactionService.getTransactions(userId);

        // Format dates to ISO strings to prevent serialization issues
        const formattedTransactions = transactions.map(tx => ({
            ...tx,
            amount: tx.amount.toString(),
            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString()
        }));

        res.json({ status: 'success', data: formattedTransactions });
    } catch (error) {
        next(error);
    }
};


export const getBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;

        // Calculate balance from transactions
        const transactions = await transactionService.getTransactions(userId);

        // Starting balance for sandbox (could be from a Wallet table in production)
        const startingBalance = 10000.00;

        // Calculate total spent (only successful transactions)
        const totalSpent = transactions
            .filter(tx => tx.status === 'PAYOUT_SUCCESS')
            .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const currentBalance = startingBalance - totalSpent;

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
