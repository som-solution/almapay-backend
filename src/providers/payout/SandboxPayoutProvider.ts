import axios from 'axios';
import { PayoutProvider } from './PayoutProvider';

/**
 * Sandbox Payout Provider
 * 
 * Simulates real mobile money providers (M-Pesa, WaafiPay) with async behavior.
 * Calls sandbox endpoint which processes payout asynchronously and sends webhook.
 */
export class SandboxPayoutProvider implements PayoutProvider {
    readonly name = 'SANDBOX_PAYOUT';

    async initiatePayout(input: {
        transactionId: string;
        amount: number;
        currency: string;
        recipient: {
            phone: string;
            country: string;
            name?: string;
        };
        metadata?: Record<string, any>;
    }): Promise<{ providerReference: string; status: 'PENDING' }> {

        // Call sandbox endpoint (async processing + webhook)
        await axios.post('http://127.0.0.1:3000/api/v1/sandbox/payout', {
            transactionId: input.transactionId,
            phone: input.recipient.phone,
            amount: input.amount,
            currency: input.currency
        });

        // Return provider reference (mimics real provider behavior)
        return {
            providerReference: `sandbox_out_${Date.now()}`,
            status: 'PENDING'
        };
    }
}
