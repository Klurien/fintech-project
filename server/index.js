import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';
import { verifyToken } from './authHelper.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Auth Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = await verifyToken(authHeader);
    req.user = decoded; // Contains { userId, email, authType }
    next();
  } catch (error) {
    console.error('Auth middleware token verification failed:', error.message);
    return res.status(401).json({ error: 'Unauthorized: ' + error.message });
  }
};

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'vendor-assist-secret-key-12345';

// API Routes

// 1. User Registration
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const users = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (users && users.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();

    await db.query(
      'INSERT INTO users (id, email, password_hash, auth_provider) VALUES (?, ?, ?, ?)',
      [userId, email, hash, 'local']
    );

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: { id: userId, email }
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed due to server error' });
  }
});

// 2. User Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    if (user.auth_provider !== 'local') {
      return res.status(400).json({ error: `Please sign in using Google (${user.auth_provider})` });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed due to server error' });
  }
});

// 3. Fetch all transactions (User Scoped)
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await db.query(
      'SELECT id, type, amount, description, quantity, category, source, DATE_FORMAT(date, "%Y-%m-%d") as date, created_at FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC',
      [req.user.userId]
    );
    res.json(transactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions from database' });
  }
});

// 4. Synchronize transactions from client (upsert list, User Scoped)
app.post('/api/transactions/sync', authenticateToken, async (req, res) => {
  const transactions = req.body;
  
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Request body must be an array of transactions' });
  }

  if (transactions.length === 0) {
    return res.json({ success: true, syncedIds: [] });
  }

  console.log(`Syncing ${transactions.length} transaction(s) for user ${req.user.email}...`);
  const syncedIds = [];

  try {
    for (const tx of transactions) {
      const { id, type, amount, description, quantity, category, source, date } = tx;

      if (!id || !type || !amount || !description || !source || !date) {
        console.warn('Skipping invalid transaction record:', tx);
        continue;
      }

      // Upsert transaction into TiDB using ON DUPLICATE KEY UPDATE, scoping by user_id
      const sql = `
        INSERT INTO transactions (id, type, amount, description, quantity, category, source, date, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          type = VALUES(type),
          amount = VALUES(amount),
          description = VALUES(description),
          quantity = VALUES(quantity),
          category = VALUES(category),
          source = VALUES(source),
          date = VALUES(date),
          user_id = VALUES(user_id)
      `;

      await db.query(sql, [
        id,
        type,
        parseFloat(amount),
        description,
        quantity || null,
        category || 'other',
        source,
        date,
        req.user.userId
      ]);
      syncedIds.push(id);
    }

    res.json({ success: true, syncedIds });
  } catch (error) {
    console.error('Failed to sync transactions:', error);
    res.status(500).json({ error: 'Failed to sync transactions to database', syncedIds: [] });
  }
});

// 5. Delete a transaction (User Scoped)
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, req.user.userId]);
    
    // Check if rows were affected
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found or already deleted' });
    }
    
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error(`Failed to delete transaction ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Serve frontend in production environment
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for SPA routing in client
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // If client build doesn't exist yet, return a simple status
      res.status(404).send('Static assets not built yet. Please run frontend dev server.');
    }
  });
});

// Bootstrapping
async function startServer() {
  try {
    await db.initDb();
  } catch (err) {
    console.error('\n⚠️  DATABASE CONNECTION WARNING:', err.message);
    console.warn(' The server will run in offline-only fallback mode. Sync features will be unavailable until database is resolved.\n');
  }
  
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` Fintech Merchant Sync Server is running on port ${PORT}`);
    console.log(`===================================================`);
  });
}

startServer();
