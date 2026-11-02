import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { query, pool } from '../src/config/db.js';
import { signToken } from '../src/config/jwt.js';

describe('Phase 5: Persistent Cart & Wishlist Test Suite', () => {
  const timestamp = Date.now();
  let customerToken = '';
  let userId = '';
  let testProductId = '';
  let testProductPrice = 0;
  let testProductStock = 0;

  beforeAll(async () => {
    // 1. Create a dedicated test user in the database
    const userRes = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, email, role;`,
      [`Cart Tester ${timestamp}`, `cart_tester_${timestamp}@example.com`, 'hashed_pw']
    );
    userId = userRes.rows[0].id;
    customerToken = signToken({
      id: userId,
      email: userRes.rows[0].email,
      role: 'customer'
    });

    // 2. Fetch a seeded active product with known stock and price
    const prodRes = await query(
      `SELECT id, name, price::float AS price, stock_quantity AS "stockQuantity"
       FROM products
       WHERE is_active = true AND stock_quantity > 5
       LIMIT 1;`
    );
    testProductId = prodRes.rows[0].id;
    testProductPrice = prodRes.rows[0].price;
    testProductStock = prodRes.rows[0].stockQuantity;
  });

  afterAll(async () => {
    // Clean up test user and cascade-delete their cart, wishlist, and items
    await query('DELETE FROM users WHERE id = $1;', [userId]);
    await pool.end();
  });

  describe('1. Cart Authentication & Initial State', () => {
    it('should reject unauthenticated GET /api/cart with HTTP 401', async () => {
      const res = await request(app).get('/api/cart');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return an empty cart for a new user with HTTP 200', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.items).toEqual([]);
      expect(res.body.data.cart.totalItems).toBe(0);
      expect(res.body.data.cart.totalAmount).toBe(0);
    });
  });

  describe('2. Add to Cart & Validation', () => {
    it('should reject adding item without productId with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject adding non-existent product UUID with HTTP 404', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: '00000000-0000-0000-0000-000000000000',
          quantity: 1
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('unavailable or does not exist');
    });

    it('should successfully add a valid product to cart', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProductId,
          quantity: 2
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const cart = res.body.data.cart;
      expect(cart.items.length).toBe(1);
      expect(cart.items[0].productId).toBe(testProductId);
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.totalItems).toBe(2);
      expect(cart.totalAmount).toBe(testProductPrice * 2);
    });

    it('should increment quantity via UPSERT when adding the same product again', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProductId,
          quantity: 1
        });

      expect(res.status).toBe(200);
      const cart = res.body.data.cart;
      expect(cart.items.length).toBe(1);
      expect(cart.items[0].quantity).toBe(3); // 2 + 1 = 3
      expect(cart.totalItems).toBe(3);
      expect(cart.totalAmount).toBe(testProductPrice * 3);
    });

    it('should reject adding quantity that exceeds available stock with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: testProductId,
          quantity: testProductStock + 50
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('available in stock');
    });
  });

  describe('3. Update & Remove Cart Items', () => {
    it('should update cart item quantity via PATCH /api/cart/items/:productId', async () => {
      const res = await request(app)
        .patch(`/api/cart/items/${testProductId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 4 });

      expect(res.status).toBe(200);
      const cart = res.body.data.cart;
      expect(cart.items[0].quantity).toBe(4);
      expect(cart.totalItems).toBe(4);
      expect(cart.totalAmount).toBe(testProductPrice * 4);
    });

    it('should remove item via DELETE /api/cart/items/:productId', async () => {
      const res = await request(app)
        .delete(`/api/cart/items/${testProductId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(0);
      expect(res.body.data.cart.totalItems).toBe(0);
      expect(res.body.data.cart.totalAmount).toBe(0);
    });

    it('should clear all items via DELETE /api/cart/clear', async () => {
      // Re-add 1 item first
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: testProductId, quantity: 1 });

      const clearRes = await request(app)
        .delete('/api/cart/clear')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(clearRes.status).toBe(200);
      expect(clearRes.body.data.cart.items).toEqual([]);
      expect(clearRes.body.data.cart.totalItems).toBe(0);
    });
  });

  describe('4. Wishlist APIs & Move to Cart', () => {
    it('should add a product to wishlist via POST /api/wishlist/items', async () => {
      const res = await request(app)
        .post('/api/wishlist/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: testProductId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.wishlist.items.length).toBe(1);
      expect(res.body.data.wishlist.items[0].productId).toBe(testProductId);
    });

    it('should be idempotent: adding duplicate item does not create duplicate entries', async () => {
      const res = await request(app)
        .post('/api/wishlist/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: testProductId });

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist.items.length).toBe(1);
    });

    it('should retrieve full wishlist via GET /api/wishlist', async () => {
      const res = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.wishlist.totalItems).toBe(1);
      expect(res.body.data.wishlist.items[0].name).toBeDefined();
    });

    it('should move an item from wishlist to cart via POST /api/wishlist/items/:id/move-to-cart', async () => {
      const res = await request(app)
        .post(`/api/wishlist/items/${testProductId}/move-to-cart`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Cart should now contain 1 item
      expect(res.body.data.cart.items.length).toBe(1);
      expect(res.body.data.cart.items[0].productId).toBe(testProductId);
      // Wishlist should now be empty
      expect(res.body.data.wishlist.items.length).toBe(0);
    });

    it('should remove an item from wishlist via DELETE /api/wishlist/items/:id', async () => {
      // Re-add to wishlist
      await request(app)
        .post('/api/wishlist/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: testProductId });

      const delRes = await request(app)
        .delete(`/api/wishlist/items/${testProductId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.wishlist.items.length).toBe(0);
    });
  });
});