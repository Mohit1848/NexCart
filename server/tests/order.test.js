import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { query, pool } from '../src/config/db.js';
import { signToken } from '../src/config/jwt.js';
import { ORDER_STATUS, generateOrderNumber } from '../src/services/order.service.js';

describe('Phase 7.1: Order Database & Backend Foundation Test Suite', () => {
  const timestamp = Date.now();
  let customerAToken = '';
  let customerBToken = '';
  let customerCToken = '';
  let userAId = '';
  let userBId = '';
  let userCId = '';
  let categoryId = '';
  let productAId = '';
  let productBId = '';
  let orderA1Id = '';
  let orderA2Id = '';
  let orderA3Id = '';
  let orderB1Id = '';
  let orderA1Number = '';
  let orderB1Number = '';

  beforeAll(async () => {
    // 1. Create Customer A
    const userARes = await query(
      `INSERT INTO users (full_name, email, password_hash, role, token_version)
       VALUES ($1, $2, $3, 'customer', 1)
       RETURNING id, email, role, token_version;`,
      [`Customer A ${timestamp}`, `cust_a_${timestamp}@example.com`, 'hashed_pw']
    );
    userAId = userARes.rows[0].id;
    customerAToken = signToken({
      id: userAId,
      email: userARes.rows[0].email,
      role: 'customer',
      tokenVersion: 1
    });

    // 2. Create Customer B
    const userBRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role, token_version)
       VALUES ($1, $2, $3, 'customer', 1)
       RETURNING id, email, role, token_version;`,
      [`Customer B ${timestamp}`, `cust_b_${timestamp}@example.com`, 'hashed_pw']
    );
    userBId = userBRes.rows[0].id;
    customerBToken = signToken({
      id: userBId,
      email: userBRes.rows[0].email,
      role: 'customer',
      tokenVersion: 1
    });

    // 3. Create Customer C (empty order history)
    const userCRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role, token_version)
       VALUES ($1, $2, $3, 'customer', 1)
       RETURNING id, email, role, token_version;`,
      [`Customer C ${timestamp}`, `cust_c_${timestamp}@example.com`, 'hashed_pw']
    );
    userCId = userCRes.rows[0].id;
    customerCToken = signToken({
      id: userCId,
      email: userCRes.rows[0].email,
      role: 'customer',
      tokenVersion: 1
    });

    // 4. Create category and products for testing
    const catRes = await query(
      `INSERT INTO categories (name, slug, description)
       VALUES ($1, $2, $3)
       RETURNING id;`,
      [`Order Test Category ${timestamp}`, `order-test-cat-${timestamp}`, 'Category for order testing']
    );
    categoryId = catRes.rows[0].id;

    const prodARes = await query(
      `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id;`,
      [categoryId, `Order Test Product Alpha ${timestamp}`, `order-prod-alpha-${timestamp}`, 'Desc A', 100.00, 50]
    );
    productAId = prodARes.rows[0].id;

    const prodBRes = await query(
      `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id;`,
      [categoryId, `Order Test Product Beta ${timestamp}`, `order-prod-beta-${timestamp}`, 'Desc B', 50.00, 30]
    );
    productBId = prodBRes.rows[0].id;

    // 5. Seed Orders for Customer A
    // Order A1: 2 Alpha items (2 * 100 = 200) + 1 Beta item (1 * 50 = 50) = Subtotal 250, Total 250
    orderA1Number = generateOrderNumber() + '-A1';
    const ordA1Res = await query(
      `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount, created_at)
       VALUES ($1, $2, 'pending', 'INR', 250.00, 250.00, NOW() - INTERVAL '3 hours')
       RETURNING id;`,
      [userAId, orderA1Number]
    );
    orderA1Id = ordA1Res.rows[0].id;

    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
       VALUES 
         ($1, $2, 'Order Test Product Alpha', 100.00, 2, 200.00),
         ($1, $3, 'Order Test Product Beta', 50.00, 1, 50.00);`,
      [orderA1Id, productAId, productBId]
    );

    // Order A2: 1 Alpha item = Subtotal 100, Total 100
    const orderA2Number = generateOrderNumber() + '-A2';
    const ordA2Res = await query(
      `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount, created_at)
       VALUES ($1, $2, 'processing', 'INR', 100.00, 100.00, NOW() - INTERVAL '2 hours')
       RETURNING id;`,
      [userAId, orderA2Number]
    );
    orderA2Id = ordA2Res.rows[0].id;

    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
       VALUES ($1, $2, 'Order Test Product Alpha', 100.00, 1, 100.00);`,
      [orderA2Id, productAId]
    );

    // Order A3: 1 Beta item = Subtotal 50, Total 50
    const orderA3Number = generateOrderNumber() + '-A3';
    const ordA3Res = await query(
      `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount, created_at)
       VALUES ($1, $2, 'delivered', 'INR', 50.00, 50.00, NOW() - INTERVAL '1 hour')
       RETURNING id;`,
      [userAId, orderA3Number]
    );
    orderA3Id = ordA3Res.rows[0].id;

    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
       VALUES ($1, $2, 'Order Test Product Beta', 50.00, 1, 50.00);`,
      [orderA3Id, productBId]
    );

    // 6. Seed Order for Customer B
    orderB1Number = generateOrderNumber() + '-B1';
    const ordB1Res = await query(
      `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount, created_at)
       VALUES ($1, $2, 'pending', 'INR', 500.00, 500.00, NOW())
       RETURNING id;`,
      [userBId, orderB1Number]
    );
    orderB1Id = ordB1Res.rows[0].id;

    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
       VALUES ($1, $2, 'Customer B Exclusive Item', 500.00, 1, 500.00);`,
      [orderB1Id, productAId]
    );
  });

  afterAll(async () => {
    // Clean up created records
    if (orderA1Id) await query('DELETE FROM orders WHERE id IN ($1, $2, $3);', [orderA1Id, orderA2Id, orderA3Id]);
    if (orderB1Id) await query('DELETE FROM orders WHERE id = $1;', [orderB1Id]);
    if (productAId) await query('DELETE FROM products WHERE id IN ($1, $2);', [productAId, productBId]);
    if (categoryId) await query('DELETE FROM categories WHERE id = $1;', [categoryId]);
    if (userAId) await query('DELETE FROM users WHERE id IN ($1, $2, $3);', [userAId, userBId, userCId]);
    await pool.end();
  });

  // =========================================================================
  // 1. Authentication & Security
  // =========================================================================
  describe('1. Authentication & Authorization', () => {
    it('should reject unauthenticated GET /api/orders with HTTP 401', async () => {
      const res = await request(app).get('/api/orders');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Authentication required/i);
    });

    it('should reject malformed Bearer token with HTTP 401', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', 'InvalidFormatToken');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid JWT signature with HTTP 401', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Empty Order History
  // =========================================================================
  describe('2. Empty Order History', () => {
    it('should return empty orders array with standard pagination for a user with no orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerCToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders).toEqual([]);
      expect(res.body.data.pagination).toEqual({
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false
      });
    });
  });

  // =========================================================================
  // 3. Customer Order Listing & Snapshot Integrity
  // =========================================================================
  describe('3. Customer Order Listing & Snapshot Integrity', () => {
    it('should return all orders for authenticated customer with historical item snapshots', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orders).toBeInstanceOf(Array);
      expect(res.body.data.orders.length).toBe(3);
      expect(res.body.data.pagination.totalItems).toBe(3);

      // Verify newest first (orderA3 created 1h ago, A2 2h ago, A1 3h ago)
      const newestOrder = res.body.data.orders[0];
      expect(newestOrder.status).toBe('delivered');
      expect(newestOrder.currency).toBe('INR');

      // Find order A1 in results
      const orderA1 = res.body.data.orders.find((o) => o.id === orderA1Id);
      expect(orderA1).toBeDefined();
      expect(orderA1.orderNumber).toBe(orderA1Number);
      expect(orderA1.status).toBe(ORDER_STATUS.PENDING);
      expect(orderA1.currency).toBe('INR');
      expect(orderA1.subtotal).toBe(250);
      expect(orderA1.totalAmount).toBe(250);
      expect(orderA1.total).toBe(250);
      expect(orderA1.userId).toBe(userAId);
      expect(orderA1.items).toBeInstanceOf(Array);
      expect(orderA1.items.length).toBe(2);

      // Verify item snapshots
      const alphaItem = orderA1.items.find((i) => i.productName === 'Order Test Product Alpha');
      expect(alphaItem).toBeDefined();
      expect(alphaItem.productId).toBe(productAId);
      expect(alphaItem.unitPrice).toBe(100);
      expect(alphaItem.quantity).toBe(2);
      expect(alphaItem.lineTotal).toBe(200);
      expect(alphaItem.createdAt).toBeDefined();
    });
  });

  // =========================================================================
  // 4. Strict Tenant Isolation
  // =========================================================================
  describe('4. Strict Tenant Isolation', () => {
    it('should strictly isolate Customer A orders from Customer B orders', async () => {
      // Customer A request
      const resA = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(resA.status).toBe(200);
      const orderIdsA = resA.body.data.orders.map((o) => o.id);
      const orderNumbersA = resA.body.data.orders.map((o) => o.orderNumber);

      expect(orderIdsA).toContain(orderA1Id);
      expect(orderIdsA).not.toContain(orderB1Id);
      expect(orderNumbersA).not.toContain(orderB1Number);

      // Customer B request
      const resB = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.orders.length).toBe(1);
      const orderB = resB.body.data.orders[0];
      expect(orderB.id).toBe(orderB1Id);
      expect(orderB.orderNumber).toBe(orderB1Number);
      expect(orderB.userId).toBe(userBId);
      expect(orderB.items[0].productName).toBe('Customer B Exclusive Item');

      // Customer B cannot see Customer A's orders
      const orderIdsB = resB.body.data.orders.map((o) => o.id);
      expect(orderIdsB).not.toContain(orderA1Id);
      expect(orderIdsB).not.toContain(orderA2Id);
      expect(orderIdsB).not.toContain(orderA3Id);
    });

    it('should allow customer to fetch their own order by ID (GET /api/orders/:id)', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderA1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toBeDefined();
      expect(res.body.data.order.id).toBe(orderA1Id);
      expect(res.body.data.order.orderNumber).toBe(orderA1Number);
      expect(res.body.data.order.userId).toBe(userAId);
      expect(res.body.data.order.items.length).toBe(2);
      expect(res.body.data.order.items[0].productName).toBeDefined();
      expect(res.body.data.order.items[0].unitPrice).toBeDefined();
      expect(res.body.data.order.items[0].lineTotal).toBeDefined();
    });

    it('should reject unauthenticated GET /api/orders/:id with HTTP 401', async () => {
      const res = await request(app).get(`/api/orders/${orderA1Id}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid UUID order ID format with HTTP 400', async () => {
      const res = await request(app)
        .get('/api/orders/not-a-valid-uuid')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid order ID format/i);
    });

    it('should return HTTP 404 when customer queries a non-existent order UUID', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/orders/${nonExistentUuid}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Order not found/i);
    });

    it('should strictly return HTTP 404 and NOT reveal existence when Customer A queries Customer B order ID', async () => {
      // Customer A tries to access Customer B's order
      const res = await request(app)
        .get(`/api/orders/${orderB1Id}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      // Must return 404 (not 403 or 200) to never leak that Customer B's order exists
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Order not found/i);
    });
  });

  // =========================================================================
  // 5. Pagination & Query Validation
  // =========================================================================
  describe('5. Pagination & Query Validation', () => {
    it('should paginate orders correctly with page=1 and limit=2', async () => {
      const res = await request(app)
        .get('/api/orders?page=1&limit=2')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBe(2);
      expect(res.body.data.pagination).toEqual({
        totalItems: 3,
        totalPages: 2,
        currentPage: 1,
        limit: 2,
        hasNextPage: true,
        hasPrevPage: false
      });
    });

    it('should retrieve remaining orders on page 2', async () => {
      const res = await request(app)
        .get('/api/orders?page=2&limit=2')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.length).toBe(1);
      expect(res.body.data.pagination).toEqual({
        totalItems: 3,
        totalPages: 2,
        currentPage: 2,
        limit: 2,
        hasNextPage: false,
        hasPrevPage: true
      });
    });

    it('should reject invalid page parameter with HTTP 400', async () => {
      const res = await request(app)
        .get('/api/orders?page=0')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid query parameters/i);
    });

    it('should reject invalid limit parameter with HTTP 400', async () => {
      const res = await request(app)
        .get('/api/orders?limit=100')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid query parameters/i);
    });
  });

  // =========================================================================
  // 6. Schema Integrity & Catalog Deletion Policy
  // =========================================================================
  describe('6. Schema Integrity & Product Deletion Preservation', () => {
    it('should preserve historical order items with product_id set to NULL when product is deleted', async () => {
      // 1. Create a ephemeral product
      const ephProd = await query(
        `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
         VALUES ($1, $2, $3, $4, 75.00, 10, true)
         RETURNING id;`,
        [categoryId, `Ephemeral Product ${timestamp}`, `eph-prod-${timestamp}`, 'Will be deleted']
      );
      const ephProdId = ephProd.rows[0].id;

      // 2. Create an order with this product
      const ephOrderNumber = generateOrderNumber() + '-EPH';
      const ephOrder = await query(
        `INSERT INTO orders (user_id, order_number, status, currency, subtotal, total_amount)
         VALUES ($1, $2, 'processing', 'INR', 75.00, 75.00)
         RETURNING id;`,
        [userAId, ephOrderNumber]
      );
      const ephOrderId = ephOrder.rows[0].id;

      await query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES ($1, $2, 'Ephemeral Product Historical Snapshot', 75.00, 1, 75.00);`,
        [ephOrderId, ephProdId]
      );

      // 3. Delete the product from the catalog
      // Because order_items_product_id_fkey is ON DELETE SET NULL, deletion succeeds
      await query('DELETE FROM products WHERE id = $1;', [ephProdId]);

      // 4. Query the order via the API
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      const order = res.body.data.orders.find((o) => o.id === ephOrderId);
      expect(order).toBeDefined();
      expect(order.items.length).toBe(1);

      const item = order.items[0];
      // product_id is safely set to null
      expect(item.productId).toBeNull();
      // Historical snapshots remain completely intact
      expect(item.productName).toBe('Ephemeral Product Historical Snapshot');
      expect(item.unitPrice).toBe(75);
      expect(item.quantity).toBe(1);
      expect(item.lineTotal).toBe(75);

      // Cleanup this ephemeral order
      await query('DELETE FROM orders WHERE id = $1;', [ephOrderId]);
    });
  });

  // =========================================================================
  // 7. Phase 7.2: Atomic Checkout & Concurrency Test Suite
  // =========================================================================
  describe('7. Phase 7.2: Atomic Checkout & Concurrency Test Suite', () => {
    let checkoutUser1Id = '';
    let checkoutUser1Token = '';
    let checkoutUser2Id = '';
    let checkoutUser2Token = '';
    let checkoutCategoryId = '';
    let checkoutProd1Id = '';
    let checkoutProd2Id = '';

    beforeAll(async () => {
      // Create dedicated checkout test users
      const u1Res = await query(
        `INSERT INTO users (full_name, email, password_hash, role, token_version)
         VALUES ($1, $2, $3, 'customer', 1)
         RETURNING id, email, role, token_version;`,
        [`Checkout User 1 ${timestamp}`, `chk_u1_${timestamp}@example.com`, 'hashed_pw']
      );
      checkoutUser1Id = u1Res.rows[0].id;
      checkoutUser1Token = signToken({
        id: checkoutUser1Id,
        email: u1Res.rows[0].email,
        role: 'customer',
        tokenVersion: 1
      });

      const u2Res = await query(
        `INSERT INTO users (full_name, email, password_hash, role, token_version)
         VALUES ($1, $2, $3, 'customer', 1)
         RETURNING id, email, role, token_version;`,
        [`Checkout User 2 ${timestamp}`, `chk_u2_${timestamp}@example.com`, 'hashed_pw']
      );
      checkoutUser2Id = u2Res.rows[0].id;
      checkoutUser2Token = signToken({
        id: checkoutUser2Id,
        email: u2Res.rows[0].email,
        role: 'customer',
        tokenVersion: 1
      });

      // Create test category and products
      const catRes = await query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3)
         RETURNING id;`,
        [`Checkout Test Cat ${timestamp}`, `chk-cat-${timestamp}`, 'Category for checkout testing']
      );
      checkoutCategoryId = catRes.rows[0].id;

      const p1Res = await query(
        `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
         VALUES ($1, $2, $3, $4, 150.00, 20, true)
         RETURNING id;`,
        [checkoutCategoryId, `Checkout Product 1 ${timestamp}`, `chk-prod-1-${timestamp}`, 'Desc 1']
      );
      checkoutProd1Id = p1Res.rows[0].id;

      const p2Res = await query(
        `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
         VALUES ($1, $2, $3, $4, 80.00, 15, true)
         RETURNING id;`,
        [checkoutCategoryId, `Checkout Product 2 ${timestamp}`, `chk-prod-2-${timestamp}`, 'Desc 2']
      );
      checkoutProd2Id = p2Res.rows[0].id;
    });

    afterAll(async () => {
      // Clean up orders, products, categories, users created for Phase 7.2 tests
      if (checkoutUser1Id || checkoutUser2Id) {
        await query('DELETE FROM orders WHERE user_id IN ($1, $2);', [checkoutUser1Id, checkoutUser2Id]);
      }
      if (checkoutCategoryId) {
        await query('DELETE FROM products WHERE category_id = $1;', [checkoutCategoryId]);
        await query('DELETE FROM categories WHERE id = $1;', [checkoutCategoryId]);
      }
      if (checkoutUser1Id || checkoutUser2Id) {
        await query('DELETE FROM users WHERE id IN ($1, $2);', [checkoutUser1Id, checkoutUser2Id]);
      }
    });

    it('should reject unauthenticated POST /api/orders/checkout with HTTP 401', async () => {
      const res = await request(app).post('/api/orders/checkout');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Authentication required/i);
    });

    it('should reject checkout when user cart is empty with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Cart is empty/i);
    });

    it('should reject invalid idempotency key format with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .set('Idempotency-Key', '   ');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Validation failed/i);
    });

    it('should successfully checkout, create immutable snapshots, decrement inventory, and clear cart', async () => {
      // 1. Add items to user 1's cart: 2 of Prod1 (2 * 150 = 300) and 1 of Prod2 (1 * 80 = 80)
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .send({ productId: checkoutProd1Id, quantity: 2 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .send({ productId: checkoutProd2Id, quantity: 1 });

      // Check stock before checkout: Prod1 = 20, Prod2 = 15
      const beforeProd1 = await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd1Id]);
      expect(beforeProd1.rows[0].stock_quantity).toBe(20);

      // 2. Perform checkout - include malicious client-supplied pricing/totals in body
      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .send({
          price: 0.01,
          total: 0.01,
          subtotal: 0.01,
          quantity: 999,
          status: 'delivered'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Order placed successfully/i);

      const order = res.body.data.order;
      expect(order.id).toBeDefined();
      expect(order.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]+$/);
      expect(order.status).toBe(ORDER_STATUS.PENDING); // Initial status must be pending, client input ignored
      expect(order.currency).toBe('INR');

      // Monetary values must be derived strictly from PostgreSQL: 300 + 80 = 380.00
      expect(order.subtotal).toBe(380);
      expect(order.totalAmount).toBe(380);
      expect(order.total).toBe(380);

      // Verify item snapshots
      expect(order.items.length).toBe(2);
      const item1 = order.items.find((i) => i.productId === checkoutProd1Id);
      expect(item1).toBeDefined();
      expect(item1.unitPrice).toBe(150);
      expect(item1.quantity).toBe(2);
      expect(item1.lineTotal).toBe(300);

      const item2 = order.items.find((i) => i.productId === checkoutProd2Id);
      expect(item2).toBeDefined();
      expect(item2.unitPrice).toBe(80);
      expect(item2.quantity).toBe(1);
      expect(item2.lineTotal).toBe(80);

      // 3. Verify customer cart is cleared
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);

      expect(cartRes.status).toBe(200);
      expect(cartRes.body.data.cart.items).toEqual([]);
      expect(cartRes.body.data.cart.totalItems).toBe(0);
      expect(cartRes.body.data.cart.totalAmount).toBe(0);

      // 4. Verify inventory was decremented correctly in PostgreSQL
      const afterProd1 = await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd1Id]);
      expect(afterProd1.rows[0].stock_quantity).toBe(18); // 20 - 2 = 18

      const afterProd2 = await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd2Id]);
      expect(afterProd2.rows[0].stock_quantity).toBe(14); // 15 - 1 = 14
    });

    it('should reject checkout and preserve cart/stock if stock is insufficient', async () => {
      // Create product with stock = 1
      const lowStockRes = await query(
        `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
         VALUES ($1, $2, $3, $4, 50.00, 1, true)
         RETURNING id;`,
        [checkoutCategoryId, `Low Stock Prod ${timestamp}`, `low-stock-prod-${timestamp}`, 'Desc']
      );
      const lowStockId = lowStockRes.rows[0].id;

      // Put 1 in cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .send({ productId: lowStockId, quantity: 1 });

      // Directly update product stock to 0 in database to simulate external race condition / out of stock
      await query('UPDATE products SET stock_quantity = 0 WHERE id = $1;', [lowStockId]);

      // Attempt checkout
      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Insufficient stock/i);

      // Verify stock is still 0
      const stockCheck = await query('SELECT stock_quantity FROM products WHERE id = $1;', [lowStockId]);
      expect(stockCheck.rows[0].stock_quantity).toBe(0);

      // Verify user's cart still has the item (no partial deletion)
      const cartCheck = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);
      expect(cartCheck.body.data.cart.items.length).toBe(1);

      // Clean up cart and product
      await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);
      await query('DELETE FROM products WHERE id = $1;', [lowStockId]);
    });

    it('should reject checkout if product in cart was deactivated', async () => {
      // Create inactive product
      const inactiveRes = await query(
        `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
         VALUES ($1, $2, $3, $4, 60.00, 10, true)
         RETURNING id;`,
        [checkoutCategoryId, `Deactivated Prod ${timestamp}`, `deact-prod-${timestamp}`, 'Desc']
      );
      const deactProdId = inactiveRes.rows[0].id;

      // Add to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .send({ productId: deactProdId, quantity: 1 });

      // Deactivate product in database
      await query('UPDATE products SET is_active = false WHERE id = $1;', [deactProdId]);

      // Attempt checkout
      const res = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/no longer active/i);

      // Clean up
      await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);
      await query('DELETE FROM products WHERE id = $1;', [deactProdId]);
    });

    it('should prevent overselling when two customers compete for the final unit concurrently', async () => {
      // 1. Create a scarce product with stock = 1
      const scarceRes = await query(
        `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
         VALUES ($1, $2, $3, $4, 99.00, 1, true)
         RETURNING id;`,
        [checkoutCategoryId, `Scarce Product ${timestamp}`, `scarce-prod-${timestamp}`, 'Scarce']
      );
      const scarceProdId = scarceRes.rows[0].id;

      // 2. Both Customer 1 and Customer 2 add the single available item to their respective carts
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .send({ productId: scarceProdId, quantity: 1 });

      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${checkoutUser2Token}`)
        .send({ productId: scarceProdId, quantity: 1 });

      // 3. Fire concurrent checkout requests simultaneously
      const [res1, res2] = await Promise.all([
        request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${checkoutUser1Token}`),
        request(app).post('/api/orders/checkout').set('Authorization', `Bearer ${checkoutUser2Token}`)
      ]);

      // Exactly ONE must succeed (201) and the other must be rejected (400)
      const results = [res1, res2];
      const successRes = results.find((r) => r.status === 201);
      const failureRes = results.find((r) => r.status === 400);

      expect(successRes).toBeDefined();
      expect(failureRes).toBeDefined();
      expect(failureRes.body.error.message).toMatch(/Insufficient stock/i);

      // 4. Verify stock in database is exactly 0 and NEVER negative
      const stockCheck = await query('SELECT stock_quantity FROM products WHERE id = $1;', [scarceProdId]);
      expect(stockCheck.rows[0].stock_quantity).toBe(0);

      // Clean up
      await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);
      await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${checkoutUser2Token}`);
      await query('DELETE FROM products WHERE id = $1;', [scarceProdId]);
    });

    it('should support idempotency: repeated request with same key returns original order and does not decrement stock twice', async () => {
      // 1. Setup user 1's cart with 1 item of Prod1 (stock currently 18)
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .send({ productId: checkoutProd1Id, quantity: 1 });

      const stockBefore = await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd1Id]);
      const initialStock = stockBefore.rows[0].stock_quantity;

      const idempotencyKey = `idem-${timestamp}-alpha`;

      // 2. First checkout request
      const res1 = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .set('Idempotency-Key', idempotencyKey);

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      const order1Id = res1.body.data.order.id;

      // Verify stock was decremented once
      const stockAfter1 = await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd1Id]);
      expect(stockAfter1.rows[0].stock_quantity).toBe(initialStock - 1);

      // 3. Second checkout request with the same idempotency key
      const res2 = await request(app)
        .post('/api/orders/checkout')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .set('Idempotency-Key', idempotencyKey);

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.message).toMatch(/idempotent/i);
      expect(res2.body.data.order.id).toBe(order1Id); // Must return the same order!

      // 4. Verify stock was NOT decremented a second time!
      const stockAfter2 = await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd1Id]);
      expect(stockAfter2.rows[0].stock_quantity).toBe(initialStock - 1);

      // Verify only 1 order exists in database with this idempotency key
      const ordersCount = await query(
        'SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1 AND idempotency_key = $2;',
        [checkoutUser1Id, idempotencyKey]
      );
      expect(ordersCount.rows[0].count).toBe(1);
    });

    it('should rollback entire transaction (order, order items, inventory, cart) on forced failure', async () => {
      // 1. Add item to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .send({ productId: checkoutProd1Id, quantity: 1 });

      const stockBefore = (await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd1Id])).rows[0].stock_quantity;
      const ordersCountBefore = (await query('SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1;', [checkoutUser1Id])).rows[0].count;

      // 2. Create a temporary trigger that raises an exception on cart_items deletion
      // This forces failure after order creation and stock decrement, testing full ACID rollback
      await query(`
        CREATE OR REPLACE FUNCTION test_forced_fail() RETURNS TRIGGER AS $$
        BEGIN
          RAISE EXCEPTION 'Simulated failure during checkout cart cleanup';
        END;
        $$ LANGUAGE plpgsql;
      `);
      await query(`
        CREATE TRIGGER trg_test_forced_fail
        BEFORE DELETE ON cart_items
        FOR EACH ROW
        EXECUTE FUNCTION test_forced_fail();
      `);

      try {
        const res = await request(app)
          .post('/api/orders/checkout')
          .set('Authorization', `Bearer ${checkoutUser1Token}`);

        expect(res.status).toBe(500);
      } finally {
        // Clean up temporary trigger immediately
        await query('DROP TRIGGER IF EXISTS trg_test_forced_fail ON cart_items;');
        await query('DROP FUNCTION IF EXISTS test_forced_fail();');
      }

      // 3. Verify atomic rollback:
      // a. No new order was committed
      const ordersCountAfter = (await query('SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1;', [checkoutUser1Id])).rows[0].count;
      expect(ordersCountAfter).toBe(ordersCountBefore);

      // b. Product stock was NOT decremented
      const stockAfter = (await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd1Id])).rows[0].stock_quantity;
      expect(stockAfter).toBe(stockBefore);

      // c. User cart items were NOT removed
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);
      expect(cartRes.body.data.cart.items.length).toBe(1);

      // Clean up cart
      await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${checkoutUser1Token}`);
    });

    it('should safely handle concurrent requests using the same idempotency key', async () => {
      // 1. Add 1 item of Prod2 to cart
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${checkoutUser1Token}`)
        .send({ productId: checkoutProd2Id, quantity: 1 });

      const stockBefore = await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd2Id]);
      const initialStock = stockBefore.rows[0].stock_quantity;

      const concurrentKey = `idem-concurrent-${timestamp}`;

      // 2. Fire two requests at the exact same moment with the same idempotency key
      const [resA, resB] = await Promise.all([
        request(app)
          .post('/api/orders/checkout')
          .set('Authorization', `Bearer ${checkoutUser1Token}`)
          .set('Idempotency-Key', concurrentKey),
        request(app)
          .post('/api/orders/checkout')
          .set('Authorization', `Bearer ${checkoutUser1Token}`)
          .set('Idempotency-Key', concurrentKey)
      ]);

      // Both should succeed (one with 201, one with 200 idempotent replay)
      expect([200, 201]).toContain(resA.status);
      expect([200, 201]).toContain(resB.status);
      expect(resA.body.data.order.id).toBe(resB.body.data.order.id);

      // Stock must be decremented only ONCE
      const stockAfter = await query('SELECT stock_quantity FROM products WHERE id = $1;', [checkoutProd2Id]);
      expect(stockAfter.rows[0].stock_quantity).toBe(initialStock - 1);
    });
  });
});


