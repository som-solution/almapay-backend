# AlmaPay Backend - Production Ready

A complete remittance system for sending money from the UK to East Africa, built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Key Features

- 🔐 **Hardened Security**: Helmet headers, Rate Limiting, and CORS protection.
- 💸 **Stripe Integration**: Live-ready Stripe Payment Intent flow with Google Pay support.
- 🔄 **State Machine**: Robust transaction lifecycle (Payment → Confirmation → Payout).
- 👨💼 **Admin Dashboard**: Full control over transactions, users, and audit logs.
- 🌍 **Multi-Currency**: GBP to KES/UGX/TZS/SOS with live rate fallback.
- 📍 **KYC & Compliance**: Multi-tier UK address lookup and transaction threshold monitoring.

## 🛡️ Security Implementation

- **Helmet**: 15+ specialized HTTP security headers active.
- **Rate Limiting**: 100 requests per 15 minutes per IP.
- **Morgan**: Detailed request auditing for every connection.
- **Strict Secrets**: No insecure fallbacks for `JWT_SECRET` or API keys.

## 🔌 API v1 Endpoints (Standardized)

All operational endpoints are prefixed with `/api/v1`.

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/me` - Get current user profile (Requires Auth)

### Transactions
- `POST /api/v1/transactions/send` - Initiate money transfer
- `GET /api/v1/transactions` - Transaction history
- `GET /api/v1/transactions/recipient/lookup` - Search for recipients

### System
- `GET /api/v1/health` - System health check
- `GET /api/v1/rates` - Live exchange rates
- `GET /api/v1/rates/calculate` - Transfer calculator (Amount, Fee, Rate)

### Admin (Access Controlled)
- `GET /api/v1/admin/transactions` - Global transaction view
- `POST /api/v1/admin/transactions/:id/retry` - Manual payout retry
- `POST /api/v1/admin/transactions/:id/refund` - Full transaction refund
- `GET /api/v1/admin/users` - User management list
- `GET /api/v1/admin/audit-logs` - System audit log access

---

## 🛠️ Setup & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment** (`.env`):
   Necessary keys: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

3. **Database Setup**:
   ```bash
   npx prisma db push
   npm run seed
   ```

4. **Run Server**:
   ```bash
   npm run dev
   ```

---

## 🌐 Connectivity (Testing)

- **Local (Recommended)**: `http://10.170.132.144:3000` (Fastest, use on same Wi-Fi)
- **Public**: `https://dirty-sites-press.loca.lt` (Note: May be blocked by some UK mobile providers like Vodafone)

---

## ☁️ Cloud Deployment (Render)

The project is pre-configured for **Render.com**. Follow these steps for a live test:

1.  **Push to GitHub**: Initialize a repo and push your code.
2.  **Create Service**: On Render, select "New" -> "Web Service".
3.  **Connect Repo**: Select your backend repository.
4.  **Configuration**:
    -   Render will automatically detect the `render.yaml` file.
    -   **Important**: Fill in the environment variables in the Render Dashboard (use `production.env.example` as a guide).
5.  **Database**: Point `DATABASE_URL` to your live Supabase or Render Postgres instance.
6.  **Deploy**: Hit deploy and your API will be live on a `https://...` domain.

---

## 📄 License
MIT
