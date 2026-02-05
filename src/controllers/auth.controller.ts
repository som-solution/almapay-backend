
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
// import { ComplianceService } from '../services/complianceService'; // Ensure this exists or mock
import { AuthService } from '../services/authService';

const prisma = new PrismaClient();

// Mock ComplianceService if missing or simple implementation
class ComplianceService {
    static isKycComplete(user: any) {
        return !!user.isVerified; // Use my new schema field
    }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        // Try loginUser (now unified, but handles roles)
        // If checking for admin login specifically, use adminLogin endpoint?
        // Or unified login returns role.

        const result = await AuthService.loginUser(email, password);

        return res.json({
            status: 'success',
            token: result.tokens.accessToken, // Standard alias for many mobile libraries
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
            user: {
                id: result.user.id,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                name: `${result.user.firstName} ${result.user.lastName}`,
                email: result.user.email,
                role: result.user.role,
                isKycComplete: ComplianceService.isKycComplete(result.user)
            }
        });

    } catch (error) {
        next(error);
    }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, firstName, lastName, phoneNumber, password, name } = req.body;

        // Handle name split if 'name' provided vs explicit first/last
        let fName = firstName;
        let lName = lastName;
        if (!fName && name) {
            const parts = name.split(' ');
            fName = parts[0];
            lName = parts.slice(1).join(' ') || 'User';
        }

        if (!fName || !lName || !email || !password) {
            return next(new AppError('Missing required fields', 400));
        }

        const exists = await prisma.user.findFirst({ where: { OR: [{ email }] } }); // PhoneNumber unique removed? 
        // Schema checks: email unique.
        if (exists) return next(new AppError('User already exists', 400));

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword, // New schema field
                firstName: fName,
                lastName: lName,
                phoneNumber: phoneNumber,
                role: 'USER'
            }
        });

        const tokens = await AuthService.generateTokens(user.id, 'USER');

        res.status(201).json({
            status: 'success',
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            user: {
                id: user.id,
                firstName: fName,
                lastName: lName,
                name: `${fName} ${lName}`,
                email: user.email,
                role: user.role,
                isKycComplete: false
            }
        });
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Handle common variations of the key
        const rToken = req.body.refreshToken || req.body.refresh_token || req.body.token;

        if (!rToken) throw new AppError('Refresh token required (as refreshToken, refresh_token, or token)', 400);

        const tokens = await AuthService.refreshAccessToken(rToken);

        res.json({
            status: 'success',
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rToken = req.body.refreshToken || req.body.refresh_token || req.body.token;
        if (rToken) {
            await AuthService.revokeToken(rToken);
        }
        res.json({ status: 'success', message: 'Logged out' });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user!.userId; // Auth middleware
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return next(new AppError('User not found', 404));

        res.json({
            status: 'success',
            data: {
                ...user,
                balance: Number(user.balance),
                name: `${user.firstName} ${user.lastName}`,
                isKycComplete: ComplianceService.isKycComplete(user)
            }
        });
    } catch (error) {
        next(error);
    }
};

// ... other methods (forgotPassword, etc) standard ...
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AuthService.forgotPassword(req.body.email);
        res.json({ status: 'success', message: 'If account exists, email sent' });
    } catch (error) { next(error); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await AuthService.resetPassword(req.body.token, req.body.newPassword);
        res.json({ status: 'success', message: 'Password reset' });
    } catch (error) { next(error); }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user!.userId;
        await AuthService.changePassword(userId, req.body.currentPassword, req.body.newPassword);
        res.json({ status: 'success', message: 'Password changed' });
    } catch (error) { next(error); }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user!.userId;
        const { firstName, lastName } = req.body;
        // Standardize
        await prisma.user.update({
            where: { id: userId },
            data: { firstName, lastName }
        });
        res.json({ status: 'success', message: 'Profile updated' });
    } catch (error) { next(error); }
}

// Admin Login Endpoint (Optional if unified, but keeps API compatibility)
export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const result = await AuthService.loginAdmin(email, password);
        res.json({
            admin: {
                id: result.user.id,
                email: result.user.email,
                role: result.user.role
            },
            ...result.tokens
        });
    } catch (error) { next(error); }
};
