import { PaymentAdapter, PaymentResult } from './paymentAdapter.interface';
import { generateId } from '../../../utils/idGenerator';

export class FakePaymentAdapter implements PaymentAdapter {
    async processPayment(amount: number, currency: string, source: string): Promise<PaymentResult> {
        console.log(`[FakePayment] Processing payment of ${amount} ${currency} from ${source}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Simulate occasional failure (10% chance)
        if (Math.random() < 0.1) {
            console.log(`[FakePayment] Payment Failed due to random simulation.`);
            return { success: false, error: 'Insufficient Funds (Simulated)' };
        }

        const txId = `FAKE_PAY_${generateId()}`;
        console.log(`[FakePayment] Success. ID: ${txId}`);

        return { success: true, transactionId: txId };
    }
}
