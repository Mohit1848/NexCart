import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { query, pool } from '../src/config/db.js';
import { signToken } from '../src/config/jwt.js';

describe('Phase 4: Product & Category REST APIs Test Suite', () => {
  const timestamp = Date.now();
  let customerToken = '';
  let adminToken = '';
  let createdCategoryId = '';
  let createdProductId = '';
  let seededCategoryId = '';

  beforeAll(async () => {
    // Generate valid tokens for RBAC testing
    customerToken = signToken({
      id: '11111111-1111-1111-1111-111111111111',
      email: `customer_${timestamp}@example.com`,
      role: 'customer'
    });

    adminToken = signToken({
      id: '22222222-2222-2222-2222-222222222222',
      email: `admin_${timestamp}@example.com`,
      role: 'admin'
    });

    // Fetch one seeded category for reference
    const res = await query('SELECT id FROM categories LIMIT 1');
    seededCategoryId = res.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test items created during the test run
    await query("DELETE FROM products WHERE slug LIKE 'test-%'");
    await query("DELETE FROM categories WHERE slug LIKE 'test-%'");
    await pool.end();
  });

  describe('1. Category APIs (GET, POST, PATCH, DELETE)', () => {
    it('should list all categories with product counts (GET /api/categories)', async () => {
      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.categories[0].productCount).toBeDefined();
    });

    it('should retrieve a single category by slug (GET /api/categories/slug/:slug)', async () => {
      const res = await request(app).get('/api/categories/slug/electronics');

      expect(res.status).toBe(200);
      expect(res.body.data.category.slug).toBe('electronics');
    });

    it('should reject unauthenticated category creation with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({ name: 'Unauthorized Category' });

      expect(res.status).toBe(401);
    });

    it('should reject customer category creation with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Customer Attempt Category' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to create a category (POST /api/categories)', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Test Gadgets ${timestamp}`,
          slug: `test-gadgets-${timestamp}`,
          description: 'Specialized test gadgets for testing'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.category.id).toBeDefined();
      createdCategoryId = res.body.data.category.id;
    });

    it('should reject duplicate category name or slug with HTTP 409', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Test Gadgets ${timestamp}`,
          slug: `test-gadgets-${timestamp}`
        });

      expect(res.status).toBe(409);
    });

    it('should allow admin to update category (PATCH /api/categories/:id)', async () => {
      const res = await request(app)
        .patch(`/api/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated test description' });

      expect(res.status).toBe(200);
      expect(res.body.data.category.description).toBe('Updated test description');
    });

    it('should block category deletion if products are linked to it (HTTP 409)', async () => {
      // Seeded categories have products attached
      const res = await request(app)
        .delete(`/api/categories/${seededCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('product(s) linked to this category');
    });
  });

  describe('2. Product Public Storefront APIs (GET /api/products)', () => {
    it('should retrieve paginated products with complete metadata', async () => {
      const res = await request(app).get('/api/products?page=1&limit=4');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeLessThanOrEqual(4);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.currentPage).toBe(1);
      expect(res.body.data.pagination.limit).toBe(4);
      expect(res.body.data.pagination.totalItems).toBeGreaterThan(0);
      expect(res.body.data.pagination.totalPages).toBeGreaterThan(0);
    });

    it('should filter products by category slug (GET /api/products?category=audio-sound)', async () => {
      const res = await request(app).get('/api/products?category=audio-sound');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBeGreaterThan(0);
      res.body.data.products.forEach((p) => {
        expect(p.categorySlug).toBe('audio-sound');
      });
    });

    it('should search products by keyword (GET /api/products?search=Headphones)', async () => {
      const res = await request(app).get('/api/products?search=Headphones');

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBeGreaterThan(0);
      expect(res.body.data.products[0].name).toContain('Headphones');
    });

    it('should sort products by price ASC (GET /api/products?sortBy=price&order=asc)', async () => {
      const res = await request(app).get('/api/products?sortBy=price&order=asc');

      expect(res.status).toBe(200);
      const prices = res.body.data.products.map((p) => p.price);
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });

    it('should reject invalid query parameters with HTTP 400', async () => {
      const res = await request(app).get('/api/products?sortBy=malicious_col&order=invalid');

      expect(res.status).toBe(400);
      expect(res.body.error.details.length).toBeGreaterThanOrEqual(1);
    });

    it('should safely resist SQL injection attempts in search and sort parameters', async () => {
      const res = await request(app).get(
        "/api/products?search=' OR 1=1 --&sortBy=price"
      );

      // Must succeed safely without executing SQL injection
      expect(res.status).toBe(200);
    });

    it('should retrieve single product by slug (GET /api/products/slug/:slug)', async () => {
      const res = await request(app).get(
        '/api/products/slug/aurawave-pro-anc-headphones'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe('AuraWave Pro ANC Headphones');
      expect(res.body.data.product.categoryName).toBe('Audio & Sound');
    });

    it('should reject invalid UUID format with HTTP 400', async () => {
      const res = await request(app).get('/api/products/not-a-valid-uuid');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid product ID format');
    });

    it('should return HTTP 404 for non-existent product UUID', async () => {
      const res = await request(app).get(
        '/api/products/00000000-0000-0000-0000-000000000000'
      );

      expect(res.status).toBe(404);
    });
  });

  describe('3. Product Administrator Management Endpoints', () => {
    it('should reject unauthenticated product creation with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Unauthorized Watch' });

      expect(res.status).toBe(401);
    });

    it('should reject customer product creation with HTTP 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Customer Attempt Product' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to create a new product (POST /api/products)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Test Wireless Mouse ${timestamp}`,
          slug: `test-wireless-mouse-${timestamp}`,
          categoryId: seededCategoryId,
          description: 'High-precision ergonomic wireless gaming mouse with 20K DPI optical sensor.',
          price: 1999.00,
          stockQuantity: 25,
          imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.product.id).toBeDefined();
      expect(res.body.data.product.price).toBe(1999.00);
      createdProductId = res.body.data.product.id;
    });

    it('should reject negative price or stock quantity with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Price Product',
          categoryId: seededCategoryId,
          description: 'A product with invalid price value.',
          price: -50.00,
          stockQuantity: -5
        });

      expect(res.status).toBe(400);
    });

    it('should allow admin to update product fields (PATCH /api/products/:id)', async () => {
      const res = await request(app)
        .patch(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 2499.00,
          stockQuantity: 50
        });

      expect(res.status).toBe(200);
      expect(res.body.data.product.price).toBe(2499.00);
      expect(res.body.data.product.stockQuantity).toBe(50);
    });

    it('should allow admin to safely deactivate product (DELETE /api/products/:id)', async () => {
      const res = await request(app)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deactivated successfully');

      // Verify deactivated product is no longer returned in public catalog
      const pubRes = await request(app).get(`/api/products/${createdProductId}`);
      expect(pubRes.status).toBe(404);
    });
  });
});