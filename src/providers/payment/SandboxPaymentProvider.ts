import axios from 'axios';
import { PaymentProvider } from './PaymentProvider';

/**
 * Sandbox Payment Provider
 * 
 * Simulates real payment providers (Stripe, Checkout.com) with async behavior.
 */
export class SandboxPaymentProvider implements PaymentProvider {
    readonly name = 'SANDBOX_PAYMENT';

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

        // Call sandbox endpoint (async processing + webhook)
        await axios.post('http://127.0.0.1:3000/api/v1/sandbox/payment', {
            transactionId: input.transactionId,
            amount: input.amount,
            currency: input.currency,
            userId: input.customer.name
        });

        // Return provider reference (mimics real provider behavior)
        return {
            providerReference: `sandbox_pay_${Date.now()}`,
            status: 'PENDING',
            clientSecret: `sandbox_secret_${Date.now()}`
        };
    }
}
