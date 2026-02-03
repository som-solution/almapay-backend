import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuid } from 'uuid';

const router = Router();

/**
 * SANDBOX PAYMENT PROVIDER
 * 
 * Simulates real payment provider behavior (e.g., Stripe, Checkout.com)
 * 
 * Behavior:
 * - Accepts payment request immediately (202)
 * - Processes async (1-5 second delay)
 * - Sends webhook back with result
 * - 80% success rate, 20% failure rate
 */
router.post('/payment', async (req: Request, res: Response) => {
    const { amount, currency, userId, transactionId } = req.body;

    console.log(`[Sandbox Payment] Received payment request: ${transactionId}`);

    // Respond immediately (like real providers)
    res.status(202).json({
        status: 'processing',
        message: 'Payment accepted for processing'
    });

    // Simulate async processing
    const delay = Math.random() * 4000 + 1000; // 1-5 seconds
    const willSucceed = Math.random() < 0.8; // 80% success rate

    setTimeout(async () => {
        const eventId = `payment_${uuid()}`;
        const eventType = willSucceed ? 'payment.success' : 'payment.failed';

        const webhookPayload = {
            event_id: eventId,
            type: eventType,
            data: {
                transactionId,
                amount,
                currency,
                userId,
                timestamp: new Date().toISOString()
            }
        };

        console.log(`[Sandbox Payment] Sending webhook: ${eventType} for ${transactionId}`);

        try {
            // Send webhook to our own webhook handler
            await axios.post('http://127.0.0.1:3000/api/v1/webhooks/sandbox', webhookPayload, {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('[Sandbox Payment] Webhook delivery failed:', error);
        }
    }, delay);
});

/**
 * SANDBOX PAYOUT PROVIDER
 * 
 * Simulates real payout provider behavior (e.g., M-Pesa, WaafiPay, Hormuud)
 * 
 * Behavior:
 * - Accepts payout request immediately (202)
 * - Processes async (2-6 second delay)
 * - Sends webhook back with result
 * - 90% success rate, 10% failure rate
 */
router.post('/payout', async (req: Request, res: Response) => {
    const { phone, amount, currency, transactionId } = req.body;

    console.log(`[Sandbox Payout] Received payout request: ${transactionId} to ${phone}`);

    // Respond immediately (like real providers)
    res.status(202).json({
        status: 'processing',
        message: 'Payout accepted for processing'
    });

    // Simulate async processing
    const delay = Math.random() * 4000 + 2000; // 2-6 seconds
    const willSucceed = Math.random() < 0.9; // 90% success rate

    setTimeout(async () => {
        const eventId = `payout_${uuid()}`;
        const eventType = willSucceed ? 'payout.success' : 'payout.failed';

        const webhookPayload = {
            event_id: eventId,
            type: eventType,
            data: {
                transactionId,
                phone,
                amount,
                currency,
                payoutId: `payout_${uuid()}`,
                timestamp: new Date().toISOString()
            }
        };

        console.log(`[Sandbox Payout] Sending webhook: ${eventType} for ${transactionId}`);

        try {
            // Send webhook to our own webhook handler
            await axios.post('http://127.0.0.1:3000/api/v1/webhooks/sandbox', webhookPayload, {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('[Sandbox Payout] Webhook delivery failed:', error);
        }
    }, delay);
});

/**
 * MANUAL WEBHOOK TRIGGER (Testing Helper)
 * 
 * Allows manual triggering of webhooks for testing idempotency
 */
router.post('/trigger-webhook', async (req: Request, res: Response) => {
    const { eventType, transactionId, eventId } = req.body;

    const webhookPayload = {
        event_id: eventId || `manual_${uuid()}`,
        type: eventType,
        data: {
            transactionId,
            timestamp: new Date().toISOString()
        }
    };

    try {
        await axios.post('http://127.0.0.1:3000/api/v1/webhooks/sandbox', webhookPayload);
        res.json({ success: true, message: 'Webhook triggered' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
