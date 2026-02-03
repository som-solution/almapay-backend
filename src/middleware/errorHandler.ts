import { Request, Response, NextFunction } from 'express';
import { InvalidStateTransitionError } from '../domain/transactionStateMachine';

export class AppError extends Error {
    constructor(public message: string, public statusCode: number = 500) {
        super(message);
    }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('---------------------------------------------------');
    console.error('SERVER ERROR AT:', new Date().toISOString());
    console.error('URL:', req.url);
    if (err.stack) console.error(err.stack);
    else console.error('Error:', err);
    console.error('---------------------------------------------------');

    // Handle InvalidStateTransitionError (state machine violations)
    if (err instanceof InvalidStateTransitionError) {
        return res.status(400).json({
            status: 'error',
            message: err.message,
            error: 'Invalid state transition'
        });
    }

    // Handle custom AppError
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message
        });
    }

    // Handle Prisma errors
    if (err.code === 'P2002') {
        return res.status(400).json({
            status: 'error',
            message: 'Resource already exists'
        });
    }

    // Default error
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
};
