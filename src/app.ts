import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import routes (will act as placeholders until implemented)
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import adminRoutes from './routes/admin.routes';
import webhookRoutes from './routes/webhook.routes';
import sandboxRoutes from './routes/sandbox.routes';
import notificationRoutes from './routes/notification.routes';
import complianceRoutes from './routes/compliance.routes';
import recipientRoutes from './routes/recipient.routes';
import supportRoutes from './routes/support.routes';

import { RateService } from './services/RateService';

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images/assets to be shared
}));

// Request Logging
app.use(morgan('combined')); // Standard Apache combined log format

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 for development/polling
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Webhooks must be mounted BEFORE the global json parser to allow raw body access (Stripe)
app.use('/api/v1/webhooks', webhookRoutes);

app.use(express.json());

// Application Routes
// Redirect root health to versioned health
app.get('/health', (req, res) => {
  res.redirect('/api/v1/health');
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AlmaPay Sandbox API</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #2563eb; }
        h2 { color: #1e40af; margin-top: 30px; }
        .endpoint { background: #f3f4f6; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .method { font-weight: bold; color: #059669; }
        .post { color: #dc2626; }
      </style>
    </head>
    <body>
      <h1>AlmaPay Sandbox API</h1>
      <p>Server is running on port 3000</p>
      
      <h2>System</h2>
      <div class="endpoint"><span class="method">GET</span> /api/v1/health - Health check</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/rates - Get exchange rates</div>
      
      <h2>Authentication</h2>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/auth/login - User login</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/auth/register - User registration</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/auth/forgot-password - Request Password Reset</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/auth/reset-password - Complete Password Reset</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/auth/refresh-token - Refresh Access Token</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/auth/logout - Logout</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/auth/change-password - Change Password (requires auth)</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/auth/me - Get current user profile (requires auth)</div>
      
      <h2>Transactions</h2>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/transactions/send - Send money (requires auth)</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/transactions - Transaction history (requires auth)</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/transactions/calculate - Public Calculator (Query: amount, currency, target)</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/transactions/:id/status - Check Status</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/transactions/:id/receipt - Get Receipt (PDF Data)</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/transactions/recipient/lookup - Lookup recipient (requires auth)</div>
      
      <h2>Recipients (Address Book)</h2>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/recipients - Save Recipient</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/recipients - List Recipients</div>
      <div class="endpoint"><span class="method post">DELETE</span> /api/v1/recipients/:id - Remove Recipient</div>

      <h2>Compliance & KYC</h2>
      <div class="endpoint"><span class="method">GET</span> /api/v1/compliance/postcode-lookup - UK Address Lookup (Query: postcode)</div>
      <div class="endpoint"><span class="method post">PATCH</span> /api/v1/compliance/profile - Update KYC (DOB, Address)</div>

      <h2>Notifications</h2>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/notifications/register - Register Push Token</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/notifications - Get User Notifications</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/notifications/:id/read - Mark as Read</div>

      <h2>Support</h2>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/support/notify - Contact Support</div>

      <h2>Admin (API v1)</h2>
      <div class="endpoint"><span class="method">GET</span> /api/v1/admin/transactions - All transactions</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/admin/transactions/:id/cancel - Cancel Transaction</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/admin/users/:id/disable - Disable User</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/admin/users/:id/enable - Enable User</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/admin/transactions/:id/retry - Retry failed payout</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/admin/transactions/:id/refund - Refund a transaction</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/admin/users - List all users</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/admin/audit-logs - Get audit logs</div>
    </body>
    </html>
  `);
});

app.get('/api/v1', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'AlmaPay API v1 is active', documentation: '/api/v1/health' });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: 'sandbox' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/admin', adminRoutes);
// webhookRoutes moved before express.json()
app.use('/api/v1/sandbox', sandboxRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/recipients', recipientRoutes);
app.use('/api/v1/support', supportRoutes);

app.get('/api/v1/rates/calculate', async (req, res, next) => {
  try {
    const { amount, target = 'KES' } = req.query;
    const netAmount = Number(amount) || 0;

    const base = process.env.BASE_CURRENCY || 'GBP';
    const rate = await RateService.getRate(base, target as string);
    const fee = Number(process.env.TRANSACTION_FEE) || 2.0;
    const recipientAmount = netAmount * rate;

    res.json({
      status: 'success',
      data: {
        baseCurrency: base,
        targetCurrency: target,
        rate,
        sendAmount: netAmount,
        fee,
        totalToPay: netAmount + fee,
        recipientGets: recipientAmount
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/rates', async (req, res) => {
  const gbpToKes = await RateService.getRate('GBP', 'KES');
  const gbpToUgx = await RateService.getRate('GBP', 'UGX');
  const gbpToTzs = await RateService.getRate('GBP', 'TZS');

  res.json({
    status: 'success',
    data: {
      base: 'GBP',
      rates: {
        'KES': gbpToKes,
        'UGX': gbpToUgx,
        'TZS': gbpToTzs,
        'SOS': 26000.00,
        'USD': 1.25
      }
    }
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
