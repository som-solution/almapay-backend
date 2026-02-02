# AI Prompt: Build a Remittance Admin Dashboard

**Role**: Senior Frontend Developer
**Stack**: React (Vite), Tailwind CSS, Lucide React (Icons), Axios

**Goal**: Build a modern, responsive Admin Dashboard for a Remittance App called "AlmaPay Sandbox". The dashboard connects to an existing Node.js/Express backend.

## 1. Project Setup
- Use Vite to initialize the project.
- Configure Tailwind CSS for styling.
- Structure: `src/components`, `src/pages`, `src/services`.

## 2. Key Pages & Features

### A. Login Page (`/login`)
- **UI**: Clean, centered card. Email & Password fields.
- **Action**: POST to `http://localhost:3000/api/v1/auth/login`.
- **Logic**: Store the returned JWT `token` in localStorage. Redirect to `/dashboard`.

### B. Dashboard Layout
- **Sidebar**: Links for "Overview", "Transactions", "Users", "Audit Logs".
- **Header**: Shows "Admin User" profile and Logout button.

### C. Transactions Page (`/transactions`)
- **Data**: Fetch from `GET http://localhost:3000/api/v1/admin/transactions`.
- **Table Columns**:
    - **ID**: Truncate (e.g., `...a1b2`).
    - **Sender**: Show Sender Name.
    - **Recipient**: Phone Number.
    - **Amount**: Format as currency (e.g., `£100.00`).
    - **Status**: Color-coded badges:
        - `PENDING_PAYMENT` (Yellow)
        - `PAYMENT_CONFIRMED` (Blue)
        - `PAYOUT_SUCCESS` (Green)
        - `PAYOUT_FAILED` (Red)
- **Actions (Buttons per row)**:
    - **Retry**: Only if status is `PAYOUT_FAILED`.
        - API: `POST /api/v1/admin/transactions/:id/retry`
    - **Refund**: Only if status is `PAYMENT_CONFIRMED` or `PAYOUT_FAILED`.
        - API: `POST /api/v1/admin/transactions/:id/refund` (Note: You may need to mock this endpoint response if not fully implemented).

## 3. Data Types (TypeScript Interfaces)
Match this backend schema:
```typescript
interface Transaction {
  id: string;
  sender: { name: string; email: string };
  recipientPhone: string;
  amount: string;
  currency: string;
  status: 'PENDING_PAYMENT' | 'PAYMENT_CONFIRMED' | 'PAYOUT_IN_PROGRESS' | 'PAYOUT_SUCCESS' | 'PAYOUT_FAILED';
  createdAt: string;
}
```

## 4. UI Style Guide
- **Colors**: Primary Blue (`blue-600`), Background Gray (`gray-50`), White Cards (`white shadow-sm`).
- **Typography**: Inter or system sans-serif.
- **Feedback**: Use toast notifications (e.g., `react-hot-toast`) for success/error messages (e.g., "Retry Initiated").

## 5. Implementation Instructions
Provide the code for:
1.  `App.jsx` (Routes)
2.  `api.js` (Axios instance with Interceptor to add `Authorization: Bearer <token>`).
3.  `TransactionsTable.jsx` (The main view).
4.  `LoginPage.jsx`.
