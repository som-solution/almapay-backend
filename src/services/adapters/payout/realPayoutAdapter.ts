import { PayoutAdapter, PayoutResult } from './payoutAdapter.interface';

export class RealPayoutAdapter implements PayoutAdapter {
    async sendMoney(phoneNumber: string, amount: number, currency: string): Promise<PayoutResult> {
        throw new Error('Real payout adapter not implemented in sandbox mode.');
    }
}
