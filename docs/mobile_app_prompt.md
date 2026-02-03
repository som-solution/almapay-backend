# AI Prompt: Build a Remittance Mobile App (Phase 2 - Compliance & Direct Pay)

**Role**: Senior Mobile Developer  
**Stack**: React Native (Expo), TypeScript, NativeWind (Tailwind CSS), Axios, React Navigation  
**Goal**: Build a cross-platform remittance app (AlmaPay) that mirrors **Paysii/TapTap Send**.

## 1. Upgrade Instructions (Phase 2)
This app has been upgraded to a **Direct Transfer Model** (No Wallet). We also now enforce **UK Compliance (KYC)**.

### Core Changes:
- **No Wallet**: Users pay directly via Card for every transfer.
- **Strict KYC**: Users must provide DOB and UK Address (Postcode Lookup).
- **Compliance Rules**: Transfers > £300 require a "Reason for Sending".
- **Real-time Rates**: The app must calculate rates on the fly.

---

### Development Environment Note (Expo Go vs Builds)
> [!WARNING]
> **Expo Go Limitations**: The `expo-notifications` module does **not** work within Expo Go on Android/iOS.
> To test Push Notifications, you MUST build a development client:
> - Android: `npx expo run:android`
> - iOS: `npx expo run:ios`
> If testing on Expo Go, please disable/mock the notification logic to avoid crashes.

---

## 2. API Configuration

Choose the best option for your setup:

### A. Local IP (RECOMMENDED - Best for UK ISPs)
> [!IMPORTANT]
> Some UK ISPs (like **Vodafone**) block `localtunnel` links as "anonymizers". 
> **Use this Local IP path** for faster, reliable testing on the same Wi-Fi.

```typescript
const api = axios.create({
  baseURL: 'http://10.170.132.144:3000/api/v1'
});
```

### B. Public Tunnel (Fallback)
*Use this only if you are testing on mobile data and your ISP allows it.*
```typescript
const api = axios.create({
  baseURL: 'https://dirty-sites-press.loca.lt/api/v1',
  headers: {
    'bypass-tunnel-reminder': 'true'
  }
});
```

---

## 3. Screen Breakdown

### A. Login & Register
- **Register**: 
  - Fields: Name, Email, Phone (`+44...`), Password.
  - Action: `POST /auth/register`
- **Login**: 
  - Action: `POST /auth/login`
  - Store JWT Token.

### B. KYC Onboarding (New! 🔴)
*Trigger this screen immediately after Registration or before the first transfer if `user.isKycComplete` is false.*

1.  **Date of Birth**:
    - Input: Date Picker (DD/MM/YYYY).
2.  **Address Lookup**:
    - Input: UK Postcode (e.g., `SW1A 1AA`).
    

- **Logic**:
  - `GET /compliance/postcode-lookup?postcode=SW1A 1AA`.
  - **Display**: Dropdown of addresses returned in `data.addresses`.
  - **Manual**: Allow user to type House Number/Street if not found.

- **Trigger**: NOT on Signup. This screen/modal is ONLY triggered during the "Send Money" flow (See Section D).


3.  **Save Profile**:
    - Action: `PATCH /compliance/profile`
    - Payload: `{ dob, addressLine1, city, postcode }`

### C. Home Dashboard
- **Header**: "Hello, [Name]".
- **Rate Card**: Show Live Rate.
  - Call `GET /rates/calculate?amount=1` to get the base rate.
  - Display: "1 GBP = [rate] KES".
- **CTA**: Large "Send Money" button (Primary Action).
- **Recents**: List last 3 transactions from `GET /transactions`.


### D. Send Money Flow (Direct Pay)
1.  **Recipient Input**: 
    - Field: Phone number (`+254...`).
    - **Logic**: debounce call to `GET /transactions/recipient/lookup?phone=...`.
    - **Valid**: Show user's Name (Green check).
    - **Invalid (404)**: Show error "Is unavailable" (Block 'Next' button).

2.  **Amount Input**: 
    - Field: Amount (GBP).
    - **Logic**: Call `GET /rates/calculate?amount=...` as user types.
    - **Display**: 
      - Recipient Gets: [recipientGets] KES
      - Exchange Rate: [rate]
      - Fee: [fee] GBP
      - **Total To Pay**: [totalToPay] GBP


3.  **Compliance Check (Logic Rule) (New! 🔴)**:
    - **Scenario 1: Amount <= £300**: 
      - ✅ **Do NOT** ask for KYC.
      - ✅ **Do NOT** ask for Reason.
      - -> Proceed to Payment.

    - **Scenario 2: Amount > £300 (First Time User)**:
      - **Check**: `user.isKycComplete` is `false`.
      - **Action 1**: Open **KYC Modal** -> User enters DOB & Address -> Save (`PATCH /compliance/profile`).
      - **Action 2**: Show "Reason for Sending" Input.
      - -> Proceed to Payment.

    - **Scenario 3: Amount > £300 (Returning User)**:
      - **Check**: `user.isKycComplete` is `true`.
      - **Action**: **Skip KYC**. Only show "Reason for Sending" Input.
      - -> Proceed to Payment.


4.  **Payment (Stripe - Live Mode Migration)**:
    - **Method**: Use `StripeProvider.presentPaymentSheet()`.
    - **Configuration**:
      - Use **Live Mode** Publishable Key: `pk_live_51P938sGVaOAFmi3Gnv1JfTaRExZCs4xnlONINzD1wTvsixGokc4QJPnq0PkRr7vi4pMr29C6kQWXWsnuD8FLkNBa00TwiA2fue`
      - **Google Pay**: 
        - Ensure `googlePay` is enabled in `initPaymentSheet`.
        - Set `merchantCountryCode: 'GB'`.
        - Set `testEnv: false` for real production payments.
      - **Apple Pay**: Configure Apple Merchant ID in Stripe Dashboard + Xcode.
    - **Action**: `POST /transactions/send`
    - **Payload**: 
      ```json
      {
        "recipientPhone": "+254...",
        "amount": 350,
        "currency": "GBP",
        "sendingReason": "Family Support", // Only if > 300
        "paymentMethodId": "pm_card_visa" // Or managed by PaymentSheet
      }
      ```
    - **Implementation Details**:
      - **Init**: Call `initPaymentSheet({ paymentIntentClientSecret: clientSecret, returnURL: 'almapay-sandbox://stripe-redirect', ... })`.
      - **Presentation**: Use `presentPaymentSheet()` to launch the native UI.
      - **Backend Handshake**: `POST /api/v1/transactions/send` now synchronously returns the `clientSecret` required for the step above.
    - **Success**: Payment Sheet handles validation. On success, backend webhook confirms payment.

### E. Transaction History
- **Data**: `GET /transactions`.
- **Status Mapping**:
  - `CREATED` -> "Initializing..."
  - `PAYMENT_PENDING` -> "Processing Payment..."
  - `PAYMENT_SUCCESS` -> "Sending..."
  - `PAYOUT_SUCCESS` -> **"SENT"** (Final Success - Green)
  - `FAILED` -> "Failed" (Red)

## 4. Error Handling
- **400 Bad Request**: Display `message` from API alert (e.g., "Transactions over £300 require a reason").
- **404 Not Found**: Display "Resource not found".
- **500 Server Error**: "Something went wrong. Please try again."
