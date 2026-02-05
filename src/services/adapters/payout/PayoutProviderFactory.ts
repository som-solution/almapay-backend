
import { SandboxPayoutAdapter } from './sandboxPayoutAdapter';
import { RealPayoutAdapter } from './realPayoutAdapter';
import { PayoutProvider } from './payoutAdapter.interface';

export function getPayoutProvider(): PayoutProvider {
    const isProd = process.env.ALMAPAY_ENV === 'production';
    if (isProd) {
        return new RealPayoutAdapter();
    }
    return new SandboxPayoutAdapter();
}
