import React, { useState } from 'react';

export const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:3000/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            if (data.user.role !== 'ADMIN') {
                throw new Error('Access denied: Admins only');
            }

            // Success: Store token and redirect
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('Login Successful! Redirecting to dashboard...');
            // window.location.href = '/dashboard'; 

        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Admin Login</h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@almapay.fake"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-semibold"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};
