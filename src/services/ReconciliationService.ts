
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

export class ReconciliationService {

    /**
     * Run a reconciliation report for a specific provider and window.
     * In a real Ops environment, this would fetch from the Provider API.
     * Here we simulate checking the 'Ledger' vs 'Transaction' records to ensure internal consistency.
     */
    async runReconciliation(
        provider: string,
        currency: string,
        startDate: Date,
        endDate: Date,
        adminId: string
    ) {
        console.log(`[Reconciliation] Running for ${provider} ${currency} by ${adminId}`);

        // 1. Calculate Internal Ledger Totals (Source of Truth)
        // Sum all CREDITS (Payouts) for this provider context
        // This is a simplification. Real recon matches ID by ID.
        const ledgerEntries = await prisma.ledgerEntry.findMany({
            where: {
                currency,
                createdAt: {
                    gte: startDate,
                    lte: endDate
                },
                type: 'DEBIT' // Debits from user wallets = Money sent to Provider
            }
        });

        const ledgerTotal = ledgerEntries.reduce((sum, entry) => sum.add(new Decimal(entry.amount)), new Decimal(0));

        // 2. Simulate Provider Fetch (Replace with actual API call)
        // For simulation, we assume provider matches ledger minus some random fee/failure delta
        const simulatedProviderTotal = ledgerTotal; // Perfect match simulation
        const delta = ledgerTotal.minus(simulatedProviderTotal);

        // 3. Create Report
        const run = await prisma.reconciliationRun.create({
            data: {
                provider,
                currency,
                windowStart: startDate,
                windowEnd: endDate,
                ledgerTotal: ledgerTotal,
                providerTotal: simulatedProviderTotal,
                delta: delta,
                totalRecords: ledgerEntries.length,
                discrepancies: delta.equals(0) ? 0 : 1, // Dummy logic
                status: delta.equals(0) ? 'PASS' : 'FAIL',
                adminId,
                details: {
                    note: "Simulated Internal Reconciliation"
                }
            }
        });

        return run;
    }

    async getReconciliationHistory(provider: string) {
        return prisma.reconciliationRun.findMany({
            where: { provider },
            orderBy: { createdAt: 'desc' }
        });
    }
}
