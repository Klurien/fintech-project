import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

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

// API Routes

// 1. Fetch all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await db.query(
      'SELECT id, type, amount, description, quantity, category, source, DATE_FORMAT(date, "%Y-%m-%d") as date, created_at FROM transactions ORDER BY date DESC, created_at DESC'
    );
    res.json(transactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions from database' });
  }
});

// 2. Synchronize transactions from client (upsert list)
app.post('/api/transactions/sync', async (req, res) => {
  const transactions = req.body;
  
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Request body must be an array of transactions' });
  }

  if (transactions.length === 0) {
    return res.json({ success: true, syncedIds: [] });
  }

  console.log(`Syncing ${transactions.length} transaction(s) from client...`);
  const syncedIds = [];

  try {
    for (const tx of transactions) {
      const { id, type, amount, description, quantity, category, source, date } = tx;

      if (!id || !type || !amount || !description || !source || !date) {
        console.warn('Skipping invalid transaction record:', tx);
        continue;
      }

      // Upsert transaction into TiDB using ON DUPLICATE KEY UPDATE
      const sql = `
        INSERT INTO transactions (id, type, amount, description, quantity, category, source, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          type = VALUES(type),
          amount = VALUES(amount),
          description = VALUES(description),
          quantity = VALUES(quantity),
          category = VALUES(category),
          source = VALUES(source),
          date = VALUES(date)
      `;

      await db.query(sql, [
        id,
        type,
        parseFloat(amount),
        description,
        quantity || null,
        category || 'other',
        source,
        date
      ]);
      syncedIds.push(id);
    }

    res.json({ success: true, syncedIds });
  } catch (error) {
    console.error('Failed to sync transactions:', error);
    res.status(500).json({ error: 'Failed to sync transactions to database', syncedIds });
  }
});

// 3. Delete a transaction
app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM transactions WHERE id = ?', [id]);
    
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
