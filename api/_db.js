import mysql from 'mysql2/promise';

// Singleton pool - reused across warm serverless invocations
let pool = null;

export async function getPool() {
  if (pool) return pool;

  const sslRequired = process.env.TIDB_SSL === 'true' || process.env.TIDB_SSL === '1';

  pool = mysql.createPool({
    host: process.env.TIDB_HOST,
    port: parseInt(process.env.TIDB_PORT || '4000'),
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE || 'fintech_merchant',
    ssl: sslRequired ? { rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  // Ensure schema exists
  const conn = await pool.getConnection();
  await conn.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(36) PRIMARY KEY,
      type VARCHAR(10) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      description VARCHAR(255) NOT NULL,
      quantity VARCHAR(50),
      category VARCHAR(50),
      source VARCHAR(20) NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  conn.release();

  return pool;
}

export async function query(sql, params) {
  const p = await getPool();
  const [results] = await p.execute(sql, params);
  return results;
}
