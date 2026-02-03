import Stripe from 'stripe';
import { PaymentProvider } from './PaymentProvider';
import { AppError } from '../../middleware/errorHandler';

export class StripePaymentProvider implements PaymentProvider {
    readonly name = 'STRIPE';
    private stripe: Stripe;

    constructor() {
        if (!process.env.STRIPE_SECRET_KEY) {
            console.error('Missing STRIPE_SECRET_KEY in environment variables');
            throw new AppError('Stripe configuration missing', 500);
        }
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-06-20' as any,
        });
    }

    async initiatePayment(input: {
        transactionId: string;
        amount: number;
        currency: string;
        customer: {
            name: string;
            phone?: string;
            email?: string;
        };
        metadata?: Record<string, any>;
    }): Promise<{ providerReference: string; status: 'PENDING'; clientSecret?: string }> {

        try {
            const amountInCents = Math.round(input.amount * 100);

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amountInCents,
                currency: input.currency.toLowerCase(),
                metadata: {
                    transactionId: input.transactionId,
                    userId: input.customer.name,
                    ...input.metadata
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return {
                providerReference: paymentIntent.id,
                status: 'PENDING',
                clientSecret: paymentIntent.client_secret || undefined
            };

        } catch (error: any) {
            console.error('Stripe Payment Initiation Failed:', error);
            throw new AppError(`Stripe Error: ${error.message}`, 502);
        }
    }

    constructEvent(payload: string | Buffer, signature: string): Stripe.Event {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new AppError('Stripe Webhook Secret missing', 500);
        }
        try {
            return this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err: any) {
            throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
        }
    }
}
