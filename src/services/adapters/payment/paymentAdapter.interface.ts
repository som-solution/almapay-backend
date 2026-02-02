export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
}

export interface PaymentAdapter {
    processPayment(amount: number, currency: string, source: string): Promise<PaymentResult>;
}
