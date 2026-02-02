// This is a partial mock of the React Native Mobile App

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export const SendMoneyScreen = () => {
    const [phone, setPhone] = useState('+254');
    const [amount, setAmount] = useState('');

    const handleSend = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/v1/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer some_valid_jwt`
                },
                body: JSON.stringify({
                    recipientPhone: phone,
                    amount: Number(amount),
                    currency: 'GBP'
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                Alert.alert('Success', 'Transaction Initiated');
                // Navigate to History
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to send');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Send Money to East Africa</Text>

            <Text style={styles.label}>Recipient Phone</Text>
            <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+254..."
            />

            <Text style={styles.label}>Amount (GBP)</Text>
            <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />

            <TouchableOpacity style={styles.btn} onPress={handleSend}>
                <Text style={styles.btnText}>Send Instantly</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f5f5f5' },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, color: '#333' },
    label: { fontSize: 16, marginBottom: 8, color: '#666' },
    input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16 },
    btn: { backgroundColor: '#00D1B2', padding: 18, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
