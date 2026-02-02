import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppError } from '../middleware/errorHandler';

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
        return res.json({ token, user: { id: user.id, name: user.name, role: 'USER' } });

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
        res.status(201).json({ token, user: { id: user.id, name: user.name } });
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
            where: { id: userId },
            select: { id: true, name: true, email: true, phoneNumber: true }
        });
        if (!user) return next(new AppError('User not found', 404));

        res.json({ status: 'success', data: { ...user, role: 'USER' } });
    } catch (error) {
        next(error);
    }
};

