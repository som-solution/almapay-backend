// This is a partial mock of the React Admin Dashboard (e.g. using Tailwind & React)

import React, { useState, useEffect } from 'react';

// Types
interface Transaction {
    id: string;
    amount: string;
    currency: string;
    status: string;
    recipientPhone: string;
    createdAt: string;
}

export const AdminDashboard = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        // API Call Simulation
        fetch('http://localhost:3000/api/v1/admin/transactions', {
            headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
        })
            .then(res => res.json())
            .then(data => setTransactions(data.data));
    }, []);

    const handleRetry = async (id: string) => {
        await fetch(`http://localhost:3000/api/v1/admin/transactions/${id}/retry`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
        });
        alert('Retry initiated');
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">AlmaPay Sandbox Admin</h1>

            <div className="bg-white rounded shadow text-black">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-4 text-left">ID</th>
                            <th className="p-4 text-left">Recipient</th>
                            <th className="p-4 text-left">Amount</th>
                            <th className="p-4 text-left">Status</th>
                            <th className="p-4 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(tx => (
                            <tr key={tx.id} className="border-b">
                                <td className="p-4 text-sm font-mono">{tx.id.substring(0, 8)}...</td>
                                <td className="p-4">{tx.recipientPhone}</td>
                                <td className="p-4 font-bold">{tx.amount} {tx.currency}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${tx.status === 'PAYOUT_SUCCESS' ? 'bg-green-100 text-green-800' :
                                        tx.status === 'PAYOUT_FAILED' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {tx.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {tx.status === 'PAYOUT_FAILED' && (
                                        <button
                                            onClick={() => handleRetry(tx.id)}
                                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                        >
                                            Retry
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
