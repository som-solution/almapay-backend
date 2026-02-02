import { PayoutAdapter, PayoutResult } from './payoutAdapter.interface';
import { PrismaClient } from '@prisma/client';
import { generateId } from '../../../utils/idGenerator';

const prisma = new PrismaClient();

export class SandboxPayoutAdapter implements PayoutAdapter {
    async sendMoney(phoneNumber: string, amount: number, currency: string): Promise<PayoutResult> {
        console.log(`[SandboxPayout] Sending ${amount} ${currency} to ${phoneNumber}`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Find the sandbox wallet
            let wallet = await prisma.sandboxWallet.findUnique({
                where: { phoneNumber },
            });

            if (!wallet) {
                // Auto-create wallet in sandbox mode for better UX
                console.log(`[SandboxPayout] Wallet not found. Auto-creating for ${phoneNumber}`);
                wallet = await prisma.sandboxWallet.create({
                    data: {
                        phoneNumber,
                        currency: 'KES',
                        balance: 0,
                        isActive: true
                    }
                });
            }

            if (!wallet.isActive) {
                return { success: false, error: 'Recipient wallet is inactive' };
            }

            // Update balance
            await prisma.sandboxWallet.update({
                where: { phoneNumber },
                data: {
                    balance: { increment: amount },
                },
            });

            const payoutsId = `SANDBOX_PAYOUT_${generateId()}`;
            console.log(`[SandboxPayout] Success. ID: ${payoutsId}`);

            return { success: true, payoutId: payoutsId };
        } catch (error) {
            console.error('[SandboxPayout] Error:', error);
            return { success: false, error: 'Internal Sandbox Error' };
        }
    }
}
