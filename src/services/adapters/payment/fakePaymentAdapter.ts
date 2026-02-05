
import axios from 'axios';
import { PaymentProvider, PaymentRequest, PaymentResult } from './paymentAdapter.interface';

export class SandboxPaymentAdapter implements PaymentProvider {
    readonly name = 'SANDBOX_PAYMENT';

    async initiatePayment(input: PaymentRequest): Promise<PaymentResult> {
        try {
            // Call sandbox endpoint (async processing + webhook)
            // Using 127.0.0.1 to avoid localhost resolution issues in some envs
            await axios.post('http://127.0.0.1:3000/api/v1/sandbox/payment', {
                transactionId: input.transactionId,
                amount: input.amount,
                currency: input.currency,
                userId: input.customer.name
            });

            // Return provider reference (mimics real provider behavior)
            return {
                success: true,
                providerReference: `sandbox_pay_${Date.now()}`,
                clientSecret: `sandbox_secret_${Date.now()}`
            };
        } catch (error: any) {
            console.error('[SandboxPayment] Error calling sandbox provider:', error.message);
            return {
                success: false,
                error: 'Provider communication error'
            };
        }
    }
}
