import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { ComplianceService } from '../services/complianceService';

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        // 1. Check if Admin
        const admin = await prisma.adminUser.findUnique({ where: { email } });
        if (admin) {
            // Simple password check (In production use bcrypt)
            const valid = await bcrypt.compare(password, admin.passwordHash);
            if (!valid) {
                return next(new AppError('Invalid credentials', 401));
            }
            const token = jwt.sign({ userId: admin.id, role: admin.role }, process.env.JWT_SECRET!, { expiresIn: '1d' });
            return res.json({ token, user: { id: admin.id, name: admin.name, role: admin.role } });
        }

        // 2. Check if User
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Auto-signup for sandbox simplicity if not found? 
            // Or just fail. Let's fail.
            return next(new AppError('Invalid credentials', 401));
        }

        // Simple password check
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return next(new AppError('Invalid credentials', 401));
        }

        const token = jwt.sign({ userId: user.id, role: 'USER' }, process.env.JWT_SECRET!, { expiresIn: '1d' });
        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: 'USER',
                isKycComplete: ComplianceService.isKycComplete(user)
            }
        });

    } catch (error) {
        next(error);
    }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, phoneNumber, password } = req.body;
        // Check exists
        const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { phoneNumber }] } });
        if (exists) return next(new AppError('User already exists', 400));

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, name, phoneNumber, passwordHash: hashedPassword }
        });

        const token = jwt.sign({ userId: user.id, role: 'USER' }, process.env.JWT_SECRET!, { expiresIn: '1d' });
        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: 'USER',
                isKycComplete: false
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const role = req.user!.role;

        if (role === 'ADMIN') {
            const admin = await prisma.adminUser.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true, role: true }
            });
            if (!admin) return next(new AppError('User not found', 404));
            return res.json({ status: 'success', data: admin });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) return next(new AppError('User not found', 404));

        res.json({
            status: 'success',
            data: {
                ...user,
                balance: Number(user.balance),
                role: 'USER',
                isKycComplete: ComplianceService.isKycComplete(user)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * ADMIN LOGIN (Separate endpoint for security and clarity)
 * 
 * Security features:
 * - Bcrypt password verification
 * - JWT with role claim
 * - 24h token expiration
 * - Generic error messages
 * - No password hash in response
 */
export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return next(new AppError('Email and password required', 400));
        }

        // Find admin user
        const admin = await prisma.adminUser.findUnique({
            where: { email }
        });

        if (!admin) {
            // Generic error - don't reveal if email exists
            return next(new AppError('Invalid credentials', 401));
        }

        // Verify password with bcrypt (constant-time comparison)
        const isValid = await bcrypt.compare(password, admin.passwordHash);

        if (!isValid) {
            // Generic error - same message as above
            return next(new AppError('Invalid credentials', 401));
        }

        // Generate JWT with admin role claim
        const token = jwt.sign(
            {
                userId: admin.id,
                email: admin.email,
                role: admin.role,
                type: 'admin'  // Distinguishes admin tokens
            },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }  // Admin tokens expire in 24 hours
        );

        // Remove password hash from response
        const { passwordHash, ...safeAdmin } = admin;

        // Return token and safe admin data
        res.json({
            token,
            admin: safeAdmin
        });

    } catch (error) {
        next(error);
    }
};
