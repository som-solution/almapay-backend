import express, { Router, Request, Response } from 'express';
import { assertWebhookNotProcessed, DuplicateWebhookError } from '../webhooks/webhookGuard';

const router = Router();

/**
 * Payment Provider Webhook
 * 
 * PATTERN: Idempotency guard → Business logic → Always 200
 */
router.post('/payment', express.json(), async (req: Request, res: Response) => {
    try {
        const { event_id, type, data } = req.body;

        if (!event_id || !type) {
            return res.status(400).json({ error: 'Missing event_id or type' });
        }

        // 1. IDEMPOTENCY GUARD (CRITICAL - must be first)
        try {
            await assertWebhookNotProcessed(
                'PAYMENT_PROVIDER',
                event_id,
                type,
                req.body
            );
        } catch (e) {
            if (e instanceof DuplicateWebhookError) {
                // Already processed - acknowledge but don't re-process
                console.log(`[Webhook] Duplicate payment webhook ignored: ${event_id}`);
                return res.status(200).json({ ok: true, message: 'Already processed' });
            }
            throw e;
        }

        // 2. SAFE TO PROCESS (guaranteed first-time only)
        console.log(`[Webhook] Processing payment webhook: ${event_id}`, data);

        // TODO: Call payment service to handle webhook
        // await paymentService.handleWebhook(type, data);

        // 3. ALWAYS RESPOND 200 (never retry)
        res.status(200).json({ ok: true, event_id });

    } catch (error) {
        console.error('[Webhook] Payment webhook error:', error);
        // Still return 200 to prevent provider retries
        res.status(200).json({ ok: false, error: 'Internal error' });
    }
});

/**
 * Payout Provider Webhook
 * 
 * PATTERN: Idempotency guard → Business logic → Always 200
 */
router.post('/payout', express.json(), async (req: Request, res: Response) => {
    try {
        const { event_id, type, data } = req.body;

        if (!event_id || !type) {
            return res.status(400).json({ error: 'Missing event_id or type' });
        }

        // 1. IDEMPOTENCY GUARD (CRITICAL - must be first)
        try {
            await assertWebhookNotProcessed(
                'PAYOUT_PROVIDER',
                event_id,
                type,
                req.body
            );
        } catch (e) {
            if (e instanceof DuplicateWebhookError) {
                // Already processed - acknowledge but don't re-process
                console.log(`[Webhook] Duplicate payout webhook ignored: ${event_id}`);
                return res.status(200).json({ ok: true, message: 'Already processed' });
            }
            throw e;
        }

        // 2. SAFE TO PROCESS (guaranteed first-time only)
        console.log(`[Webhook] Processing payout webhook: ${event_id}`, data);

        // TODO: Call payout service to handle webhook
        // await payoutService.handleWebhook(type, data);

        // 3. ALWAYS RESPOND 200 (never retry)
        res.status(200).json({ ok: true, event_id });

    } catch (error) {
        console.error('[Webhook] Payout webhook error:', error);
        // Still return 200 to prevent provider retries
        res.status(200).json({ ok: false, error: 'Internal error' });
    }
});

/**
 * Sandbox Provider Webhook Handler
 * 
 * Receives webhooks from sandbox payment/payout providers
 * Connects provider simulation to state machine
 */
