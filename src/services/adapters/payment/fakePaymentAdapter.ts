import { PaymentAdapter, PaymentResult } from './paymentAdapter.interface';
import { generateId } from '../../../utils/idGenerator';
import axios from 'axios';

export class FakePaymentAdapter implements PaymentAdapter {
    async processPayment(amount: number, currency: string, source: string, transactionId?: string): Promise<PaymentResult> {
        console.log(`[FakePayment] Calling sandbox payment provider for ${amount} ${currency}`);

        try {
            // Call sandbox provider endpoint (async - will send webhook later)
            await axios.post('http://localhost:3000/sandbox/payment', {
                amount,
                currency,
                userId: source,
                transactionId: transactionId || generateId()
            });

            // Return immediately (202 pattern) - actual result comes via webhook
            // This mimics real provider behavior
            const txId = `PENDING_${generateId()}`;
            return { success: true, transactionId: txId };

        } catch (error: any) {
            console.error('[FakePayment] Error calling sandbox provider:', error.message);
            return { success: false, error: 'Provider communication error' };
        }
    }
}
