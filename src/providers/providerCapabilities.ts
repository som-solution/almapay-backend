/**
 * Provider Capabilities
 * 
 * Defines what each provider supports. Used by:
 * - Admin UI to show/hide retry/refund buttons
 * - Business logic to prevent invalid operations
 * - Compliance (some providers can't refund)
 */

export interface ProviderCapability {
    /** Can retry failed transactions */
    supportsRetry: boolean;

    /** Can refund completed transactions */
    supportsRefund: boolean;

    /** Only supports async operations (no sync) */
    asyncOnly: boolean;
}

/**
 * Provider capability matrix
 * 
 * Update this when adding new providers
 */
export const PROVIDER_CAPABILITIES: Record<string, ProviderCapability> = {
    SANDBOX_PAYMENT: {
        supportsRetry: true,
        supportsRefund: true,
        asyncOnly: true
    },
    SANDBOX_PAYOUT: {
        supportsRetry: true,
        supportsRefund: false,  // Mobile money typically can't refund
        asyncOnly: true
    },

    // Future providers:
    // MPESA: {
    //     supportsRetry: false,  // M-Pesa doesn't support retry
    //     supportsRefund: false, // M-Pesa can't refund
    //     asyncOnly: true
    // },
    // WAAFIPAY: {
    //     supportsRetry: false,
    //     supportsRefund: false,
    //     asyncOnly: true
    // },
    // STRIPE: {
    //     supportsRetry: true,
    //     supportsRefund: true,
    //     asyncOnly: true
    // }
};

/**
 * Get capabilities for a provider
 * 
 * @param providerName - Provider name (e.g., 'MPESA', 'SANDBOX_PAYMENT')
 * @returns Provider capabilities
 */
export function getProviderCapabilities(providerName: string): ProviderCapability {
    return PROVIDER_CAPABILITIES[providerName] || {
        // Safe defaults for unknown providers
        supportsRetry: false,
        supportsRefund: false,
        asyncOnly: true
    };
}
