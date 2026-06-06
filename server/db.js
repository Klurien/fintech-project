import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const {
  TIDB_HOST,
  TIDB_PORT,
  TIDB_USER,
  TIDB_PASSWORD,
  TIDB_DATABASE,
  TIDB_SSL
} = process.env;

// Connection options
const sslRequired = TIDB_SSL === 'true' || TIDB_SSL === '1';
const connectionConfig = {
  host: TIDB_HOST || '127.0.0.1',
  port: parseInt(TIDB_PORT || '4000'),
  user: TIDB_USER || 'root',
  password: TIDB_PASSWORD || '',
  ssl: sslRequired ? { rejectUnauthorized: true } : undefined
};

let pool;

export async function initDb() {
  console.log('Connecting to TiDB/MySQL database...');
  
  // 1. Establish connection without database to create it if it doesn't exist
  let initialConnection;
  try {
    initialConnection = await mysql.createConnection(connectionConfig);
    console.log(`Ensuring database "${TIDB_DATABASE || 'fintech_merchant'}" exists...`);
    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${TIDB_DATABASE || 'fintech_merchant'}\``);
  } catch (error) {
    console.error('Error verifying database existence:', error.message);
    console.warn('Proceeding with direct connection attempt...');
  } finally {
    if (initialConnection) {
      await initialConnection.end();
    }
  }

  // 2. Initialize connection pool with database selected
  pool = mysql.createPool({
    ...connectionConfig,
    database: TIDB_DATABASE || 'fintech_merchant',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // 3. Create tables and update schema
  try {
    const conn = await pool.getConnection();
    console.log('Database connected successfully. Checking schema...');
    
    // Create users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NULL,
        auth_provider VARCHAR(50) DEFAULT 'local',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create transactions table
    const createTableQuery = `
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
      );
    `;
    await conn.query(createTableQuery);

    // Alter transactions table to add user_id if not exists
    try {
      await conn.query(`ALTER TABLE transactions ADD COLUMN user_id VARCHAR(36)`);
      console.log('Added user_id column to transactions table locally.');
    } catch (columnErr) {
      if (columnErr.errno !== 1060 && columnErr.sqlState !== '42S21') {
        console.error('Error adding user_id column locally:', columnErr);
      }
    }

    console.log('Schema verification complete: tables are ready.');
    conn.release();
  } catch (error) {
    console.error('Database schema initialization failed:', error);
    throw error;
  }
}

export async function query(sql, params) {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDb() first.');
  }
  const [results] = await pool.execute(sql, params);
  return results;
}

export default {
  initDb,
  query
};
