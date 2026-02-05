import { PaymentProvider } from './payment/PaymentProvider';
import { PayoutProvider } from './payout/PayoutProvider';
import { SandboxPaymentProvider } from './payment/SandboxPaymentProvider';
import { StripePaymentProvider } from './payment/StripePaymentProvider';
import { SandboxPayoutProvider } from './payout/SandboxPayoutProvider';

/**
 * Get payment provider based on environment configuration
 * 
 * Production usage:
 * - Set PAYMENT_PROVIDER=STRIPE in .env
 * - Zero code changes needed
 * 
 * @returns Payment provider instance
 */
export function getPaymentProvider(): PaymentProvider {
    const provider = process.env.PAYMENT_PROVIDER || 'SANDBOX';

    switch (provider.toUpperCase()) {
        case 'SANDBOX':
            return new SandboxPaymentProvider();

        case 'STRIPE':
            if (process.env.ALMAPAY_ENV !== 'live') {
                throw new Error("Safety Guard: Real Payment Provider (STRIPE) blocked. Set ALMAPAY_ENV=live to enable real money flows.");
            }
            return new StripePaymentProvider();

        default:
            console.warn(`Unknown payment provider: ${provider}, using SANDBOX`);
            return new SandboxPaymentProvider();
    }
}

/**
 * Get payout provider based on environment configuration
 * 
 * Production usage:
 * - Set PAYOUT_PROVIDER=MPESA in .env
 * - Zero code changes needed
 * 
 * @returns Payout provider instance
 */
export function getPayoutProvider(): PayoutProvider {
    const provider = process.env.PAYOUT_PROVIDER || 'SANDBOX';

    switch (provider.toUpperCase()) {
        case 'SANDBOX':
            return new SandboxPayoutProvider();

        // Future providers (just add implementation):
        // case 'MPESA':
        //     return new MPesaPayoutProvider();
        // case 'WAAFIPAY':
        //     return new WaafiPayPayoutProvider();
        // case 'HORMUUD':
        //     return new HormuudPayoutProvider();

        default:
            console.warn(`Unknown payout provider: ${provider}, using SANDBOX`);
            return new SandboxPayoutProvider();
    }
}
