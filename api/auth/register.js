import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../_db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vendor-assist-secret-key-12345';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if user already exists
    const users = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (users && users.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();

    // Insert user
    await query(
      'INSERT INTO users (id, email, password_hash, auth_provider) VALUES (?, ?, ?, ?)',
      [userId, email, hash, 'local']
    );

    // Sign JWT
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      success: true,
      token,
      user: { id: userId, email }
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed due to server error' });
  }
}
