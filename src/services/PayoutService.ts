
import { getPayoutProvider } from './adapters/payout/PayoutProviderFactory';

export interface PayoutRequest {
    transactionId: string;
    amount: number;
    currency: string;
    recipientPhone: string;
}

export interface PayoutResult {
    success: boolean;
    providerRef?: string;
    error?: string;
}

export class PayoutService {
    /**
     * Orchestrates the payout via the configured provider
     */
    async processPayout(request: PayoutRequest): Promise<PayoutResult> {
        try {
            const provider = getPayoutProvider();

            console.log(`[PayoutService] Initiating payout for Tx: ${request.transactionId}`);

            const result = await provider.payout({
                amount: request.amount,
                currency: request.currency,
                recipientPhone: request.recipientPhone,
                transactionId: request.transactionId
            });

            return {
                success: result.success,
                providerRef: result.providerRef,
                error: result.error
            };
        } catch (error: any) {
            console.error(`[PayoutService] Fatal error processing payout for ${request.transactionId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}
