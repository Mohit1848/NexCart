import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

async function checkAndInitDatabase() {
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres'
  });

  try {
    const testRes = await adminPool.query('SELECT current_database(), version()');
    console.log('[PostgreSQL] Connection to server successful!');
    console.log('[PostgreSQL] Host:', process.env.DB_HOST || 'localhost');
    console.log('[PostgreSQL] Version:', testRes.rows[0].version.split(',')[0]);

    const targetDb = process.env.DB_NAME || 'nexcart_db';
    const checkDbRes = await adminPool.query(
      'SELECT datname FROM pg_database WHERE datname = $1',
      [targetDb]
    );

    if (checkDbRes.rows.length > 0) {
      console.log(`[Database] Target database "${targetDb}" already exists.`);
    } else {
      console.log(`[Database] Target database "${targetDb}" does not exist. Creating now...`);
      await adminPool.query(`CREATE DATABASE "${targetDb}"`);
      console.log(`[Database] Target database "${targetDb}" created successfully!`);
    }
  } catch (error) {
    console.error('[PostgreSQL Error]', error.message);
    process.exitCode = 1;
  } finally {
    await adminPool.end();
  }
}

checkAndInitDatabase();
