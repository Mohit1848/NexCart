import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

// Validate essential DB configurations on load
const requiredDbEnv = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingDbEnv = requiredDbEnv.filter((key) => !process.env[key]);

if (missingDbEnv.length > 0) {
  console.error(`[DB Config Error] Missing required database environment variables: ${missingDbEnv.join(', ')}`);
}

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'nexcart_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10), // Maximum active clients in pool
  idleTimeoutMillis: 30000,                            // Close idle clients after 30s
  connectionTimeoutMillis: 5000                        // Error if connection takes longer than 5s
};

export const pool = new Pool(poolConfig);

// Handle idle client errors without crashing the entire process
pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Unexpected Error on idle client]', err.message);
});

/**
 * Standard query helper with parameterized execution
 * @param {string} text - SQL query with positional params ($1, $2, ...)
 * @param {Array} params - Parameters array
 */
export const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    // Log query performance without printing raw param values (prevents secret leaks)
    const sanitizedQuery = text.replace(/\s+/g, ' ').trim().slice(0, 100);
    // console.log(`[DB Query] "${sanitizedQuery}" (${duration}ms, rows: ${res.rowCount})`);
  }

  return res;
};

/**
 * Validates active connection to PostgreSQL
 * Used by application startup and /api/health/ready readiness check
 */
export const checkDbConnection = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT current_database() as db_name, NOW() as server_time, version()');
    return {
      connected: true,
      database: res.rows[0].db_name,
      serverTime: res.rows[0].server_time,
      version: res.rows[0].version.split(' ')[0] + ' ' + res.rows[0].version.split(' ')[1]
    };
  } finally {
    client.release();
  }
};

/**
 * Gracefully terminates the connection pool
 */
export const closePool = async () => {
  console.log('[PostgreSQL] Closing connection pool...');
  await pool.end();
  console.log('[PostgreSQL] Connection pool successfully closed.');
};

export default {
  pool,
  query,
  checkDbConnection,
  closePool
};
