import bcrypt from 'bcryptjs';
import { query, pool } from '../config/db.js';

async function seedAdmin() {
  // Prevent unintentional execution in production environments
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ADMIN_SEED !== 'true') {
    console.error('⛔ Refusing to seed default admin in production without explicit ALLOW_ADMIN_SEED=true.');
    process.exit(1);
  }

  try {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@nexcart.local';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPassword123';

    // Check if admin user already exists to protect existing passwords from being overwritten
    const checkSql = 'SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;';
    const checkRes = await query(checkSql, [adminEmail]);

    if (checkRes.rows.length > 0) {
      console.log(`ℹ️ Admin user (${adminEmail}) already exists. Existing password and credentials preserved.`);
      return;
    }

    const hash = await bcrypt.hash(adminPassword, 12);
    await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING;`,
      ['NexCart Admin', adminEmail, hash, 'admin']
    );
    console.log(`✅ Default admin user (${adminEmail}) initialized for development/local testing.`);
  } catch (err) {
    console.error('Failed to seed admin:', err.message);
  } finally {
    await pool.end();
  }
}

seedAdmin();
