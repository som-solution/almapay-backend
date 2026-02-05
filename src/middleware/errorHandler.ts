import { Request, Response, NextFunction } from 'express';
import { InvalidStateTransitionError } from '../domain/TransactionStateMachine';

export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public code: string = 'INTERNAL_ERROR' // e.g. USER_FROZEN, LIMIT_EXCEEDED
    ) {
        super(message);
    }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${err.message}`);
    if (err.stack) console.error(err.stack);

    // Standard Response Structure
    const response = {
        status: 'error',
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred'
    };

    // Handle InvalidStateTransitionError
    if (err instanceof InvalidStateTransitionError) {
        return res.status(400).json({
            ...response,
            code: 'INVALID_STATE_TRANSITION',
            statusCode: 400
        });
    }

    // Handle Custom AppError
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(response);
    }

    // Handle Prisma Errors
    if (err.code === 'P2002') {
        return res.status(409).json({
            status: 'error',
            code: 'RESOURCE_CONFLICT',
            message: 'Unique constraint violation (e.g. User already exists)'
        });
    }

    // Zod Validation Errors (if any)
    if (err.name === 'ZodError') {
        return res.status(400).json({
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: err.errors
        });
    }

    // Default 500
    res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error'
    });
};