router.post('/sandbox', express.json(), async (req: Request, res: Response) => {
    try {
        const { event_id, type, data } = req.body;

        if (!event_id || !type) {
            return res.status(400).json({ error: 'Missing event_id or type' });
        }

        console.log(`[Webhook Sandbox] Received: ${type} (${event_id})`);

        // 1. IDEMPOTENCY GUARD
        try {
            await assertWebhookNotProcessed(
                'SANDBOX',
                event_id,
                type,
                req.body
            );
        } catch (e) {
            if (e instanceof DuplicateWebhookError) {
                console.log(`[Webhook Sandbox] Duplicate ignored: ${event_id}`);
                return res.status(200).json({ ok: true, message: 'Already processed' });
            }
            throw e;
        }

        // 2. PROCESS WEBHOOK (call state machine)
        const { transactionId } = data;

        // Import here to avoid circular dependencies
        const { TransactionService } = await import('../services/TransactionService');
        const transactionService = new TransactionService();

        switch (type) {
            case 'payment.success':
                console.log(`[Webhook Sandbox] Payment success for ${transactionId}`);
                // State machine handles: PAYMENT_PENDING → PAYMENT_SUCCESS → trigger payout
                await transactionService.handlePaymentSuccess(transactionId);
                break;

            case 'payment.failed':
                console.log(`[Webhook Sandbox] Payment failed for ${transactionId}`);
                await transactionService.handlePaymentFailure(transactionId);
                break;

            case 'payout.success':
                console.log(`[Webhook Sandbox] Payout success for ${transactionId}`);
                await transactionService.handlePayoutSuccess(transactionId, data.payoutId);
                break;

            case 'payout.failed':
                console.log(`[Webhook Sandbox] Payout failed for ${transactionId}`);
                await transactionService.handlePayoutFailure(transactionId);
                break;

            default:
                console.warn(`[Webhook Sandbox] Unknown event type: ${type}`);
        }

        // 3. Mark webhook as processed
        const prisma = (await import('@prisma/client')).PrismaClient;
        const client = new prisma();
        await client.webhookEvent.updateMany({
            where: {
                provider: 'SANDBOX',
                eventId: event_id
            },
            data: {
                processed: true,
                processedAt: new Date()
            }
        });

        res.status(200).json({ ok: true, event_id });

    } catch (error) {
        console.error('[Webhook Sandbox] Error:', error);
        // Still return 200 to prevent provider retries
        res.status(200).json({ ok: false, error: 'Internal error' });
    }
});

/**
 * Stripe Webhook Handler
 * 
 * Verifies signature and processes payment intents
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    try {
        const sig = req.headers['stripe-signature'];

        if (!sig) {
            return res.status(400).json({ error: 'Missing stripe-signature' });
        }

        // 1. VERIFY SIGNATURE
        // We need to use the raw body for signature verification
        // Note: verify this matches body-parser setup in app.ts
        const { RealPaymentAdapter } = await import('../services/adapters/payment/realPaymentAdapter');
        const stripeProvider = new RealPaymentAdapter();

        let event;
        try {
            event = stripeProvider.constructEvent(req.body, sig as string);
        } catch (err: any) {
            console.error(`[Webhook Stripe] Signature verification failed: ${err.message}`);
            return res.status(400).json({ error: `Webhook Error: ${err.message}` });
        }

        const { id: event_id, type, data } = event;
        console.log(`[Webhook Stripe] Received: ${type} (${event_id})`);

        // 2. IDEMPOTENCY GUARD
        try {
            await assertWebhookNotProcessed(
                'STRIPE',
                event_id,
                type,
                event // Store full event as payload
            );
        } catch (e) {
            if (e instanceof DuplicateWebhookError) {
                console.log(`[Webhook Stripe] Duplicate ignored: ${event_id}`);
                return res.status(200).json({ ok: true, message: 'Already processed' });
            }
            throw e;
        }

        // 3. PROCESS EVENT
        const { TransactionService } = await import('../services/TransactionService');
        const transactionService = new TransactionService();

        // Handle Payment Intent events
        if (type === 'payment_intent.succeeded') {
            const paymentIntent = data.object as any;
            const transactionId = paymentIntent.metadata.transactionId;

            if (transactionId) {
                console.log(`[Webhook Stripe] Payment success for ${transactionId}`);
                await transactionService.handlePaymentSuccess(transactionId);
            } else {
                console.warn('[Webhook Stripe] Missing transactionId in metadata');
            }
        } else if (type === 'payment_intent.payment_failed') {
            const paymentIntent = data.object as any;
            const transactionId = paymentIntent.metadata.transactionId;

            if (transactionId) {
                console.log(`[Webhook Stripe] Payment failed for ${transactionId}`);
                await transactionService.handlePaymentFailure(transactionId);
            }
        }

        // 4. Mark as processed
        const prisma = (await import('@prisma/client')).PrismaClient;
        const client = new prisma();
        await client.webhookEvent.updateMany({
            where: {
                provider: 'STRIPE',
                eventId: event_id
            },
            data: {
                processed: true,
                processedAt: new Date()
            }
        });

        res.json({ received: true });

    } catch (error) {
        console.error('[Webhook Stripe] Error:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

export default router;
