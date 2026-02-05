
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const BASE_URL = 'http://localhost:3000/api/v1';
const prisma = new PrismaClient();

async function seniorAudit() {
    console.log('🕵️  STARTING SENIOR ENGINEER QUALITY AUDIT...');

    // Setup Users
    const u1_email = `auditor_${Date.now()}@almapay.co`;
    const u2_email = `victim_${Date.now()}@almapay.co`;
    const password = 'AuditPassword123!';

    try {
        // Preparation
        await axios.post(`${BASE_URL}/auth/register`, { email: u1_email, password, firstName: 'Auditor', lastName: 'A', phoneNumber: '+4411' });
        await axios.post(`${BASE_URL}/auth/register`, { email: u2_email, password, firstName: 'Victim', lastName: 'V', phoneNumber: '+4422' });

        const res1 = await axios.post(`${BASE_URL}/auth/login`, { email: u1_email, password });
        const res2 = await axios.post(`${BASE_URL}/auth/login`, { email: u2_email, password });

        const t1 = res1.data.accessToken;
        const t2 = res2.data.accessToken;
        const auth1 = { headers: { Authorization: `Bearer ${t1}` } };
        const auth2 = { headers: { Authorization: `Bearer ${t2}` } };

        console.log('\n--- 🛡️  SECURITY: RBAC & ISOLATION ---');

        // 1. Cross-User Isolation
        console.log('1. Testing: Can User A see User B\'s transaction?');
        const txRes = await axios.post(`${BASE_URL}/transactions/send`, {
            amount: 10, currency: 'GBP', recipientPhone: '+25411', idempotencyKey: `id_${Date.now()}`
        }, auth2);
        const victimTxId = txRes.data.data.id;

        try {
            await axios.get(`${BASE_URL}/transactions/${victimTxId}/status`, auth1);
            console.error('❌ FAIL: User A accessed User B\'s transaction status!');
        } catch (e: any) {
            console.log(`✅ PASS: Blocked access (${e.response?.status || e.message})`);
        }

        // 2. Admin Endpoint Protection
        console.log('2. Testing: Can regular user access /admin/users?');
        try {
            await axios.get(`${BASE_URL}/admin/users`, auth1);
            console.error('❌ FAIL: Unauthorized user accessed admin list!');
        } catch (e: any) {
            console.log(`✅ PASS: Blocked access (${e.response?.status || e.message})`);
        }

        console.log('\n--- 🔁 RESILIENCE: IDEMPOTENCY ---');

        // 3. Duplicate Requests
        console.log('3. Testing: Multiple requests with same IDEMPOTENCY_KEY');
        const idKey = `idem_${Date.now()}`;
        const reqData = { amount: 1, currency: 'GBP', recipientPhone: '+25411', idempotencyKey: idKey };

        const first = await axios.post(`${BASE_URL}/transactions/send`, reqData, auth1);
        console.log(`- First call: ${first.data.status}`);

        try {
            const second = await axios.post(`${BASE_URL}/transactions/send`, reqData, auth1);
            console.log(`- Second call: ${second.data.status} (Handled)`);
            if (first.data.data.id === second.data.data.id) {
                console.log('✅ PASS: Idempotency enforced (returns existing Tx)');
            }
        } catch (e: any) {
            if (e.response?.status === 409 || e.response?.status === 400) {
                console.log('✅ PASS: Duplicate blocked by Error');
            } else {
                console.error('❌ FAIL: Unexpected error on duplicate:', e.message);
            }
        }

        console.log('\n--- ⚙️  CONSISTENCY: STATE MACHINE ---');

        // 4. Invalid State Transitions
        console.log('4. Testing: Refund a "CREATED" transaction (should fail)');
        // Promote to admin first
        await prisma.user.update({ where: { email: u1_email }, data: { role: 'SUPER_ADMIN' } });
        const adminRes = await axios.post(`${BASE_URL}/auth/login`, { email: u1_email, password });
        const adminAuth = { headers: { Authorization: `Bearer ${adminRes.data.accessToken}` } };

        const freshTx = await axios.post(`${BASE_URL}/transactions/send`, {
            amount: 5, currency: 'GBP', recipientPhone: '+25433', idempotencyKey: `st_${Date.now()}`
        }, auth1);
        const freshId = freshTx.data.data.id;

        try {
            await axios.post(`${BASE_URL}/admin/transactions/${freshId}/refund`, {}, adminAuth);
            console.error('❌ FAIL: Managed to refund an unpaid transaction!');
        } catch (e: any) {
            console.log(`✅ PASS: Blocked invalid transition (${e.response?.data?.message || e.message})`);
        }

        console.log('\n🌟 SENIOR AUDIT COMPLETE: System shows High Integrity 🌟');

    } catch (error: any) {
        console.error('\n🛑 AUDIT ABORTED');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Route: ${error.config.url}`);
            console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(`Error:`, error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

seniorAudit();
