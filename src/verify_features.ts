
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_URL = 'http://localhost:3000/api/v1';

// Random User
const USER_EMAIL = `feature_test_${uuidv4().substring(0, 8)}@example.com`;
const USER_PASS = 'password123';
const NEW_PASS = 'newpassword456';

const run = async () => {
    console.log('🚀 Verifying New Features (Recipients & Password)...');

    try {
        // 1. Register
        console.log('1. Registering User...');
        const reg = await axios.post(`${API_URL}/auth/register`, {
            name: 'Feature Tester',
            email: USER_EMAIL,
            phoneNumber: `+44${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            password: USER_PASS
        });
        const token = reg.data.accessToken;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('   ✅ Registered.');

        // 2. Add Recipient
        console.log('2. Adding Recipient...');
        const rec = await axios.post(`${API_URL}/recipients`, {
            name: 'Mom',
            phoneNumber: '+254712345678'
        }, { headers });
        const recipientId = rec.data.data.id;
        if (!recipientId) throw new Error('No recipient ID returned');
        console.log('   ✅ Recipient Added.');

        // 3. List Recipients
        console.log('3. Listing Recipients...');
        const list = await axios.get(`${API_URL}/recipients`, { headers });
        if (list.data.data.length !== 1) throw new Error('List length incorrect');
        console.log('   ✅ List OK.');

        // 4. Delete Recipient
        console.log('4. Deleting Recipient...');
        await axios.delete(`${API_URL}/recipients/${recipientId}`, { headers });
        const list2 = await axios.get(`${API_URL}/recipients`, { headers });
        if (list2.data.data.length !== 0) throw new Error('Delete failed');
        console.log('   ✅ Delete OK.');

        // 5. Change Password
        console.log('5. Changing Password...');
        await axios.post(`${API_URL}/auth/change-password`, {
            currentPassword: USER_PASS,
            newPassword: NEW_PASS
        }, { headers });
        console.log('   ✅ Password Changed.');

        // 6. Login with Old (Fail)
        console.log('6. Verifying Old Password Fail...');
        try {
            await axios.post(`${API_URL}/auth/login`, { email: USER_EMAIL, password: USER_PASS });
            throw new Error('Old password still worked!');
        } catch (e: any) {
            if (e.response?.status === 401) console.log('   ✅ Old Password Rejected.');
            else throw e;
        }

        // 7. Login with New (Success)
        console.log('7. Verifying New Password Success...');
        await axios.post(`${API_URL}/auth/login`, { email: USER_EMAIL, password: NEW_PASS });
        console.log('   ✅ New Password Works.');

        console.log('\n🌟 ALL FEATURES VERIFIED SUCCESSFULLY');

    } catch (error: any) {
        console.error('❌ FAIL:', error.message);
        if (error.response) console.error(error.response.data);
    }
};

run();
