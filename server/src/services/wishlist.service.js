import { query } from '../config/db.js';
import { addToCart } from './cart.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Finds the user's active wishlist or creates one
 */
export const getOrCreateWishlistId = async (userId) => {
  const sql = `
    INSERT INTO wishlists (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
    RETURNING id;
  `;
  const res = await query(sql, [userId]);
  return res.rows[0].id;
};

/**
 * Retrieves the full wishlist with joined product details
 */
export const getWishlist = async (userId) => {
  const wishlistId = await getOrCreateWishlistId(userId);

  const sql = `
    SELECT 
      wi.id AS "itemId",
      wi.product_id AS "productId",
      wi.added_at AS "addedAt",
      p.name,
      p.slug,
      p.price::float AS price,
      p.stock_quantity AS "stockQuantity",
      p.image_url AS "imageUrl",
      p.is_active AS "isActive",
      c.name AS "categoryName",
      c.slug AS "categorySlug"
    FROM wishlist_items wi
    INNER JOIN products p ON p.id = wi.product_id
    INNER JOIN categories c ON c.id = p.category_id
    WHERE wi.wishlist_id = $1
    ORDER BY wi.added_at DESC;
  `;
  const res = await query(sql, [wishlistId]);
  return {
    wishlistId,
    items: res.rows,
    totalItems: res.rows.length
  };
};

/**
 * Adds a product to the user's wishlist (idempotent: does nothing if already present)
 */
export const addToWishlist = async (userId, productId) => {
  if (!productId || !UUID_REGEX.test(productId)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  // Check product existence
  const prodRes = await query('SELECT id, is_active FROM products WHERE id = $1', [productId]);
  if (prodRes.rows.length === 0 || !prodRes.rows[0].is_active) {
    const error = new Error('Product not found or unavailable');
    error.statusCode = 404;
    throw error;
  }

  const wishlistId = await getOrCreateWishlistId(userId);

  const insertSql = `
    INSERT INTO wishlist_items (wishlist_id, product_id)
    VALUES ($1, $2)
    ON CONFLICT (wishlist_id, product_id) DO NOTHING;
  `;
  await query(insertSql, [wishlistId, productId]);

  return await getWishlist(userId);
};

/**
 * Removes a product from the user's wishlist
 */
export const removeFromWishlist = async (userId, productId) => {
  if (!productId || !UUID_REGEX.test(productId)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  const wishlistId = await getOrCreateWishlistId(userId);

  const deleteSql = `
    DELETE FROM wishlist_items
    WHERE wishlist_id = $1 AND product_id = $2
    RETURNING id;
  `;
  const res = await query(deleteSql, [wishlistId, productId]);

  if (res.rows.length === 0) {
    const error = new Error('Item not found in your wishlist');
    error.statusCode = 404;
    throw error;
  }

  return await getWishlist(userId);
};

/**
 * Moves an item from wishlist to cart
 */
export const moveWishlistItemToCart = async (userId, productId) => {
  // 1. Add to cart (will validate stock)
  const updatedCart = await addToCart(userId, { productId, quantity: 1 });

  // 2. Remove from wishlist
  const wishlistId = await getOrCreateWishlistId(userId);
  await query('DELETE FROM wishlist_items WHERE wishlist_id = $1 AND product_id = $2;', [
    wishlistId,
    productId
  ]);

  const updatedWishlist = await getWishlist(userId);

  return {
    cart: updatedCart,
    wishlist: updatedWishlist
  };
};

export default {
  getOrCreateWishlistId,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveWishlistItemToCart
};