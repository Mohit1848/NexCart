import bcrypt from 'bcryptjs';
import { query, pool } from '../config/db.js';

async function seedAdmin() {
  try {
    const hash = await bcrypt.hash('AdminPassword123', 12);
    await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET role = 'admin', password_hash = $3;`,
      ['NexCart Admin', 'admin@nexcart.local', hash, 'admin']
    );
    console.log('✅ Admin user (admin@nexcart.local) seeded successfully.');
  } catch (err) {
    console.error('Failed to seed admin:', err.message);
  } finally {
    await pool.end();
  }
}

seedAdmin();

