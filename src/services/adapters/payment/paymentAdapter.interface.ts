
export interface PaymentRequest {
    transactionId: string;
    amount: number;
    currency: string;
    customer: {
        name: string;
        email: string;
        phone?: string;
    };
}

export interface PaymentResult {
    success: boolean;
    providerReference?: string;
    clientSecret?: string;
    error?: string;
}

export interface PaymentProvider {
    initiatePayment(request: PaymentRequest): Promise<PaymentResult>;
}
