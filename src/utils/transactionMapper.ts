
import { TransactionStatus } from '@prisma/client';

export function mapToUserContract(tx: any) {
    let status = 'PROCESSING';
    let statusDisplay = 'Processing...';
    let statusColor = '#3B82F6'; // Blue
    let isTerminal = false;

    switch (tx.status) {
        case TransactionStatus.PAYOUT_SUCCESS:
            status = 'SENT';
            statusDisplay = 'Sent';
            statusColor = '#10B981'; // Green
            isTerminal = true;
            break;
        case TransactionStatus.PAYMENT_FAILED:
        case TransactionStatus.PAYOUT_FAILED:
        case TransactionStatus.CANCELLED:
            status = 'FAILED';
            statusDisplay = 'Failed';
            statusColor = '#EF4444'; // Red
            isTerminal = true;
            break;
        case TransactionStatus.REFUNDED:
            status = 'REFUNDED';
            statusDisplay = 'Refunded';
            statusColor = '#6B7280'; // Gray
            isTerminal = true;
            break;
        default:
            status = 'PROCESSING';
            statusDisplay = 'Processing...';
            statusColor = '#3B82F6'; // Blue
            isTerminal = false;
    }

    return {
        id: tx.id,
        amount: Number(tx.amount),
        currency: tx.currency,
        recipientPhone: tx.recipientPhone,
        exchangeRate: Number(tx.exchangeRate || 1.0),
        fees: Number(tx.fees || 0.0),
        discount: Number(tx.discount || 0.0),
        totalAmount: Number(tx.totalAmount || tx.amount),
        recipientAmount: Number(tx.recipientAmount || tx.amount),
        recipientCurrency: tx.recipientCurrency || 'KES',
        status,
        statusDisplay,
        statusColor,
        isTerminal,
        createdAt: tx.createdAt,
        // Include helpful failure reason if failed
        failureReason: status === 'FAILED' ? (tx.failureReason || 'Transaction could not be completed') : undefined
    };
}
