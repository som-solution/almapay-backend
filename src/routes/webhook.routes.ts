import { Router } from 'express';

const router = Router();

// Simulated Webhooks
router.post('/payment', (req, res) => {
    console.log('[Webhook] Payment simulated', req.body);
    res.json({ received: true });
});

router.post('/payout', (req, res) => {
    console.log('[Webhook] Payout simulated', req.body);
    res.json({ received: true });
});

export default router;
