import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { query, pool } from '../src/config/db.js';
import { signToken } from '../src/config/jwt.js';
import { generateOrderNumber } from '../src/services/order.service.js';

describe('Phase 7.4: Admin Order Management Test Suite', () => {
  const timestamp = Date.now();
  let adminToken = '';
  let customerToken = '';
  let adminUserId = '';
  let customerUserId = '';
  let categoryId = '';
  let testProductId = '';
  let testOrderId1 = '';
  let testOrderId2 = '';
  let testOrderId3 = '';
  let testOrderNumber1 = '';
  let testOrderNumber2 = '';
  let testOrderNumber3 = '';

  beforeAll(async () => {
    // 1. Create an admin user
    const adminRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role, token_version)
       VALUES ($1, $2, $3, 'admin', 1)
       RETURNING id, email, role, token_version;`,
      [`Order Admin ${timestamp}`, `ord_admin_${timestamp}@example.com`, 'hashed_pw']
    );
    adminUserId = adminRes.rows[0].id;
    adminToken = signToken({
      id: adminUserId,
      email: adminRes.rows[0].email,
      role: 'admin',
      tokenVersion: 1
    });

    // 2. Create a customer user for RBAC verification
    const customerRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role, token_version)
       VALUES ($1, $2, $3, 'customer', 1)
       RETURNING id, email, role, token_version;`,
      [`Order Customer ${timestamp}`, `ord_cust_${timestamp}@example.com`, 'hashed_pw']
    );
    customerUserId = customerRes.rows[0].id;
    customerToken = signToken({
      id: customerUserId,
      email: customerRes.rows[0].email,
      role: 'customer',
      tokenVersion: 1
    });

    // 3. Create a category and product
    const catRes = await query(
      `INSERT INTO categories (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING id;`,
      [`Admin Orders Cat ${timestamp}`, `adm-ord-cat-${timestamp}`, 'Category for admin order tests']
    );
    categoryId = catRes.rows[0].id;

    const prodRes = await query(
      `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
       VALUES ($1, $2, $3, $4, 120.00, 50, true)
       RETURNING id;`,
      [categoryId, `Admin Orders Prod ${timestamp}`, `adm-ord-prod-${timestamp}`, 'Desc']
    );
    testProductId = prodRes.rows[0].id;

    // 4. Seed 3 test orders for the customer
    // Order 1: status = 'pending'
    testOrderNumber1 = generateOrderNumber() + '-P1';
    const o1Res = await query(
      `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount, created_at)
       VALUES ($1, $2, 'pending', 'INR', 240.00, 240.00, NOW() - INTERVAL '3 hours')
       RETURNING id;`,
      [customerUserId, testOrderNumber1]
    );
    testOrderId1 = o1Res.rows[0].id;
    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
       VALUES ($1, $2, 'Admin Orders Prod Alpha', 120.00, 2, 240.00);`,
      [testOrderId1, testProductId]
    );

    // Order 2: status = 'processing'
    testOrderNumber2 = generateOrderNumber() + '-P2';
    const o2Res = await query(
      `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount, created_at)
       VALUES ($1, $2, 'processing', 'INR', 120.00, 120.00, NOW() - INTERVAL '2 hours')
       RETURNING id;`,
      [customerUserId, testOrderNumber2]
    );
    testOrderId2 = o2Res.rows[0].id;
    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
       VALUES ($1, $2, 'Admin Orders Prod Beta', 120.00, 1, 120.00);`,
      [testOrderId2, testProductId]
    );

    // Order 3: status = 'delivered'
    testOrderNumber3 = generateOrderNumber() + '-P3';
    const o3Res = await query(
      `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount, created_at)
       VALUES ($1, $2, 'delivered', 'INR', 360.00, 360.00, NOW() - INTERVAL '1 hour')
       RETURNING id;`,
      [customerUserId, testOrderNumber3]
    );
    testOrderId3 = o3Res.rows[0].id;
    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
       VALUES ($1, $2, 'Admin Orders Prod Gamma', 120.00, 3, 360.00);`,
      [testOrderId3, testProductId]
    );
  });

  afterAll(async () => {
    // Clean up test data
    if (testOrderId1) {
      await query('DELETE FROM orders WHERE id IN ($1, $2, $3);', [testOrderId1, testOrderId2, testOrderId3]);
    }
    if (testProductId) {
      await query('DELETE FROM products WHERE id = $1;', [testProductId]);
    }
    if (categoryId) {
      await query('DELETE FROM categories WHERE id = $1;', [categoryId]);
    }
    if (adminUserId) {
      await query('DELETE FROM users WHERE id IN ($1, $2);', [adminUserId, customerUserId]);
    }
    await pool.end();
  });

  // =========================================================================
  // 1. Authentication & RBAC Access Control
  // =========================================================================
  describe('1. Authentication & RBAC Authorization', () => {
    it('should reject unauthenticated GET /api/admin/orders with HTTP 401', async () => {
      const res = await request(app).get('/api/admin/orders');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject customer account accessing GET /api/admin/orders with HTTP 403', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Access denied/i);
    });

    it('should reject customer account accessing GET /api/admin/orders/:id with HTTP 403', async () => {
      const res = await request(app)
        .get(`/api/admin/orders/${testOrderId1}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject customer account accessing PATCH /api/admin/orders/:id/status with HTTP 403', async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${testOrderId1}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'processing' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Admin Orders Listing & Filtering
  // =========================================================================
  describe('2. Admin Orders Listing (GET /api/admin/orders)', () => {
    it('should allow admin to list all orders with aggregated item count and safe customer details', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toBeDefined();

      const order1 = res.body.data.orders.find((o) => o.id === testOrderId1);
      expect(order1).toBeDefined();
      expect(order1.orderNumber).toBe(testOrderNumber1);
      expect(order1.status).toBe('pending');
      expect(order1.currency).toBe('INR');
      expect(order1.subtotal).toBe(240);
      expect(order1.totalAmount).toBe(240);
      expect(order1.itemCount).toBe(2); // 2 Alpha items
      expect(order1.user).toBeDefined();
      expect(order1.user.email).toMatch(/ord_cust_/);
      expect(order1.user.fullName).toMatch(/Order Customer/);
      expect(order1.user.password_hash).toBeUndefined();
    });

    it('should filter orders by status (status=delivered)', async () => {
      const res = await request(app)
        .get('/api/admin/orders?status=delivered')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // All returned orders must have status 'delivered'
      res.body.data.orders.forEach((o) => {
        expect(o.status).toBe('delivered');
      });
      const order3 = res.body.data.orders.find((o) => o.id === testOrderId3);
      expect(order3).toBeDefined();
    });

    it('should search orders by order number', async () => {
      const res = await request(app)
        .get(`/api/admin/orders?search=${testOrderNumber2}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders.length).toBe(1);
      expect(res.body.data.orders[0].id).toBe(testOrderId2);
      expect(res.body.data.orders[0].orderNumber).toBe(testOrderNumber2);
    });

    it('should paginate orders correctly (page=1, limit=1)', async () => {
      const res = await request(app)
        .get('/api/admin/orders?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBe(1);
      expect(res.body.data.pagination.limit).toBe(1);
      expect(res.body.data.pagination.currentPage).toBe(1);
      expect(res.body.data.pagination.totalItems).toBeGreaterThanOrEqual(3);
    });

    it('should reject invalid status filter parameter with HTTP 400', async () => {
      const res = await request(app)
        .get('/api/admin/orders?status=invalid_status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid query parameters/i);
    });
  });

  // =========================================================================
  // 3. Admin Order Details
  // =========================================================================
  describe('3. Admin Order Details (GET /api/admin/orders/:id)', () => {
    it('should retrieve full order details including saved item snapshots', async () => {
      const res = await request(app)
        .get(`/api/admin/orders/${testOrderId1}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const order = res.body.data.order;
      expect(order.id).toBe(testOrderId1);
      expect(order.orderNumber).toBe(testOrderNumber1);
      expect(order.status).toBe('pending');
      expect(order.currency).toBe('INR');
      expect(order.subtotal).toBe(240);
      expect(order.totalAmount).toBe(240);
      expect(order.user.email).toMatch(/ord_cust_/);
      expect(order.items.length).toBe(1);
      expect(order.items[0].productName).toBe('Admin Orders Prod Alpha');
      expect(order.items[0].unitPrice).toBe(120);
      expect(order.items[0].quantity).toBe(2);
      expect(order.items[0].lineTotal).toBe(240);
    });

    it('should return HTTP 404 for non-existent order UUID', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/admin/orders/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Order not found/i);
    });

    it('should return HTTP 400 for invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/admin/orders/not-a-valid-uuid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid order ID format/i);
    });
  });

  // =========================================================================
  // 4. Order Status Management & Lifecycle Transitions
  // =========================================================================
  describe('4. Order Status Management (PATCH /api/admin/orders/:id/status)', () => {
    it('should successfully transition an order from pending -> processing', async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${testOrderId1}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'processing' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.status).toBe('processing');

      // Verify DB update
      const dbCheck = await query('SELECT status FROM orders WHERE id = $1;', [testOrderId1]);
      expect(dbCheck.rows[0].status).toBe('processing');
    });

    it('should successfully transition an order from processing -> shipped', async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${testOrderId1}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'shipped' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.status).toBe('shipped');

      const dbCheck = await query('SELECT status FROM orders WHERE id = $1;', [testOrderId1]);
      expect(dbCheck.rows[0].status).toBe('shipped');
    });

    it('should successfully transition an order from shipped -> delivered', async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${testOrderId1}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.status).toBe('delivered');

      const dbCheck = await query('SELECT status FROM orders WHERE id = $1;', [testOrderId1]);
      expect(dbCheck.rows[0].status).toBe('delivered');
    });

    it('should reject invalid transition: moving delivered order backwards to shipped', async () => {
      // testOrderId1 is now in 'delivered' status
      const res = await request(app)
        .patch(`/api/admin/orders/${testOrderId1}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'shipped' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Cannot transition order from "delivered" to "shipped"/i);

      // Verify DB status remained 'delivered'
      const dbCheck = await query('SELECT status FROM orders WHERE id = $1;', [testOrderId1]);
      expect(dbCheck.rows[0].status).toBe('delivered');
    });

    it('should reject invalid skipped transition: moving pending order directly to delivered', async () => {
      // Create a fresh pending order
      const freshOrderNumber = generateOrderNumber() + '-SKP';
      const freshRes = await query(
        `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount)
         VALUES ($1, $2, 'pending', 'INR', 120.00, 120.00)
         RETURNING id;`,
        [customerUserId, freshOrderNumber]
      );
      const freshId = freshRes.rows[0].id;

      // Try skipping to delivered
      const res = await request(app)
        .patch(`/api/admin/orders/${freshId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Cannot transition order from "pending" to "delivered"/i);

      // Cleanup
      await query('DELETE FROM orders WHERE id = $1;', [freshId]);
    });

    it('should reject unknown status value with HTTP 400', async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${testOrderId2}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'teleported' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Validation failed/i);
    });

    it('should reject non-object body with HTTP 400', async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${testOrderId2}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send('just a string');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject unpermitted fields in status update body with HTTP 400', async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${testOrderId2}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'shipped', totalAmount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Validation failed/i);
    });

    it('should prevent race conditions on concurrent status changes', async () => {
      // Create a fresh pending order
      const raceOrderNumber = generateOrderNumber() + '-RCE';
      const raceRes = await query(
        `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount)
         VALUES ($1, $2, 'pending', 'INR', 120.00, 120.00)
         RETURNING id;`,
        [customerUserId, raceOrderNumber]
      );
      const raceId = raceRes.rows[0].id;

      // Two concurrent requests both try to move from pending -> processing
      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/admin/orders/${raceId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'processing' }),
        request(app)
          .patch(`/api/admin/orders/${raceId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'processing' })
      ]);

      // Exactly ONE must succeed (200), and the second must be rejected (400) because order is already in 'processing'
      const results = [res1, res2];
      const successRes = results.find((r) => r.status === 200);
      const failRes = results.find((r) => r.status === 400);

      expect(successRes).toBeDefined();
      expect(failRes).toBeDefined();
      expect(failRes.body.error.message).toMatch(/Cannot transition order from "processing" to "processing"/i);

      // Cleanup
      await query('DELETE FROM orders WHERE id = $1;', [raceId]);
    });
  });
});

