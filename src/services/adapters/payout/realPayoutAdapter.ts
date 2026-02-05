
import { PayoutProvider, PayoutRequest, PayoutResult } from './payoutAdapter.interface';

export class RealPayoutAdapter implements PayoutProvider {
    readonly name = 'REAL_PAYOUT';

    async payout(input: PayoutRequest): Promise<PayoutResult> {
        console.warn('REAL PAYOUT NOT IMPLEMENTED - MOCKING SUCCESS');
        // In a real app, this would perform an API call to a Mobile Money aggregator
        return {
            success: true,
            providerRef: `real_out_${Date.now()}`
        };
    }
}
