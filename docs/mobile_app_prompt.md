# AI Prompt: Build a Remittance Mobile App (Phase 2 - Gold Standard Finalization)

**Role**: Senior Mobile Developer  
**Stack**: React Native (Expo), TypeScript, NativeWind (Tailwind CSS), Axios, React Navigation  
**Goal**: Finalize "AlmaPay" for production by implementing the **Gold Standard** flow features.

---

## 🚫 CRITICAL: Strict "No Optimistic UI" Policy
This app deals with **real money**.
- **NEVER** show a green "Success" screen until the backend explicitly returns `status: PAYOUT_SUCCESS`.
- **NEVER** assume a transaction worked just because the button was clicked.
- **ALWAYS** rely on backend status polling.

---

## 1. Updated API Configuration (Gold Standard)

Ensure your `api` client handles **Token Refresh** automatically.

### A. Auth & Token Rotation (New! 🔴)
- **Login Response**: Stores `accessToken` (short-lived) and `refreshToken` (long-lived).
- **Interceptor Logic**:
  1. Intercept 401 response.
  2. Call `POST /auth/refresh-token` with `{ refreshToken: storedToken }`.
  3. Retry original request with new `accessToken`.
  4. If refresh fails -> **Force Logout** (`POST /auth/logout` + clear storage).

### B. Base URLs
- **Local IP**: `http://10.170.132.144:3000/api/v1` (Recommended)
- **Production**: (To be provided later)

---

## 2. Updated Screen Flows

### A. Dashboard & Calculator (New! 🔴)
**Endpoint**: `GET /transactions/calculate`
- **Trigger**: Call this whenever the user types an amount.
- **Params**: `?amount=100&currency=GBP&target=KES`
- **Display**: use `data.recipientGets`, `data.rate`, `data.fee`, `data.totalToPay`.
- **Do NOT** calculate locally. Always trust the backend.

### B. Send Money Flow (Status-Driven)
1.  **Initiate**: `POST /transactions/send`
    - Returns `{ ..., clientSecret, id }`
2.  **Payment**: `presentPaymentSheet()` (Stripe)
3.  **Post-Payment (The Critical Change)**:
    - **Do NOT** show "Transfer Complete".
    - **Show**: "Processing..." Spinner.
    - **Action**: Start Polling `GET /transactions/:id/status`.

---

## 3. Polling Logic (The "Heartbeat")

**Endpoint**: `GET /transactions/:id/status`
**Interval**: Every 5 seconds.

### State Machine Handling:
| Backend Status | App UI State | Message |
| :--- | :--- | :--- |
| `CREATED` | 🟡 Loading | "Initializing..." |
| `PAYMENT_PENDING` | 🟡 Loading | "Securely processing payment..." |
| `PAYMENT_SUCCESS` | 🟢 Success (Intermediate) | "Payment received! En route to recipient..." |
| `PAYOUT_PENDING` | 🟡 Loading | "Sending to M-Pesa..." |
| `PAYOUT_SUCCESS` | 🟢 **FINAL SUCCESS** | "Delivered! ✅" (Stop Polling) |
| `PAYMENT_FAILED` | 🔴 Error | "Payment declined. Please try again." (Stop Polling) |
| `PAYOUT_FAILED` | 🔴 Error | "Delivery failed. We are retrying." (Stop Polling) |
| `CANCELLED` | ⚪ Cancelled | "Transaction cancelled." (Stop Polling) |

> [!IMPORTANT]
> Only show the "Transaction Complete" confetti screen when status is **PAYOUT_SUCCESS**.

---

## 4. Admin Features (Optional for Mobile)
*If you are building the Admin view in the app:*
- **User Control**: `POST /admin/users/:id/disable`
- **Cancel Tx**: `POST /admin/transactions/:id/cancel` (Use judiciously)

---

## 5. Deployment Checks
- [ ] **Android**: `npx expo run:android` (Native build required for Stripe)
- [ ] **iOS**: `npx expo run:ios`
- [ ] **Release**: Ensure `console.log` is stripped in production.
