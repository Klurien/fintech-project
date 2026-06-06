import { query } from './_db.js';
import { verifyToken } from './_auth.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
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

    const transactions = await query(
      `SELECT id, type, amount, description, quantity, category, source,
        DATE_FORMAT(date, '%Y-%m-%d') as date, created_at
       FROM transactions
       WHERE user_id = ?
       ORDER BY date DESC, created_at DESC`,
      [userId]
    );
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}
