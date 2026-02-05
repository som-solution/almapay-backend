import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/TransactionService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Add new Recipient
export const createRecipient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { name, phoneNumber } = req.body;

        if (!phoneNumber) {
            res.status(400).json({ status: 'error', message: 'Phone number is required' });
            return;
        }

        // Check if exists
        const existing = await prisma.recipient.findFirst({
            where: { userId, phoneNumber }
        });

        if (existing) {
            res.status(200).json({ status: 'success', data: existing, message: 'Recipient already exists' });
            return;
        }

        const [firstName, ...rest] = (name || 'Beneficiary').split(' ');
        const lastName = rest.join(' ') || 'User';

        const recipient = await prisma.recipient.create({
            data: {
                userId,
                firstName,
                lastName,
                phoneNumber,
                mobileProvider: 'UNKNOWN', // Required field
                country: 'UK' // Required field
            }
        });

        res.status(201).json({
            status: 'success',
            data: {
                ...recipient,
                name: `${recipient.firstName} ${recipient.lastName}`
            }
        });
    } catch (error) {
        next(error);
    }
};

// List all Recipients
export const getRecipients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const recipients = await prisma.recipient.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        const mapped = recipients.map(r => ({
            ...r,
            name: `${r.firstName} ${r.lastName}`
        }));

        res.json({ status: 'success', data: mapped });
    } catch (error) {
        next(error);
    }
};

// Delete Recipient
export const deleteRecipient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        await prisma.recipient.deleteMany({
            where: { id: id as string, userId } // Ensure user owns it
        });

        res.json({ status: 'success', message: 'Recipient deleted' });
    } catch (error) {
        next(error);
    }
};
