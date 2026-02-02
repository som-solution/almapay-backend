import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function runVerification() {
    console.log('🚀 Starting Verification...');

    try {
        // 1. Health Check
        try {
            await axios.get('http://localhost:3000/health');
            console.log('✅ Server is reachable');
        } catch (e) {
            console.error('❌ Server is NOT running. Please start it with `npx ts-node src/server.ts`');
            return;
        }

        // 2. Login
        console.log('🔑 Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'user@test.com',
            password: 'password'
        });
        const token = loginRes.data.token;
        console.log('✅ Logged in.');

        // 3. Send Money
        console.log('💸 Sending Transaction...');
        const sendRes = await axios.post(
            `${API_URL}/transactions`,
            {
                recipientPhone: '+254700000001',
                amount: 100,
                currency: 'GBP'
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const tx = sendRes.data.data;
        console.log(`✅ Transaction Created: ${tx.id} - Status: ${tx.status}`);

        // 4. Verify History
        console.log('📜 Checking History...');
        const historyRes = await axios.get(`${API_URL}/transactions`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Found ${historyRes.data.data.length} transactions.`);

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.response?.data || error.message);
    }
}

runVerification();
