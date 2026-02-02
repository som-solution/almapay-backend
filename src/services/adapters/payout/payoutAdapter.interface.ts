export interface PayoutResult {
    success: boolean;
    payoutId?: string; // External ID from the provider
    error?: string;
}

export interface PayoutAdapter {
    sendMoney(phoneNumber: string, amount: number, currency: string): Promise<PayoutResult>;
}
