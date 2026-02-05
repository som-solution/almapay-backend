
export interface PayoutRequest {
    transactionId: string;
    amount: number;
    currency: string;
    recipientPhone: string;
}

export interface PayoutResult {
    success: boolean;
    providerRef?: string;
    error?: string;
}

export interface PayoutProvider {
    payout(request: PayoutRequest): Promise<PayoutResult>;
}
