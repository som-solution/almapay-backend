
import { TransactionStatus } from '@prisma/client';

export type TransactionEvent =
    | 'PAYMENT_AUTHORIZED'
    | 'PAYMENT_CAPTURED'
    | 'PAYMENT_FAILED' // Added
    | 'PAYOUT_INITIATED'
    | 'PAYOUT_CONFIRMED'
    | 'PAYOUT_FAILED'
    | 'REFUND_REQUESTED'
    | 'CANCEL_REQUESTED'
    | 'EXPIRE_AUTH'
    | 'COMPENSATION_TRIGGERED';

export class TransactionStateMachine {

    private static readonly transitions: Record<TransactionStatus, Partial<Record<TransactionEvent, TransactionStatus>>> = {
        [TransactionStatus.CREATED]: {
            'PAYMENT_AUTHORIZED': TransactionStatus.PENDING_PAYMENT,
            'CANCEL_REQUESTED': TransactionStatus.CANCELLED,
            'PAYMENT_FAILED': TransactionStatus.PAYMENT_FAILED
        },
        [TransactionStatus.PENDING_PAYMENT]: {
            'PAYMENT_CAPTURED': TransactionStatus.PAYMENT_RECEIVED,
            'PAYMENT_AUTHORIZED': TransactionStatus.PENDING_PAYMENT, // Idempotent
            'CANCEL_REQUESTED': TransactionStatus.CANCELLED,
            'EXPIRE_AUTH': TransactionStatus.AUTHORIZATION_EXPIRED,
            'PAYMENT_FAILED': TransactionStatus.PAYMENT_FAILED
        },
        [TransactionStatus.PAYMENT_RECEIVED]: {
            'PAYOUT_INITIATED': TransactionStatus.PAYOUT_INITIATED,
            'REFUND_REQUESTED': TransactionStatus.REFUNDED
        },
        [TransactionStatus.PAYOUT_INITIATED]: {
            'PAYOUT_CONFIRMED': TransactionStatus.PAYOUT_SUCCESS,
            'PAYOUT_FAILED': TransactionStatus.PAYOUT_FAILED,
            'COMPENSATION_TRIGGERED': TransactionStatus.PAYOUT_COMPENSATION_REQUIRED
        },
        [TransactionStatus.PAYOUT_PROCESSING]: {
            'PAYOUT_CONFIRMED': TransactionStatus.PAYOUT_SUCCESS,
            'PAYOUT_FAILED': TransactionStatus.PAYOUT_FAILED,
            'COMPENSATION_TRIGGERED': TransactionStatus.PAYOUT_COMPENSATION_REQUIRED
        },
        [TransactionStatus.PAYOUT_FAILED]: {
            'REFUND_REQUESTED': TransactionStatus.REFUNDED,
            'PAYOUT_INITIATED': TransactionStatus.PAYOUT_INITIATED,
            'COMPENSATION_TRIGGERED': TransactionStatus.PAYOUT_COMPENSATION_REQUIRED
        },
        // Final States (Dead Ends)
        [TransactionStatus.PAYOUT_SUCCESS]: {},
        [TransactionStatus.REFUNDED]: {},
        [TransactionStatus.CANCELLED]: {},
        [TransactionStatus.AUTHORIZATION_EXPIRED]: {},
        [TransactionStatus.PAYMENT_FAILED]: {},
        [TransactionStatus.PAYOUT_COMPENSATION_REQUIRED]: {}
    };

    /**
     * Validates if a transition is allowed.
     */
    public static canTransition(current: TransactionStatus, event: TransactionEvent): boolean {
        const allowed = this.transitions[current];
        return !!allowed && !!allowed[event];
    }

    /**
     * Returns the next state or throws error.
     */
    public static transition(current: TransactionStatus, event: TransactionEvent): TransactionStatus {
        const next = this.transitions[current]?.[event];
        if (!next) {
            throw new Error(`Invalid State Transition: Cannot go from ${current} via ${event}`);
        }
        return next;
    }

    /**
     * Checks if the state is considered Economically Final (Terminal).
     */
    public static isTerminal(status: TransactionStatus): boolean {
        return ([
            TransactionStatus.PAYOUT_SUCCESS,
            TransactionStatus.REFUNDED,
            TransactionStatus.CANCELLED,
            TransactionStatus.AUTHORIZATION_EXPIRED,
            TransactionStatus.PAYMENT_FAILED,
            TransactionStatus.PAYOUT_FAILED,
            // Plan says: "Final States: PAYMENT_FAILED, PAYOUT_FAILED, PAYOUT_SUCCESS, REFUNDED, CANCELLED, EXP, COMP"
            TransactionStatus.PAYOUT_COMPENSATION_REQUIRED
        ] as TransactionStatus[]).includes(status);
    }
}

export class InvalidStateTransitionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidStateTransitionError';
    }
}
