import { PaymentAdapter, PaymentResult } from './paymentAdapter.interface';

export class RealPaymentAdapter implements PaymentAdapter {
    async processPayment(amount: number, currency: string, source: string): Promise<PaymentResult> {
        // In a real app, this would use Stripe/WaafiPay SDKs
        throw new Error('Real payment adapter not implemented in sandbox mode.');
    }
}
