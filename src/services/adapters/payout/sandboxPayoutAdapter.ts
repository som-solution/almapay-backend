
import axios from 'axios';
import { PayoutProvider, PayoutRequest, PayoutResult } from './payoutAdapter.interface';

export class SandboxPayoutAdapter implements PayoutProvider {
    readonly name = 'SANDBOX_PAYOUT';

    async payout(input: PayoutRequest): Promise<PayoutResult> {
        try {
            // Call sandbox endpoint (async processing + webhook)
            await axios.post('http://127.0.0.1:3000/api/v1/sandbox/payout', {
                transactionId: input.transactionId,
                phone: input.recipientPhone,
                amount: input.amount,
                currency: input.currency
            });

            return {
                success: true,
                providerRef: `sandbox_out_${Date.now()}`
            };
        } catch (error: any) {
            console.error('[SandboxPayout] Error calling sandbox provider:', error.message);
            return {
                success: false,
                error: 'Provider communication error'
            };
        }
    }
}
