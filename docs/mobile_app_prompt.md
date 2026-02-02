# AI Prompt: Build a Remittance Mobile App

**Role**: Senior Mobile Developer
**Stack**: React Native (Expo), TypeScript, NativeWind (Tailwind CSS), Axios, React Navigation

**Goal**: Build a cross-platform (iOS/Android) remittance app called "AlmaPay Sandbox" for users to send money from UK to East Africa. The app connects to an existing Node.js/Express backend.

## 1. Project Setup
- Use **Expo** with TypeScript.
- Configure **NativeWind** for styling.
- Navigation: Stack Navigator (Login -> Home -> Send Money).

## 2. Key Screens & Features

### A. Login Screen
- **UI**: Branding Logo, Email, Password, "Sign In" button.
- **Action**: POST to `http://YOUR_LOCAL_IP:3000/api/v1/auth/login`.
    - *Note*: Use local IP (e.g., `192.168.1.x`) instead of `localhost` for testing on physical devices/emulators.
- **Logic**: Store JWT `token` in `SecureStore` (Expo) or `AsyncStorage`.

### B. Home Screen (Dashboard)
- **Header**: Welcome message ("Hello, [Name]").
- **Quick Action**: Large "Send Money" button.
- **Recent Transactions**: List the last 3 transactions.

### C. Send Money Flow
1.  **Recipient Input**: Phone number field (e.g., `+254...`).
2.  **Amount Input**: Field for Amount (GBP). Show estimated exchange rate (Static `1 GBP = 150 KES` for sandbox).
3.  **Confirm**:
    - **Action**: POST to `http://YOUR_LOCAL_IP:3000/api/v1/transactions`.
    - **Payload**: `{ "recipientPhone": "+254...", "amount": 50, "currency": "GBP" }`.
    - **Success**: Navigate to "Success" screen.

### D. Transaction History
- **Data**: Fetch from `GET /api/v1/transactions`.
- **List Item**:
    - Recipient Phone
    - Amount & Currency
    - Status Badge (PENDING, PAID, FAILED).

## 3. Data Types
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface Transaction {
  id: string;
  recipientPhone: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
}
```

## 4. UI Style Guide
- **Primary Color**: Emerald Green (`bg-emerald-600`) — widely used in remittance apps.
- **Buttons**: Rounded-full, high contrast.
- **Layout**: Clean, spacious, standard mobile padding (`p-4`).

## 5. Implementation Instructions
Provide the code for:
1.  `App.tsx` (Navigation Setup)
2.  `api.ts` (Axios configuration with Auth Interceptor).
3.  `screens/LoginScreen.tsx`
4.  `screens/SendMoneyScreen.tsx`
5.  `screens/HistoryScreen.tsx`
