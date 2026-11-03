import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import * as db from '../src/config/db.js';
import { query, pool } from '../src/config/db.js';
import { signToken } from '../src/config/jwt.js';

describe('Phase 3: Authentication, User Accounts & RBAC Test Suite', () => {
  const timestamp = Date.now();
  const testUser = {
    fullName: 'Jane Developer',
    email: `jane_${timestamp}@example.com`,
    password: 'SecurePassword123'
  };

  let authToken = '';
  let userId = '';

  afterAll(async () => {
    // Clean up test data isolated by test email domain
    await query("DELETE FROM users WHERE email LIKE '%@example.com'");
    await pool.end();
  });

  describe('1. Registration (POST /api/auth/register)', () => {
    it('should register a valid new user and return a safe user object and JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.fullName).toBe(testUser.fullName);
      expect(res.body.data.user.role).toBe('customer');
      // Crucial security requirement: Never return password hashes
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.token).toBeDefined();

      authToken = res.body.data.token;
      userId = res.body.data.user.id;
    });

    it('should reject duplicate email registration with HTTP 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('already exists');
    });

    it('should reject case-insensitive duplicate email registration with HTTP 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Jane Twin',
          email: testUser.email.toUpperCase(), // Test Case Insensitivity
          password: 'AnotherPassword456'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Bad Email',
          email: 'not-an-email',
          password: 'ValidPassword123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details).toContain('A valid email address is required');
    });

    it('should reject weak password (< 8 chars or letters only) with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Weak Pass',
          email: `weak_${timestamp}@example.com`,
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should ignore any client-supplied role and force "customer"', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Hacker Wannabe',
          email: `hacker_${timestamp}@example.com`,
          password: 'Password123',
          role: 'admin' // Attempted privilege escalation
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('customer'); // Must still be customer!
    });
  });

  describe('2. Login (POST /api/auth/login)', () => {
    it('should log in successfully with valid credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject incorrect password with generic error (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword999'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should reject unknown email with identical generic error (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: `nonexistent_${timestamp}@example.com`,
          password: 'Password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should reject missing fields with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Authentication Middleware & Token Verification', () => {
    it('should reject request without Authorization header with HTTP 401', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject malformed Authorization header with HTTP 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormatToken123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject token with invalid signature with HTTP 401', async () => {
      const fakeToken = jwt.sign({ id: 'fake', role: 'admin' }, 'wrong_secret_key');
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired token with HTTP 401', async () => {
      const expiredToken = jwt.sign(
        { id: userId, email: testUser.email, role: 'customer' },
        process.env.JWT_SECRET || 'your_super_secret_jwt_random_key_nexcart_2026',
        { expiresIn: '-1s', issuer: 'nexcart-api', audience: 'nexcart-client' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('expired');
    });

    it('should accept valid token and return authenticated profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(userId);
      expect(res.body.data.user.password_hash).toBeUndefined();
    });
  });

  describe('4. User Profile & Password Updates', () => {
    it('should retrieve profile via GET /api/users/me', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should update allowed fields (fullName) via PATCH /api/users/me', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ fullName: 'Jane Senior Architect' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.fullName).toBe('Jane Senior Architect');
    });

    it('should reject attempts to update privileged fields (role, id)', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details[0]).toContain('cannot be modified directly');
    });

    it('should reject password change with incorrect current password', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'IncorrectOldPassword',
          newPassword: 'BrandNewPassword456'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Current password is incorrect');
    });

    it('should succeed with valid current password and update hash in DB', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'BrandNewPassword456'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify login works with the NEW password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'BrandNewPassword456'
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.token).toBeDefined();
      authToken = loginRes.body.data.token; // Update authToken to valid new session after password rotation
    });
  });

  describe('5. Role-Based Access Control (RBAC)', () => {
    it('should return HTTP 403 Forbidden when a customer tries to access admin-only route', async () => {
      const res = await request(app)
        .get('/api/users/admin-check')
        .set('Authorization', `Bearer ${authToken}`); // Customer token

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Access denied');
    });

    it('should return HTTP 200 OK when an admin accesses admin-only route', async () => {
      // Ensure admin user exists in database for live verification
      const adminUserId = '00000000-0000-0000-0000-000000000001';
      await query(
        `INSERT INTO users (id, full_name, email, password_hash, role)
         VALUES ($1, 'Admin Tester', 'admin_rbac_test@example.com', 'hashed_pw', 'admin')
         ON CONFLICT (id) DO UPDATE SET role = 'admin';`,
        [adminUserId]
      );

      const adminToken = signToken({
        id: adminUserId,
        email: 'admin_rbac_test@example.com',
        role: 'admin'
      });

      const res = await request(app)
        .get('/api/users/admin-check')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('verified admin privileges');
    });
  });

  describe('6. Security Hardening & Session Revocation (Pre-Phase 7)', () => {
    it('should reject admin token immediately after user is demoted to customer (HTTP 403)', async () => {
      // 1. Create dedicated admin user
      const demoteEmail = `demote_${Date.now()}@example.com`;
      const createRes = await query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ('Demote Admin', $1, 'hashed_pw', 'admin')
         RETURNING id, email, role;`,
        [demoteEmail]
      );
      const demoteUserId = createRes.rows[0].id;
      const initialAdminToken = signToken({
        id: demoteUserId,
        email: demoteEmail,
        role: 'admin'
      });

      // Verify token initially succeeds on admin route
      const initialRes = await request(app)
        .get('/api/users/admin-check')
        .set('Authorization', `Bearer ${initialAdminToken}`);
      expect(initialRes.status).toBe(200);

      // 2. Demote user in database from admin to customer
      await query('UPDATE users SET role = $1 WHERE id = $2', ['customer', demoteUserId]);

      // 3. Immediately retry using the SAME unexpired token
      const demotedRes = await request(app)
        .get('/api/users/admin-check')
        .set('Authorization', `Bearer ${initialAdminToken}`);

      expect(demotedRes.status).toBe(403);
      expect(demotedRes.body.success).toBe(false);
      expect(demotedRes.body.error.message).toContain('Access denied');
    });

    it('should reject token immediately after user is deleted from database (HTTP 401)', async () => {
      // 1. Create a user
      const deleteEmail = `delete_me_${Date.now()}@example.com`;
      const createRes = await query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ('Temp User', $1, 'hashed_pw', 'customer')
         RETURNING id, email, role;`,
        [deleteEmail]
      );
      const tempUserId = createRes.rows[0].id;
      const tempToken = signToken({
        id: tempUserId,
        email: deleteEmail,
        role: 'customer'
      });

      // Verify token initially succeeds
      const initialRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(initialRes.status).toBe(200);

      // 2. Delete the user from PostgreSQL
      await query('DELETE FROM users WHERE id = $1', [tempUserId]);

      // 3. Retry with existing token
      const deletedRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(deletedRes.status).toBe(401);
      expect(deletedRes.body.success).toBe(false);
      expect(deletedRes.body.error.message).toContain('no longer exists');
    });

    it('should invalidate old token after password change and accept new login token', async () => {
      // 1. Register a fresh user
      const passEmail = `pw_rotate_${Date.now()}@example.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Password Rotation User',
          email: passEmail,
          password: 'InitialPassword123'
        });
      expect(regRes.status).toBe(201);
      const oldToken = regRes.body.data.token;

      // 2. Change password
      const changeRes = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${oldToken}`)
        .send({
          currentPassword: 'InitialPassword123',
          newPassword: 'UpdatedPassword456'
        });
      expect(changeRes.status).toBe(200);

      // 3. Verify old token is now REJECTED
      const oldTokenRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${oldToken}`);

      expect(oldTokenRes.status).toBe(401);
      expect(oldTokenRes.body.success).toBe(false);
      expect(oldTokenRes.body.error.message).toContain('invalidated or revoked');

      // 4. Log in with new password and verify new token is ACCEPTED
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: passEmail,
          password: 'UpdatedPassword456'
        });
      expect(loginRes.status).toBe(200);
      const newToken = loginRes.body.data.token;

      const newTokenRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${newToken}`);

      expect(newTokenRes.status).toBe(200);
      expect(newTokenRes.body.success).toBe(true);
    });

    it('should fail closed with HTTP 500 when database error occurs during authentication', async () => {
      const querySpy = vi.spyOn(db, 'query').mockRejectedValueOnce(new Error('Simulated database failure'));

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('database error');

      querySpy.mockRestore();
    });
  });
});