/**
 * Payout Provider Interface
 * 
 * All payout providers (M-Pesa, WaafiPay, Hormuud, etc.) must implement this interface.
 * 
 * Key principles:
 * - Mobile money is always async
 * - Phone + country always required
 * - No instant confirmation (webhook only)
 */
export interface PayoutProvider {
    /** Provider name (e.g., 'SANDBOX_PAYOUT', 'MPESA', 'WAAFIPAY') */
    readonly name: string;

    /**
     * Initiate a payout with the provider
     * 
     * @param input - Payout details
     * @returns Provider reference and PENDING status
     */
    initiatePayout(input: {
        transactionId: string;
        amount: number;
        currency: string;
        recipient: {
            phone: string;
            country: string;
            name?: string;
        };
        metadata?: Record<string, any>;
    }): Promise<{
        providerReference: string;
        status: 'PENDING';
    }>;
}
