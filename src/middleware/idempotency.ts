
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

import { mapToUserContract } from '../utils/transactionMapper';

export const idempotency = async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['idempotency-key'] as string;

    if (!key) {
        return next();
    }

    try {
        const existingTx = await prisma.transaction.findUnique({
            where: { idempotencyKey: key }
        });

        if (existingTx) {
            console.log(`[Idempotency] Returning cached result for key ${key}`);
            // Return 200 OK (not 201) to indicate it's an existing resource
            return res.status(200).json({
                status: 'success',
                data: mapToUserContract(existingTx)
            });
        }

        // Attach key to body so controller can save it
        req.body.idempotencyKey = key;
        next();
    } catch (error) {
        console.error('[Idempotency] Error checking key:', error);
        next(); // Fail open or closed? Fail open for now, let db unique constraint catch it if race condition
    }
};
