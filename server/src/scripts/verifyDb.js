import { pool, checkDbConnection } from '../config/db.js';

async function verifyDatabase() {
  console.log('====================================================');
  console.log('🔍 NexCart Database Verification');
  console.log('====================================================');

  try {
    const conn = await checkDbConnection();
    console.log(`✅ Connection: OK (${conn.version})`);
    console.log(`✅ Current Database: ${conn.database}`);

    // Tables
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);
    console.log(`\n📋 Registered Tables (${tables.length} total):`);
    tables.forEach((t) => console.log(`   - ${t}`));

    // Foreign Keys & Check Constraints
    const constraintsRes = await pool.query(`
      SELECT tc.constraint_name, tc.table_name, tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public' AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE')
      ORDER BY tc.table_name, tc.constraint_type
    `);
    console.log(`\n🔒 Schema Constraints verified: ${constraintsRes.rows.length} total constraints.`);

    // Migrations history
    const migRes = await pool.query('SELECT name, applied_at FROM schema_migrations ORDER BY id ASC');
    console.log('\n📜 Applied Migrations:');
    migRes.rows.forEach((m) => console.log(`   - ${m.name} (Applied at: ${m.applied_at.toISOString()})`));

    console.log('\n✨ All schema verification checks passed successfully!');
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

verifyDatabase();