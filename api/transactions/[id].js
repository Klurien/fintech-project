import { query } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Transaction ID is required' });
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

    const result = await query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Transaction not found or already deleted' });
    }

    res.status(200).json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error(`Failed to delete transaction ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
}
