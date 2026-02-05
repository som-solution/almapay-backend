# Pilot Launch Approval

**Date**: 2026-02-05
**Status**: 🟢 **APPROVED FOR LIMITED PILOT**
**Clearance Level**: REAL MONEY (Controlled)

## 🛡️ Safety Certification
The **AlmaPay Backend** has passed the "Bank-Grade" Engineering Audit.

| Domain | Status | Proof |
| :--- | :--- | :--- |
| **Financial Core** | ✅ SAFE | Ledger Atomicity & Idempotency verified. |
| **Adversarial Resilience** | ✅ SAFE | Red Team Assault (10 Vectors) blocked. |
| **Provider Chaos** | ✅ SAFE | Duplicate/Missing/Reordered Webhooks handled. |
| **Operational Safety** | ✅ SAFE | Kill-Switches & Global Caps active. |

## 🚦 Pilot Constraints (NON-NEGOTIABLE)
You are approved to go live **IF AND ONLY IF** you adhere to these limits:

1.  **Audience**: Internal Users / Beta Testers ONLY. No public traffic.
2.  **Transaction Caps**:
    -   **Per User**: £50 / day.
    -   **Global Cap**: £1,000 / day (Hardcoded in `LimitService`).
3.  **Monitoring**: Manual review of `AdminActionLog` and Ledger every 2 hours for the first 48h.
4.  **Scaling**: Auto-scaling **DISABLED**. Single instance only to simplify log analysis.

## 📝 Pre-Flight Requirements (Manual)
Before the first real cent moves, you MUST:

- [ ] **Rotate Secrets**: Generate new `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY` immediately before deploy.
- [ ] **The "Penny Test"**: Process exactly **£0.01**. Verify Ledger debits match Bank Settlement.
- [ ] **Safety Drill**: While live, toggle the "PAUSE PAYMENT" kill-switch and confirm traffic stops strictly.

## 🛑 Emergency Abort
If **ANY** of the following occur, trigger the **KILL SWITCH** immediately:
1.  Ledger drift > £0.00.
2.  More than 1 Stripe Webhook failed > 3 times.
3.  Any unexpected 500 error in `TransactionService`.

**Signed Off By**:
*Senior Engineering Reviewer*
*Date: 2026-02-05*
