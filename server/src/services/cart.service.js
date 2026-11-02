import { query } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Finds the user's active cart or creates one if it doesn't exist
 * @param {string} userId
 * @returns {Promise<string>} Cart UUID
 */
export const getOrCreateCartId = async (userId) => {
  const sql = `
    INSERT INTO carts (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
    RETURNING id;
  `;
  const res = await query(sql, [userId]);
  return res.rows[0].id;
};

/**
 * Retrieves the full user cart with joined product details and accurate server-calculated subtotals
 * @param {string} userId
 */
export const getCart = async (userId) => {
  const cartId = await getOrCreateCartId(userId);

  const sql = `
    SELECT 
      ci.id AS "itemId",
      ci.product_id AS "productId",
      ci.quantity,
      ci.added_at AS "addedAt",
      p.name,
      p.slug,
      p.price::float AS price,
      (ci.quantity * p.price)::float AS subtotal,
      p.stock_quantity AS "stockQuantity",
      p.image_url AS "imageUrl",
      p.is_active AS "isActive",
      c.name AS "categoryName",
      c.slug AS "categorySlug"
    FROM cart_items ci
    INNER JOIN products p ON p.id = ci.product_id
    INNER JOIN categories c ON c.id = p.category_id
    WHERE ci.cart_id = $1
    ORDER BY ci.added_at DESC;
  `;
  const res = await query(sql, [cartId]);
  const items = res.rows;

  let totalItems = 0;
  let totalAmount = 0;
  let hasUnavailableItems = false;

  items.forEach((item) => {
    totalItems += item.quantity;
    totalAmount += item.subtotal;
    if (!item.isActive || item.quantity > item.stockQuantity) {
      hasUnavailableItems = true;
    }
  });

  return {
    cartId,
    items,
    totalItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
    hasUnavailableItems
  };
};

/**
 * Adds an item to the user's cart or increments quantity if already present
 */
export const addToCart = async (userId, { productId, quantity = 1 }) => {
  if (!productId || !UUID_REGEX.test(productId)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch active product and check current stock
  const prodSql = `
    SELECT id, name, price, stock_quantity AS "stockQuantity", is_active AS "isActive"
    FROM products
    WHERE id = $1
    LIMIT 1;
  `;
  const prodRes = await query(prodSql, [productId]);
  const product = prodRes.rows[0];

  if (!product || !product.isActive) {
    const error = new Error('Product is unavailable or does not exist');
    error.statusCode = 404;
    throw error;
  }

  if (product.stockQuantity <= 0) {
    const error = new Error(`"${product.name}" is currently out of stock`);
    error.statusCode = 400;
    throw error;
  }

  const cartId = await getOrCreateCartId(userId);

  // 2. Check if product is already in cart to validate total cumulative quantity
  const existingSql = `
    SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2;
  `;
  const existingRes = await query(existingSql, [cartId, productId]);
  const currentInCart = existingRes.rows.length > 0 ? existingRes.rows[0].quantity : 0;
  const targetQuantity = currentInCart + quantity;

  if (targetQuantity > product.stockQuantity) {
    const error = new Error(
      `Cannot add ${quantity} item(s). Only ${product.stockQuantity} available in stock (you already have ${currentInCart} in your cart).`
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. UPSERT item into cart_items
  const upsertSql = `
    INSERT INTO cart_items (cart_id, product_id, quantity)
    VALUES ($1, $2, $3)
    ON CONFLICT (cart_id, product_id)
    DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
    RETURNING id, product_id, quantity;
  `;
  await query(upsertSql, [cartId, productId, quantity]);

  // Return refreshed cart
  return await getCart(userId);
};

/**
 * Updates the quantity of a specific item in the cart
 */
export const updateCartItemQuantity = async (userId, productId, quantity) => {
  if (!productId || !UUID_REGEX.test(productId)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  const cartId = await getOrCreateCartId(userId);

  // If quantity is 0 or less, remove item
  if (quantity <= 0) {
    return await removeFromCart(userId, productId);
  }

  // Verify stock limit
  const prodSql = `
    SELECT name, stock_quantity AS "stockQuantity", is_active AS "isActive"
    FROM products
    WHERE id = $1;
  `;
  const prodRes = await query(prodSql, [productId]);
  const product = prodRes.rows[0];

  if (!product || !product.isActive) {
    const error = new Error('Product is unavailable or has been deactivated');
    error.statusCode = 404;
    throw error;
  }

  if (quantity > product.stockQuantity) {
    const error = new Error(
      `Requested quantity of ${quantity} exceeds available stock of ${product.stockQuantity}`
    );
    error.statusCode = 400;
    throw error;
  }

  const updateSql = `
    UPDATE cart_items
    SET quantity = $1
    WHERE cart_id = $2 AND product_id = $3
    RETURNING id;
  `;
  const updateRes = await query(updateSql, [quantity, cartId, productId]);

  if (updateRes.rows.length === 0) {
    const error = new Error('Item not found in your cart');
    error.statusCode = 404;
    throw error;
  }

  return await getCart(userId);
};

/**
 * Removes an item from the cart
 */
export const removeFromCart = async (userId, productId) => {
  if (!productId || !UUID_REGEX.test(productId)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  const cartId = await getOrCreateCartId(userId);

  const deleteSql = `
    DELETE FROM cart_items
    WHERE cart_id = $1 AND product_id = $2
    RETURNING id;
  `;
  const deleteRes = await query(deleteSql, [cartId, productId]);

  if (deleteRes.rows.length === 0) {
    const error = new Error('Item not found in your cart');
    error.statusCode = 404;
    throw error;
  }

  return await getCart(userId);
};

/**
 * Clears all items from the user's cart
 */
export const clearCart = async (userId) => {
  const cartId = await getOrCreateCartId(userId);
  await query('DELETE FROM cart_items WHERE cart_id = $1;', [cartId]);
  return {
    cartId,
    items: [],
    totalItems: 0,
    totalAmount: 0,
    hasUnavailableItems: false
  };
};

export default {
  getOrCreateCartId,
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart
};