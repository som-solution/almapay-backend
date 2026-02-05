
import Stripe from 'stripe';
import { PaymentProvider, PaymentRequest, PaymentResult } from './paymentAdapter.interface';

export class RealPaymentAdapter implements PaymentProvider {
    readonly name = 'STRIPE';
    private stripe: Stripe;

    constructor() {
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('Missing STRIPE_SECRET_KEY in environment variables');
            throw new Error('Stripe configuration missing');
        }
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-06-20' as any,
        });
    }

    async initiatePayment(input: PaymentRequest): Promise<PaymentResult> {
        try {
            const amountInCents = Math.round(input.amount * 100);

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amountInCents,
                currency: input.currency.toLowerCase(),
                metadata: {
                    transactionId: input.transactionId,
                    userId: input.customer.name,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return {
                success: true,
                providerReference: paymentIntent.id,
                clientSecret: paymentIntent.client_secret || undefined
            };

        } catch (error: any) {
            console.error('Stripe Payment Initiation Failed:', error);
            return {
                success: false,
                error: `Stripe Error: ${error.message}`
            };
        }
    }

    constructEvent(payload: string | Buffer, signature: string): Stripe.Event {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error('Stripe Webhook Secret missing');
        }
        try {
            return this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err: any) {
            throw new Error(`Webhook signature verification failed: ${err.message}`);
        }
    }
}
