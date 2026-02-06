
import { PrismaClient } from '@prisma/client';

import { prisma } from '../lib/prisma';

export class DuplicateWebhookError extends Error {
    constructor(provider: string, eventId: string) {
        super(`DUPLICATE_WEBHOOK_EVENT: ${provider}:${eventId} already processed`);
        this.name = 'DuplicateWebhookError';
    }
}

/**
 * Assert that a webhook has not been processed before.
 */
export async function assertWebhookNotProcessed(
    provider: string,
    eventId: string,
    eventType: string,
    payload: any
): Promise<void> {
    try {
        await prisma.webhookEvent.create({
            data: {
                provider,
                eventId,
                eventType,
                payload: payload || {}
            }
        });
    } catch (error: any) {
        // P2002 = Unique constraint violation
        if (error.code === 'P2002') {
            throw new DuplicateWebhookError(provider, eventId);
        }
        throw error;
    }
}

/**
 * Check if a webhook has been processed (non-throwing)
 */
export async function isWebhookProcessed(
    provider: string,
    eventId: string
): Promise<boolean> {
    const existing = await prisma.webhookEvent.findUnique({
        where: {
            provider_eventId: { // Compound unique key name in Prisma
                provider,
                eventId
            }
        }
    });

    return existing !== null;
}

/**
 * Get webhook processing history for a provider
 */
export async function getWebhookHistory(
    provider: string,
    limit: number = 100
) {
    return prisma.webhookEvent.findMany({
        where: { provider },
        orderBy: { createdAt: 'desc' }, // Updated from receivedAt
        take: limit
    });
}
