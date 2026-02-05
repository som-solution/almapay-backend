
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

const run = async () => {
    console.log('🔍 Running Quick Verify...');

    // 1. Calculator
    try {
        console.log('1. Testing Public Calculator...');
        const calc = await axios.get(`${API_URL}/transactions/calculate?amount=100&currency=GBP&target=KES`);
        console.log('   ✅ Calculator OK:', calc.data.data.recipientGets > 0 ? 'Math Works' : 'Math Zero');
    } catch (e: any) {
        console.log('   ❌ Calculator FAILED:', e.response?.status || e.message);
        if (e.response?.data) console.log(e.response.data);
    }

    // 2. Admin Login
    try {
        console.log('2. Testing Admin Login (nurkasim442@gmail.com)...');
        const login = await axios.post(`${API_URL}/auth/admin/login`, {
            email: 'nurkasim442@gmail.com',
            password: 'Nur@1234@ak'
        });
        console.log('   ✅ Admin Login OK. Token received.');
    } catch (e: any) {
        console.log('   ❌ Admin Login FAILED:', e.response?.status || e.message);
        if (e.response?.data) console.log(e.response.data);
    }
};

run();
