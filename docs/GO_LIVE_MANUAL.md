# FINAL GO-LIVE MANUAL (REAL MONEY)

**WARNING**: Execute this checklist ONLY when you are ready to process real transactions. Skipping steps causes financial loss.

## PHASE 0 — FREEZE CODE
Do not proceed until you have:
1. Stopped all feature development.
2. Committed all changes (if git is available locally).
```bash
git status # Must be clean
git tag v1.0.0-rc1
git push origin main --tags
```

## PHASE 1 — DATABASE SAFETY
Ensure your production database is migrated and backed up.
```bash
# 1. Backup
pg_dump $DATABASE_URL > pre_live_backup.sql

# 2. Deploy Migrations (NEVER use db push)
NODE_ENV=production npx prisma migrate deploy
```

## PHASE 2 — ENVIRONMENT LOCKDOWN
Update your `.env` on the production server (Vercel/Render/EC2).
**Critical Values**:
```ini
NODE_ENV=production
ALMAPAY_ENV=live

# Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...

# Safety Nets
ENABLE_SAFETY_NET=true
MAX_TRANSACTION_LIMIT=5000
```
**Verification**:
Run `grep "test_" .env` -> Should return NOTHING.

## PHASE 3 — STRIPE LIVE VERIFICATION
1. **Activate Account**: Complete KYC on Stripe Dashboard.
2. **Webhooks Setup**: Point `https://api.your-domain.com/api/v1/webhooks/stripe` to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`

## PHASE 4 — BACKEND SELF-TESTS
Run these on the PRODUCTION console/SSH:
```bash
# 1. Ledger Integrity
npx ts-node src/scripts/verify-ledger.ts
# Must return: "0 violations"

# 2. Reconciliation Check
POST /api/v1/admin/reconciliation/run
```

## PHASE 5 — £0.01 LIVE MONEY TEST (CRITICAL)
**Do this yourself before opening to users.**
1. Create a controlled user account.
2. Send **£0.01** using a real bank card.
3. Verify:
   - [ ] Stripe Charge Succeeded
   - [ ] Backend Status: `PAYMENT_AUTHORIZED`
   - [ ] Ledger: 1 Debit Entry exists
   - [ ] Payout: Sandbox Mock Success (Simulated)
   - [ ] Notification Received

## PHASE 6 — ADMIN HARD CHECK
Login as `SUPER_ADMIN` and verify you can:
- [ ] Freeze a user
- [ ] Refund a transaction
- [ ] View Audit Logs

## PHASE 7 — MONITORING
Watch these metrics for the first 24 hours:
- **Ledger Mismatch**: (Run verify script hourly)
- **Pending Payouts**: Alert if > 24h
- **Webhook Failures**: Alert if > 5 retries

## 🔴 EMERGENCY ROLLBACK
If any financial anomaly occurs:
1. update env: `PAYMENT_PROVIDER=DISABLED`
2. Restart Server.
