# AlmaPay Sandbox Backend

A complete remittance sandbox system for sending money from UK to East Africa, built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- 🔐 **Authentication**: User login/registration with JWT tokens
- 💸 **Transactions**: Send money with real-time status tracking
- 🔄 **Transaction States**: Payment → Confirmation → Payout flow
- 👨‍💼 **Admin Dashboard**: Transaction management, refunds, retries
- 📊 **Audit Logs**: Complete tracking of admin actions
- 🌍 **Multi-Currency**: GBP to KES/UGX/TZS/SOS exchange
- 🔧 **Sandbox Mode**: Simulated payment and payout adapters

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Validation**: Express middleware

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user profile

### Transactions
- `POST /transactions/send` - Send money
- `GET /transactions` - Transaction history
- `GET /transactions/balance` - Get wallet balance

### System
- `GET /health` - Health check
- `GET /rates` - Exchange rates

### Admin (Protected)
- `GET /api/v1/admin/transactions` - All transactions
- `POST /api/v1/admin/transactions/:id/retry` - Retry failed payout
- `POST /api/v1/admin/transactions/:id/refund` - Refund transaction
- `GET /api/v1/admin/users` - List users
- `GET /api/v1/admin/audit-logs` - Audit logs

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables** (`.env`):
   ```env
   PORT=3000
   DATABASE_URL="postgresql://..."
   JWT_SECRET="your-secret-key"
   NODE_ENV="development"
   ```

3. **Setup database**:
   ```bash
   npx prisma db push
   npm run seed
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## Deployment

### Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`
5. Add environment variables in Render dashboard
6. Deploy!

## Database Schema

- **Users**: User accounts with authentication
- **Transactions**: Payment records with status tracking
- **SandboxWallets**: Recipient wallets for testing
- **AdminUsers**: Admin accounts
- **AuditLogs**: Admin action tracking

## Transaction States

1. `PENDING_PAYMENT` - Initial state
2. `PAYMENT_CONFIRMED` - Payment successful
3. `PAYOUT_IN_PROGRESS` - Sending to recipient
4. `PAYOUT_SUCCESS` - Complete
5. `PAYOUT_FAILED` - Requires retry
6. `REFUNDED` - Transaction refunded

## License

MIT
