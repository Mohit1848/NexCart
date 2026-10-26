import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedsDir = path.resolve(__dirname, '../../../database/seeds');

async function runSeeds() {
  console.log('====================================================');
  console.log('🌱 NexCart Database Seeder');
  console.log('====================================================');

  const client = await pool.connect();

  try {
    if (!fs.existsSync(seedsDir)) {
      throw new Error(`Seeds directory not found at: ${seedsDir}`);
    }

    const files = fs
      .readdirSync(seedsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('ℹ️ No seed files found to execute.');
      return;
    }

    for (const file of files) {
      console.log(`🌱 [Seeding] ${file}...`);
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');

      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`✅ [Seeded]  ${file} executed successfully.`);
    }

    // Report catalog counts
    const catCountRes = await client.query('SELECT COUNT(*) FROM categories');
    const prodCountRes = await client.query('SELECT COUNT(*) FROM products');

    console.log('\n📊 Seed Catalog Summary:');
    console.log(`   - Categories: ${catCountRes.rows[0].count}`);
    console.log(`   - Products:   ${prodCountRes.rows[0].count}`);
    console.log('✨ Database seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 Seeder failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeds();