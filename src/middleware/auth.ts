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
            process.env.JWT_SECRET || 'super-secret-sandbox-key-change-me'
        ) as JwtPayload;

        req.user = payload;
        next();
    } catch (error) {
        return next(new AppError('Unauthorized: Invalid token', 401));
    }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return next(new AppError('Forbidden: Admin access required', 403));
    }
    next();
};
