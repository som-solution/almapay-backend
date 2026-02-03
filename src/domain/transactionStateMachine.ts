import { TransactionStatus } from '@prisma/client';

/**
 * IMMUTABLE TRANSACTION STATE MACHINE
 * 
 * This defines the only valid state transitions for money transfers.
 * Violating these rules = regulatory rejection.
 * 
 * Industry Standard: Wise / Remitly / WorldRemit
 */

// Allowed state transitions (THE LAW)
export const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
    CREATED: [
        TransactionStatus.PAYMENT_PENDING,
        TransactionStatus.CANCELLED
    ],

    PAYMENT_PENDING: [
        TransactionStatus.PAYMENT_SUCCESS,
        TransactionStatus.PAYMENT_FAILED
    ],

    PAYMENT_SUCCESS: [
        TransactionStatus.PAYOUT_PENDING
    ],

    PAYMENT_FAILED: [
        TransactionStatus.PAYMENT_PENDING, // Retry allowed
        TransactionStatus.CANCELLED
    ],

    PAYOUT_PENDING: [
        TransactionStatus.PAYOUT_SUCCESS,
        TransactionStatus.PAYOUT_FAILED
    ],

    PAYOUT_FAILED: [
        TransactionStatus.PAYOUT_PENDING,  // Retry allowed
        TransactionStatus.REFUND_PENDING
    ],

    REFUND_PENDING: [
        TransactionStatus.REFUNDED
    ],

    // TERMINAL STATES (Cannot transition out)
    PAYOUT_SUCCESS: [],
    REFUNDED: [],
    CANCELLED: []
};

/**
 * CRITICAL: Validates that a state transition is allowed
 * 
 * @throws Error if transition is invalid
 */
export function assertTransitionAllowed(
    from: TransactionStatus,
    to: TransactionStatus
): void {
    const allowed = ALLOWED_TRANSITIONS[from] || [];

    if (!allowed.includes(to)) {
        throw new InvalidStateTransitionError(
            `Invalid transaction state transition: ${from} → ${to}. ` +
            `Allowed transitions from ${from}: ${allowed.length > 0 ? allowed.join(', ') : 'NONE (terminal state)'}`
        );
    }
}

/**
 * Check if a status is terminal (cannot be changed)
 */
export function isTerminalState(status: TransactionStatus): boolean {
    return ALLOWED_TRANSITIONS[status].length === 0;
}

/**
 * Check if a transaction can be retried
 */
export function canRetry(status: TransactionStatus): boolean {
    return status === TransactionStatus.PAYMENT_FAILED ||
        status === TransactionStatus.PAYOUT_FAILED;
}

/**
 * Check if a transaction can be refunded
 * 
 * CRITICAL: Only failed payouts can be refunded
 * Successful payouts CANNOT be refunded (industry standard)
 */
export function canRefund(status: TransactionStatus): boolean {
    return status === TransactionStatus.PAYOUT_FAILED;
}

/**
 * Check if a transaction can be cancelled
 */
export function canCancel(status: TransactionStatus): boolean {
    return status === TransactionStatus.CREATED ||
        status === TransactionStatus.PAYMENT_FAILED;
}

/**
 * Get all valid next states for a given status
 */
export function getValidNextStates(status: TransactionStatus): TransactionStatus[] {
    return ALLOWED_TRANSITIONS[status] || [];
}

/**
 * Custom error class for invalid state transitions
 */
export class InvalidStateTransitionError extends Error {
    public readonly statusCode = 400;
    public readonly from?: TransactionStatus;
    public readonly to?: TransactionStatus;

    constructor(message: string, from?: TransactionStatus, to?: TransactionStatus) {
        super(message);
        this.name = 'InvalidStateTransitionError';
        this.from = from;
        this.to = to;

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InvalidStateTransitionError);
        }
    }
}

/**
 * Visual representation of the state machine flow
 * 
 * HAPPY PATH:
 * CREATED → PAYMENT_PENDING → PAYMENT_SUCCESS → PAYOUT_PENDING → PAYOUT_SUCCESS (FINAL)
 * 
 * PAYMENT FAILURE PATH:
 * PAYMENT_PENDING → PAYMENT_FAILED → [RETRY or CANCELLED]
 * 
 * PAYOUT FAILURE PATH:
 * PAYOUT_PENDING → PAYOUT_FAILED → [RETRY or REFUND_PENDING → REFUNDED]
 * 
 * CANCELLATION PATH:
 * CREATED → CANCELLED (FINAL)
 * PAYMENT_FAILED → CANCELLED (FINAL)
 */
