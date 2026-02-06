import { PrismaClient } from '@prisma/client';

import { prisma } from '../lib/prisma';

export class NotificationService {

    /**
     * Register a device token for a user
     */
    async registerDeviceToken(userId: string, token: string, platform: string) {
        // Upsert ensures we update the token/platform if it exists for this user, or create new
        // Note: Our schema has @@unique([userId, token]) which is good, but for a single device 
        // receiving a new token, we might want logic to replace old tokens. 
        // For simplicity in V1, we just upsert the specific token.
        return prisma.deviceToken.upsert({
            where: {
                userId_token: { userId, token }
            },
            update: { platform, updatedAt: new Date() },
            create: { userId, token, platform }
        });
    }

    /**
     * Get recent notifications for a user (Inbox)
     */
    async getUserNotifications(userId: string, limit = 20) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: string, userId: string) {
        // Ensure strictly owned by user
        const result = await prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true }
        });
        return result.count > 0;
    }

    /**
     * Send a notification to a user
     * 1. Persist to DB (Inbox)
     * 2. Send Push Notification (Expo/Mock)
     */
    async sendNotification(userId: string, title: string, body: string, data?: any) {
        // 1. Persist
        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                body,
                data: data ? JSON.stringify(data) : undefined
            }
        });

        // 2. Fetch Devices
        const devices = await prisma.deviceToken.findMany({
            where: { userId }
        });

        if (devices.length === 0) {
            console.log(`[Notification] No devices found for user ${userId}. Saved to inbox only.`);
            return notification;
        }

        // 3. Send Push (Mock for now)
        // In production: import { Expo } from 'expo-server-sdk';
        console.log(`[Notification] 🚀 Sending Push to ${devices.length} devices for user ${userId}`);
        devices.forEach(device => {
            console.log(`   ➔ [${device.platform}] ${device.token}: "${title} - ${body}"`);
        });

        return notification;
    }

    /**
     * Helper: Transaction Update Notification
     */
    async notifyTransactionUpdate(userId: string, transaction: any) {
        let title = 'Transaction Update';
        let body = `Your transaction is now ${transaction.status}`;

        // Customize message based on status (User Facing)
        // We really should rely on the Mapped User Status here, but for now we look at internal status
        // and infer. Or assume 'transaction' object passed in is already mapped?
        // Let's assume generic keys for now. 

        switch (transaction.status) {
            case 'PAYOUT_SUCCESS':
                title = 'Transfer Sent! ✅';
                body = `Your transfer of ${transaction.amount} ${transaction.currency} has been successfully sent.`;
                break;
            case 'PAYMENT_FAILED':
            case 'PAYOUT_FAILED':
                title = 'Transfer Failed ❌';
                body = `Your transfer could not be completed. Check the app for details.`;
                break;
        }

        await this.sendNotification(userId, title, body, { transactionId: transaction.id });
    }
}
