import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * WEBHOOK IDEMPOTENCY GUARD
 * 
 * Ensures webhooks are processed exactly once by enforcing 
 * database-level uniqueness on (provider, eventId).
 * 
 * CRITICAL: This MUST be called before any webhook business logic.
 */

export class DuplicateWebhookError extends Error {
    constructor(provider: string, eventId: string) {
        super(`DUPLICATE_WEBHOOK_EVENT: ${provider}:${eventId} already processed`);
        this.name = 'DuplicateWebhookError';
    }
}

/**
 * Assert that a webhook has not been processed before.
 * 
 * @param provider - Provider name (e.g., "PAYMENT_PROVIDER", "PAYOUT_PROVIDER")
 * @param eventId - Unique event ID from provider
 * @param eventType - Type of event (e.g., "payment.success", "payout.failed")
 * @param payload - Full webhook payload for audit trail
 * 
 * @throws DuplicateWebhookError if webhook already processed
 * @throws Error for other database errors
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

        // Re-throw other errors
        throw error;
    }
}

/**
 * Check if a webhook has been processed (non-throwing)
 * 
 * @param provider - Provider name
 * @param eventId - Event ID
 * @returns true if webhook already processed, false otherwise
 */
export async function isWebhookProcessed(
    provider: string,
    eventId: string
): Promise<boolean> {
    const existing = await prisma.webhookEvent.findUnique({
        where: {
            provider_eventId: {
                provider,
                eventId
            }
        }
    });

    return existing !== null;
}

/**
 * Get webhook processing history for a provider
 * 
 * @param provider - Provider name
 * @param limit - Max number of events to return
 * @returns Array of webhook events
 */
export async function getWebhookHistory(
    provider: string,
    limit: number = 100
) {
    return prisma.webhookEvent.findMany({
        where: { provider },
        orderBy: { receivedAt: 'desc' },
        take: limit
    });
}
