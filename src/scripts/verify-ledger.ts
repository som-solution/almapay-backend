
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

async function verifyLedger() {
    console.log('🕵️  STARTING LEDGER INVARIANT VERIFICATION...');

    let errors = 0;
    const users = await prisma.user.findMany({ include: { ledgerEntries: true } });

    console.log(`Checking ${users.length} users...`);

    for (const user of users) {
        // 1. Calculate Expected Balance from Ledger
        let calculatedBalance = new Decimal(0);

        // Sort by sequence to ensure replay order (though simple sum doesn't strictly need order, it helps debugging)
        const sortedEntries = user.ledgerEntries.sort((a, b) => Number(a.sequence - b.sequence));

        for (const entry of sortedEntries) {
            if (entry.type === 'DEBIT' || entry.type === 'CHARGEBACK') {
                calculatedBalance = calculatedBalance.minus(entry.amount);
            } else {
                calculatedBalance = calculatedBalance.plus(entry.amount);
            }
        }

        // 2. Compare with Cached Balance
        const cachedBalance = new Decimal(user.balance);

        if (!calculatedBalance.equals(cachedBalance)) {
            console.error(`❌ LEDGER MISMATCH: User ${user.email} (${user.id})`);
            console.error(`   Expected (Ledger): ${calculatedBalance.toFixed(2)}`);
            console.error(`   Actual (Cache):    ${cachedBalance.toFixed(2)}`);
            errors++;
        }

        // 3. Verify Non-Negative (unless authorized - generic check)
        if (calculatedBalance.lessThan(0)) {
            console.error(`❌ NEGATIVE BALANCE: User ${user.email} (${user.id})`);
            console.error(`   Balance: ${calculatedBalance.toFixed(2)}`);
            errors++;
        }
    }

    // 4. System-Wide Invariants (Optional: Total debits vs credits matching if closed loop, but remittance is open loop)
    // For now, User consistency is the primary safety check.

    if (errors === 0) {
        console.log('✅ LEDGER VERIFICATION PASSED: ZERO ERRORS');
        process.exit(0);
    } else {
        console.error(`🛑 VERIFICATION FAILED: ${errors} ERRORS FOUND`);
        process.exit(1);
    }
}

verifyLedger()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
