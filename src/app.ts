import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';

// Import routes (will act as placeholders until implemented)
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import adminRoutes from './routes/admin.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Application Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: 'sandbox' });
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
      <div class="endpoint"><span class="method">GET</span> /health - Health check</div>
      <div class="endpoint"><span class="method">GET</span> /rates - Get exchange rates</div>
      
      <h2>Authentication</h2>
      <div class="endpoint"><span class="method post">POST</span> /auth/login - User login</div>
      <div class="endpoint"><span class="method post">POST</span> /auth/register - User registration</div>
      <div class="endpoint"><span class="method">GET</span> /auth/me - Get current user profile (requires auth)</div>
      
      <h2>Transactions</h2>
      <div class="endpoint"><span class="method post">POST</span> /transactions/send - Send money (requires auth)</div>
      <div class="endpoint"><span class="method">GET</span> /transactions - Transaction history (requires auth)</div>
      <div class="endpoint"><span class="method">GET</span> /transactions/balance - Get wallet balance (requires auth)</div>
      
      <h2>Admin (API v1)</h2>
      <div class="endpoint"><span class="method">GET</span> /api/v1/admin/transactions - All transactions</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/admin/transactions/:id/retry - Retry failed payout</div>
      <div class="endpoint"><span class="method post">POST</span> /api/v1/admin/transactions/:id/refund - Refund a transaction</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/admin/users - List all users</div>
      <div class="endpoint"><span class="method">GET</span> /api/v1/admin/audit-logs - Get audit logs</div>
    </body>
    </html>
  `);
});

app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

app.get('/rates', (req, res) => {
  res.json({
    base: 'GBP',
    rates: {
      'KES': 150.00,
      'UGX': 4800.00,
      'TZS': 3200.00,
      'SOS': 26000.00,
      'USD': 1.25
    }
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;
