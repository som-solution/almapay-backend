import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService';

const notificationService = new NotificationService();

export const registerDeviceToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { token, platform } = req.body;

        if (!token || !platform) {
            res.status(400).json({ status: 'error', message: 'Token and platform are required' });
            return;
        }

        await notificationService.registerDeviceToken(userId, token, platform);
        res.status(200).json({ status: 'success', message: 'Token registered' });
    } catch (error) {
        next(error);
    }
};

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const notifications = await notificationService.getUserNotifications(userId);
        res.json({ status: 'success', data: notifications });
    } catch (error) {
        next(error);
    }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;

        if (typeof id !== 'string') {
            res.status(400).json({ status: 'error', message: 'Invalid ID' });
            return;
        }

        await notificationService.markAsRead(id, userId);
        res.json({ status: 'success', message: 'Marked as read' });
    } catch (error) {
        next(error);
    }
};
