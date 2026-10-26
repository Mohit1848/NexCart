import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../../database/migrations');

async function runMigrations() {
  console.log('====================================================');
  console.log('🔄 NexCart Database Migration Runner');
  console.log('====================================================');

  const client = await pool.connect();

  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const { rows: appliedRows } = await client.query(
      'SELECT name FROM schema_migrations ORDER BY id ASC'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 3. Read migration files from database/migrations
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('ℹ️ No migration files found to execute.');
      return;
    }

    let appliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏩ [Skipping] ${file} (already applied)`);
        continue;
      }

      console.log(`🚀 [Applying] ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');

      // Use transactional DDL so migrations are atomic
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        appliedCount++;
        console.log(`✅ [Applied]  ${file} successfully.`);
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        console.error(`❌ [Failed]   ${file}: ${migrationErr.message}`);
        throw migrationErr;
      }
    }

    if (appliedCount === 0) {
      console.log('✨ All migrations are up to date! Nothing to apply.');
    } else {
      console.log(`🎉 Successfully applied ${appliedCount} migration(s).`);
    }
  } catch (err) {
    console.error('💥 Migration runner encountered a fatal error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
