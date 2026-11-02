import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { query, pool } from '../src/config/db.js';
import { signToken } from '../src/config/jwt.js';

describe('Phase 6: Admin Dashboard & Inventory Management Test Suite', () => {
  const timestamp = Date.now();
  let adminToken = '';
  let customerToken = '';
  let adminUserId = '';
  let customerUserId = '';
  let testProductId = '';
  let originalStock = 0;
  let originalPrice = 0;
  let originalName = '';

  beforeAll(async () => {
    // 1. Create an admin user
    const adminRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, email, role;`,
      [`Admin Tester ${timestamp}`, `admin_tester_${timestamp}@example.com`, 'hashed_pw']
    );
    adminUserId = adminRes.rows[0].id;
    adminToken = signToken({
      id: adminUserId,
      email: adminRes.rows[0].email,
      role: 'admin'
    });

    // 2. Create a customer user for RBAC verification
    const customerRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, email, role;`,
      [`Customer Tester ${timestamp}`, `cust_tester_${timestamp}@example.com`, 'hashed_pw']
    );
    customerUserId = customerRes.rows[0].id;
    customerToken = signToken({
      id: customerUserId,
      email: customerRes.rows[0].email,
      role: 'customer'
    });

    // 3. Create a dedicated test product with known category and stock
    const catRes = await query('SELECT id FROM categories LIMIT 1;');
    const categoryId = catRes.rows[0].id;

    const prodRes = await query(
      `INSERT INTO products (category_id, name, slug, description, price, stock_quantity, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, price::float AS price, stock_quantity AS "stockQuantity";`,
      [
        categoryId,
        `Phase 6 Admin Test Product ${timestamp}`,
        `p6-admin-test-${timestamp}`,
        'Dedicated product for admin test verification',
        99.99,
        10
      ]
    );
    testProductId = prodRes.rows[0].id;
    originalName = prodRes.rows[0].name;
    originalPrice = prodRes.rows[0].price;
    originalStock = prodRes.rows[0].stockQuantity;
  });

  afterAll(async () => {
    // Clean up dedicated test records
    if (testProductId) {
      await query('DELETE FROM products WHERE id = $1;', [testProductId]);
    }
    if (adminUserId) {
      await query('DELETE FROM users WHERE id = $1;', [adminUserId]);
    }
    if (customerUserId) {
      await query('DELETE FROM users WHERE id = $1;', [customerUserId]);
    }
    await pool.end();
  });

  // ==========================================
  // 1. Authentication & Role-Based Access Control
  // ==========================================
  describe('1. Authentication & RBAC Enforcement', () => {
    it('should reject unauthenticated GET /api/admin/metrics with HTTP 401', async () => {
      const res = await request(app).get('/api/admin/metrics');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject customer role GET /api/admin/metrics with HTTP 403', async () => {
      const res = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated GET /api/admin/products with HTTP 401', async () => {
      const res = await request(app).get('/api/admin/products');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject customer role GET /api/admin/products with HTTP 403', async () => {
      const res = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated PATCH /api/admin/products/:id/stock with HTTP 401', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .send({ stockQuantity: 20 });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject customer role PATCH /api/admin/products/:id/stock with HTTP 403', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ stockQuantity: 20 });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject customer role PATCH /api/admin/products/:id/toggle-status with HTTP 403', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/toggle-status`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 2. Admin Metrics & Inventory Valuation
  // ==========================================
  describe('2. Admin Metrics & Inventory Valuation', () => {
    it('should return 200 and accurate catalog/inventory metrics for admin', async () => {
      const res = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const { overview, restockPriorityList } = res.body.data;
      expect(overview).toBeDefined();
      expect(typeof overview.totalProducts).toBe('number');
      expect(typeof overview.activeProducts).toBe('number');
      expect(typeof overview.inactiveProducts).toBe('number');
      expect(typeof overview.lowStockProducts).toBe('number');
      expect(typeof overview.outOfStockProducts).toBe('number');
      expect(typeof overview.totalCategories).toBe('number');
      expect(typeof overview.totalInventoryValue).toBe('number');
      expect(overview.valuationBasis).toBe('active_retail_price');

      // Logical sanity check: total = active + inactive
      expect(overview.totalProducts).toBe(overview.activeProducts + overview.inactiveProducts);
      expect(overview.totalProducts).toBeGreaterThanOrEqual(1);
      expect(overview.totalInventoryValue).toBeGreaterThan(0);

      // Verify restockPriorityList structure
      expect(Array.isArray(restockPriorityList)).toBe(true);
      for (const item of restockPriorityList) {
        expect(item.stockQuantity).toBeLessThanOrEqual(5);
        expect(item.isActive).toBe(true);
      }
    });
  });

  // ==========================================
  // 3. Admin Products Query & Filtering
  // ==========================================
  describe('3. Admin Products Query & Filtering', () => {
    it('should return paginated products list including inactive products for admin', async () => {
      const res = await request(app)
        .get('/api/admin/products?limit=10&page=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.currentPage).toBe(1);
      expect(res.body.data.pagination.limit).toBe(10);
    });

    it('should filter products by stockStatus=in_stock', async () => {
      const res = await request(app)
        .get('/api/admin/products?stockStatus=in_stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const prod of res.body.data.products) {
        expect(prod.stockQuantity).toBeGreaterThan(0);
      }
    });

    it('should filter products by stockStatus=low_stock (1 to 5)', async () => {
      const res = await request(app)
        .get('/api/admin/products?stockStatus=low_stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const prod of res.body.data.products) {
        expect(prod.stockQuantity).toBeGreaterThanOrEqual(1);
        expect(prod.stockQuantity).toBeLessThanOrEqual(5);
      }
    });

    it('should filter products by stockStatus=out_of_stock (= 0)', async () => {
      const res = await request(app)
        .get('/api/admin/products?stockStatus=out_of_stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const prod of res.body.data.products) {
        expect(prod.stockQuantity).toBe(0);
      }
    });

    it('should reject invalid stockStatus filter with HTTP 400', async () => {
      const res = await request(app)
        .get('/api/admin/products?stockStatus=negative')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid query parameters');
    });

    it('should reject invalid sort column with HTTP 400', async () => {
      const res = await request(app)
        .get('/api/admin/products?sortBy=password_hash')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should search products by slug', async () => {
      const res = await request(app)
        .get(`/api/admin/products?search=${encodeURIComponent(`p6-admin-test-${timestamp}`)}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.products.some((p) => p.id === testProductId)).toBe(true);
    });
  });

  // ==========================================
  // 4. Update Product Stock
  // ==========================================
  describe('4. Stock Quantity Updates', () => {
    it('should update stock quantity to a valid integer with HTTP 200', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: 25 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.stockQuantity).toBe(25);

      // Verify in DB that price and name did not change
      const dbCheck = await query(
        'SELECT name, price::float AS price, stock_quantity FROM products WHERE id = $1;',
        [testProductId]
      );
      expect(dbCheck.rows[0].stock_quantity).toBe(25);
      expect(dbCheck.rows[0].price).toBe(originalPrice);
      expect(dbCheck.rows[0].name).toBe(originalName);
    });

    it('should allow setting stock to 0 (out of stock)', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: 0 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.stockQuantity).toBe(0);
    });

    it('should reject negative stock quantity with HTTP 400', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: -5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details).toContain('stockQuantity cannot be negative');
    });

    it('should reject fractional stock quantity with HTTP 400', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: 4.5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-numeric stockQuantity with HTTP 400', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: 'ten' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject payload attempting to modify unpermitted fields (e.g. price) with HTTP 400', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: 30, price: 1.99 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details.some((d) => d.includes('Unpermitted fields'))).toBe(true);
    });

    it('should reject stockQuantity exceeding 100,000 with HTTP 400', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: 100001 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details.some((d) => d.includes('exceeds reasonable upper limit'))).toBe(true);
    });

    it('should reject non-object body with HTTP 400', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('"just a string"');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return HTTP 400 for invalid UUID parameter format', async () => {
      const res = await request(app)
        .patch('/api/admin/products/invalid-uuid-123/stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: 10 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return HTTP 404 for non-existent product UUID', async () => {
      const nonExistentUuid = 'a0000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/admin/products/${nonExistentUuid}/stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stockQuantity: 10 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Product not found');
    });
  });

  // ==========================================
  // 5. Toggle Product Active Status
  // ==========================================
  describe('5. Product Status Toggling', () => {
    it('should toggle product from active to inactive with HTTP 200', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.isActive).toBe(false);

      // Verify that public catalog endpoint /api/products does NOT return deactivated product
      const publicRes = await request(app).get(`/api/products?search=${encodeURIComponent(originalName)}`);
      expect(publicRes.status).toBe(200);
      const found = publicRes.body.data.products.some((p) => p.id === testProductId);
      expect(found).toBe(false);
    });

    it('should toggle product back from inactive to active with HTTP 200', async () => {
      const res = await request(app)
        .patch(`/api/admin/products/${testProductId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.isActive).toBe(true);

      // Verify that public catalog endpoint /api/products returns it again
      const publicRes = await request(app).get(`/api/products?search=${encodeURIComponent(originalName)}`);
      expect(publicRes.status).toBe(200);
      const found = publicRes.body.data.products.some((p) => p.id === testProductId);
      expect(found).toBe(true);
    });

    it('should exclude inactive products from inventory valuation and match active retail total', async () => {
      // 1. Fetch current metrics
      const res = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const metricsValuation = res.body.data.overview.totalInventoryValue;

      // 2. Query database directly for active products valuation
      const activeDb = await query(
        'SELECT COALESCE(SUM(price * stock_quantity), 0)::numeric(12,2) AS val FROM products WHERE is_active = true;'
      );
      const expectedActiveValuation = parseFloat(activeDb.rows[0].val);

      // Verify metrics valuation matches active products exactly
      expect(metricsValuation).toBe(expectedActiveValuation);

      // 3. Query inactive products and total valuation
      const inactiveDb = await query(
        'SELECT COALESCE(SUM(price * stock_quantity), 0)::numeric(12,2) AS val FROM products WHERE is_active = false;'
      );
      const inactiveValuation = parseFloat(inactiveDb.rows[0].val);

      const allDb = await query(
        'SELECT COALESCE(SUM(price * stock_quantity), 0)::numeric(12,2) AS val FROM products;'
      );
      const allValuation = parseFloat(allDb.rows[0].val);

      // Sanity check that total = active + inactive
      expect(allValuation).toBe(parseFloat((expectedActiveValuation + inactiveValuation).toFixed(2)));
    });

    it('should return HTTP 404 for status toggle on non-existent product UUID', async () => {
      const nonExistentUuid = 'a0000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/admin/products/${nonExistentUuid}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
