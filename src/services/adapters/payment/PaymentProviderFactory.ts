
import { SandboxPaymentAdapter } from './fakePaymentAdapter';
import { RealPaymentAdapter } from './realPaymentAdapter';
import { PaymentProvider } from './paymentAdapter.interface';

export function getPaymentProvider(): PaymentProvider {
    const isProd = process.env.ALMAPAY_ENV === 'production';
    if (isProd) {
        return new RealPaymentAdapter();
    }
    return new SandboxPaymentAdapter();
}
