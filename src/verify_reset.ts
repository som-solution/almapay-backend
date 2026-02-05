
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api/v1';

const run = async () => {
    console.log('🚀 Verifying Password Reset Flow...');

    try {
        const email = `reset_test_${uuidv4().substring(0, 8)}@example.com`;
        const pass1 = 'password123';
        const pass2 = 'password456';

        // 1. Register
        console.log('1. Registering...');
        const reg = await axios.post(`${API_URL}/auth/register`, {
            name: 'Reset Tester',
            email,
            phoneNumber: `+44${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            password: pass1
        });
        const userId = reg.data.user.id;
        console.log('   ✅ Registered.');

        // 2. Forgot Password (Request)
        console.log('2. Requesting Forgot Password...');
        await axios.post(`${API_URL}/auth/forgot-password`, { email });
        console.log('   ✅ Request sent.');

        // 3. Extract Token (Simulating Email Click)
        console.log('3. Fetching Token from DB...');
        const resetRecord = await prisma.passwordResetToken.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        if (!resetRecord) throw new Error('Token not found in DB');
        console.log('   ✅ Token found:', resetRecord.token);

        // 4. Reset Password (Execute)
        console.log('4. Resetting Password...');
        await axios.post(`${API_URL}/auth/reset-password`, {
            token: resetRecord.token,
            newPassword: pass2
        });
        console.log('   ✅ Password Reset API Success.');

        // 5. Login with OLD (Fail)
        console.log('5. Verifying Old Password Fail...');
        try {
            await axios.post(`${API_URL}/auth/login`, { email, password: pass1 });
            throw new Error('Old password worked!');
        } catch (e: any) {
            if (e.response?.status === 401) console.log('   ✅ Old Password Rejected.');
            else throw e;
        }

        // 6. Login with NEW (Success)
        console.log('6. Verifying New Password Success...');
        await axios.post(`${API_URL}/auth/login`, { email, password: pass2 });
        console.log('   ✅ New Password Works.');

        console.log('\n🌟 PASSWORD RESET VERIFIED SUCCESSFULLY');

    } catch (error: any) {
        console.error('❌ FAIL:', error.message);
        if (error.response) console.error(error.response.data);
    }
};

run();
