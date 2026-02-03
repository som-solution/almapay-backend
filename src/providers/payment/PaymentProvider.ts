/**
 * Payment Provider Interface
 * 
 * All payment providers (Stripe, Checkout.com, etc.) must implement this interface.
 */
export interface PaymentProvider {
    /** Provider name (e.g., 'SANDBOX_PAYMENT', 'STRIPE', 'CHECKOUT') */
    readonly name: string;

    /**
     * Initiate a payment with the provider
     * 
     * @param input - Payment details
     * @returns Provider reference, status, and optional clientSecret
     */
    initiatePayment(input: {
        transactionId: string;
        amount: number;
        currency: string;
        customer: {
            name: string;
            phone?: string;
            email?: string;
        };
        metadata?: Record<string, any>;
    }): Promise<{
        providerReference: string;
        status: 'PENDING';
        clientSecret?: string; // Critical for Mobile SDK (Stripe/Checkout)
    }>;
}
