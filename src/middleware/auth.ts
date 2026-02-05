import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

interface JwtPayload {
    userId: string;
    role?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Unauthorized: No token provided', 401));
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET!
        ) as JwtPayload;

        req.user = payload;
        next();
    } catch (error) {
        return next(new AppError('Unauthorized: Invalid token', 401));
    }
};

/**
 * Require Admin or Support role
 * 
 * ADMIN: Full access (retry, refund)
 * SUPPORT: Read-only access (view transactions, users, logs)
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return next(new AppError('Unauthorized', 401));
    }

    // Accept all administrative roles
    const adminRoles = ['ADMIN', 'SUPPORT', 'OPS', 'SUPER_ADMIN'];
    if (!req.user.role || !adminRoles.includes(req.user.role)) {
        return next(new AppError('Forbidden: Admin access required', 403));
    }

    next();
};

/**
 * Require full ADMIN role (for destructive operations)
 * 
 * Use this for:
 * - Retry payouts
 * - Refund transactions
 */
export const requireFullAdmin = (req: Request, res: Response, next: NextFunction) => {
    const fullPages = ['ADMIN', 'OPS', 'SUPER_ADMIN'];
    if (!req.user || !req.user.role || !fullPages.includes(req.user.role)) {
        return next(new AppError('Forbidden: Full admin privileges required', 403));
    }
    next();
};
