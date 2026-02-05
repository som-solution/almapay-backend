
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from './errorHandler';

type AuthRequest = Request & {
    user?: {
        id: string;
        role: UserRole;
    };
};

const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.USER]: 0,
    [UserRole.ADMIN]: 10,  // Generic Admin
    [UserRole.SUPPORT]: 20,
    [UserRole.OPS]: 30,
    [UserRole.SUPER_ADMIN]: 100
};

export const requireAdminRole = (requiredRole: UserRole) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        // 1. Verify Authentication
        if (!req.user) {
            return next(new AppError('Unauthorized: No user found', 401));
        }

        // 2. Verify Role Hierarchy
        const userRoleValue = ROLE_HIERARCHY[req.user.role] || 0;
        const requiredValue = ROLE_HIERARCHY[requiredRole] || 0;

        if (userRoleValue < requiredValue) {
            // Audit this failure?
            console.warn(`[Security] Access Denied. User ${req.user.id} (${req.user.role}) attempted access to ${requiredRole} route.`);
            return next(new AppError('Forbidden: Insufficient privileges', 403));
        }

        next();
    };
};

// Logger middleware for Admin Actions?
// Usually explicit logging in Controller is better for context (Target ID, Reason).
