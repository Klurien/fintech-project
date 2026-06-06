import { query } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user
    const authHeader = req.headers.authorization;
    let userId;
    try {
      const decoded = await verifyToken(authHeader);
      userId = decoded.userId;
    } catch (authErr) {
      return res.status(401).json({ error: 'Unauthorized: ' + authErr.message });
    }

    const transactions = req.body;

    if (!Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Request body must be an array of transactions' });
    }

    if (transactions.length === 0) {
      return res.status(200).json({ success: true, syncedIds: [] });
    }

    const syncedIds = [];

    for (const tx of transactions) {
      const { id, type, amount, description, quantity, category, source, date } = tx;

      if (!id || !type || !amount || !description || !source || !date) continue;

      await query(
        `INSERT INTO transactions (id, type, amount, description, quantity, category, source, date, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           type = VALUES(type),
           amount = VALUES(amount),
           description = VALUES(description),
           quantity = VALUES(quantity),
           category = VALUES(category),
           source = VALUES(source),
           date = VALUES(date),
           user_id = VALUES(user_id)`,
        [id, type, parseFloat(amount), description, quantity || null, category || 'other', source, date, userId]
      );
      syncedIds.push(id);
    }

    res.status(200).json({ success: true, syncedIds });
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ error: 'Failed to sync transactions', syncedIds: [] });
  }
}
