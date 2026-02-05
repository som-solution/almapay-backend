
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_URL = 'http://localhost:3000/api/v1';

// Re-use a known user or create one
const USER_EMAIL = `extras_test_${uuidv4().substring(0, 8)}@example.com`;
const USER_PASS = 'password123';

const run = async () => {
    console.log('🚀 Verifying Extras (Support & Receipts)...');

    try {
        // 1. Register
        console.log('1. Registering...');
        const reg = await axios.post(`${API_URL}/auth/register`, {
            name: 'Extras Tester',
            email: USER_EMAIL,
            phoneNumber: `+44${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            password: USER_PASS
        });
        const token = reg.data.accessToken;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('   ✅ Registered.');

        // 2. Contact Support
        console.log('2. Testing Support Ticket...');
        await axios.post(`${API_URL}/support/notify`, {
            subject: 'Test Issue',
            message: 'My transaction is stuck!'
        }, { headers });
        console.log('   ✅ Support Ticket Sent.');

        // 3. Create Transaction (to get a receipt)
        console.log('3. Sending Money...');
        const tx = await axios.post(`${API_URL}/transactions/send`, {
            recipientPhone: '+254700000010',
            recipient_name: 'Receipt Receiver',
            amount: 50,
            currency: 'GBP',
            sendingReason: 'Receipt Test'
        }, { headers });
        const txId = tx.data.data.id;
        console.log('   ✅ Transaction Created:', txId);

        // 4. Get Receipt
        console.log('4. Fetching Receipt...');
        const rcpt = await axios.get(`${API_URL}/transactions/${txId}/receipt`, { headers });
        const data = rcpt.data.data;

        if (!data.receiptId || !data.amountSent) throw new Error('Invalid Receipt Data');
        console.log('   ✅ Receipt Fetched:', data.receiptId);
        console.log('      Amount:', data.amountSent);
        console.log('      Fees:', data.fees);

        console.log('\n🌟 EXTRAS VERIFIED SUCCESSFULLY');

    } catch (error: any) {
        console.error('❌ FAIL:', error.message);
        if (error.response) console.error(error.response.data);
    }
};

run();
