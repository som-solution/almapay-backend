import { PayoutAdapter, PayoutResult } from './payoutAdapter.interface';
import { PrismaClient } from '@prisma/client';
import { generateId } from '../../../utils/idGenerator';
import axios from 'axios';

const prisma = new PrismaClient();

export class SandboxPayoutAdapter implements PayoutAdapter {
    async sendMoney(phoneNumber: string, amount: number, currency: string, transactionId?: string): Promise<PayoutResult> {
        console.log(`[SandboxPayout] Calling sandbox payout provider for ${phoneNumber}`);

        try {
            // Call sandbox provider endpoint (async - will send webhook later)
            await axios.post('http://localhost:3000/sandbox/payout', {
                phone: phoneNumber,
                amount,
                currency,
                transactionId: transactionId || generateId()
            });

            // Return immediately (202 pattern) - actual result comes via webhook
            const payoutId = `PENDING_${generateId()}`;
            return { success: true, payoutId };

        } catch (error: any) {
            console.error('[SandboxPayout] Error calling sandbox provider:', error.message);
            return { success: false, error: 'Provider communication error' };
        }
    }
}
