import { query, pool } from '../config/db.js';

export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
});

export const DEFAULT_ORDER_STATUS = ORDER_STATUS.PENDING;

/**
 * Exact monetary math helpers operating in integer paise/cents
 * Prevents floating-point accumulation errors during financial calculations
 */
export const parseToPaise = (numStr) => {
  const str = String(numStr).trim();
  const parts = str.split('.');
  const whole = parseInt(parts[0], 10) || 0;
  const dec = (parts[1] || '').padEnd(2, '0').slice(0, 2);
  const frac = parseInt(dec, 10) || 0;
  const sign = str.startsWith('-') ? -1 : 1;
  return sign * (Math.abs(whole) * 100 + frac);
};

export const formatFromPaise = (paise) => {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${String(frac).padStart(2, '0')}`;
};

/**
 * Generates a unique, human-readable order number.
 * Format: ORD-YYYYMMDD-XXXXXX (e.g. ORD-20261103-7F3A2B)
 */
export const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${dateStr}-${randomSuffix}`;
};

/**
 * Retrieves a single order by ID scoped to the authenticated customer
 */
export const getOrderById = async (orderId, userId) => {
  const dataSql = `
    SELECT 
      o.id,
      o.user_id AS "userId",
      o.order_number AS "orderNumber",
      o.status,
      o.currency,
      o.subtotal::float AS subtotal,
      o.total_amount::float AS "totalAmount",
      o.total_amount::float AS total,
      o.idempotency_key AS "idempotencyKey",
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', oi.id,
              'productId', oi.product_id,
              'productName', oi.product_name,
              'unitPrice', oi.unit_price::float,
              'quantity', oi.quantity,
              'lineTotal', oi.line_total::float,
              'createdAt', oi.created_at
            ) ORDER BY oi.created_at ASC
          )
          FROM order_items oi
          WHERE oi.order_id = o.id
        ),
        '[]'::json
      ) AS items
    FROM orders o
    WHERE o.id = $1 AND o.user_id = $2;
  `;
  const res = await query(dataSql, [orderId, userId]);
  return res.rows[0] || null;
};

/**
 * Retrieves an existing order by customer ID and idempotency key
 */
export const getOrderByUserAndIdempotencyKey = async (userId, idempotencyKey) => {
  if (!idempotencyKey) return null;

  const dataSql = `
    SELECT 
      o.id,
      o.user_id AS "userId",
      o.order_number AS "orderNumber",
      o.status,
      o.currency,
      o.subtotal::float AS subtotal,
      o.total_amount::float AS "totalAmount",
      o.total_amount::float AS total,
      o.idempotency_key AS "idempotencyKey",
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', oi.id,
              'productId', oi.product_id,
              'productName', oi.product_name,
              'unitPrice', oi.unit_price::float,
              'quantity', oi.quantity,
              'lineTotal', oi.line_total::float,
              'createdAt', oi.created_at
            ) ORDER BY oi.created_at ASC
          )
          FROM order_items oi
          WHERE oi.order_id = o.id
        ),
        '[]'::json
      ) AS items
    FROM orders o
    WHERE o.user_id = $1 AND o.idempotency_key = $2;
  `;
  const res = await query(dataSql, [userId, idempotencyKey]);
  return res.rows[0] || null;
};

/**
 * Retrieves paginated orders for a specific authenticated user.
 */
export const getUserOrders = async (userId, { page = 1, limit = 10 } = {}) => {
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM orders
    WHERE user_id = $1;
  `;
  const countRes = await query(countSql, [userId]);
  const totalItems = countRes.rows[0].total;

  const totalPages = Math.ceil(totalItems / limit) || 1;
  const offset = (page - 1) * limit;

  const dataSql = `
    SELECT 
      o.id,
      o.user_id AS "userId",
      o.order_number AS "orderNumber",
      o.status,
      o.currency,
      o.subtotal::float AS subtotal,
      o.total_amount::float AS "totalAmount",
      o.total_amount::float AS total,
      o.idempotency_key AS "idempotencyKey",
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', oi.id,
              'productId', oi.product_id,
              'productName', oi.product_name,
              'unitPrice', oi.unit_price::float,
              'quantity', oi.quantity,
              'lineTotal', oi.line_total::float,
              'createdAt', oi.created_at
            ) ORDER BY oi.created_at ASC
          )
          FROM order_items oi
          WHERE oi.order_id = o.id
        ),
        '[]'::json
      ) AS items
    FROM orders o
    WHERE o.user_id = $1
    ORDER BY o.created_at DESC
    LIMIT $2 OFFSET $3;
  `;

  const dataRes = await query(dataSql, [userId, limit, offset]);

  return {
    orders: dataRes.rows,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Atomic Checkout & Order Placement Transaction
 * 
 * Concurrency & Integrity Guarantees:
 * 1. Checks idempotency key early and returns committed order if duplicate request.
 * 2. Acquires dedicated checked-out PostgreSQL client for the entire transaction.
 * 3. Locks user's cart row (FOR UPDATE) to prevent concurrent modifications.
 * 4. Locks all referenced products in deterministic sorted primary key order (ORDER BY id ASC FOR UPDATE)
 *    to prevent deadlocks between concurrent checkouts.
 * 5. Re-reads and validates stock quantity, active status, and price authoritatively from PostgreSQL.
 * 6. Calculates line totals and subtotals using exact integer arithmetic (in paise/cents).
 * 7. Inserts order and immutable order-item snapshot rows.
 * 8. Decrements product inventory using guarded updates (stock_quantity = stock_quantity - $1 WHERE stock_quantity >= $1).
 * 9. Clears the customer's cart.
 * 10. Commits transaction and releases database client in a finally block.
 * 
 * @param {string} userId - UUID of authenticated customer
 * @param {object} options - Optional { idempotencyKey }
 */
export const processCheckout = async (userId, { idempotencyKey = null } = {}) => {
  // 1. Idempotency pre-check
  if (idempotencyKey) {
    const existing = await getOrderByUserAndIdempotencyKey(userId, idempotencyKey);
    if (existing) {
      return {
        order: existing,
        isIdempotentReplay: true
      };
    }
  }

  // 2. Acquire a dedicated client from the pool
  const client = await pool.connect();

  try {
    // 3. Begin atomic transaction
    await client.query('BEGIN');

    // 4. Lock and read user's cart
    const cartRes = await client.query(
      'SELECT id FROM carts WHERE user_id = $1 FOR UPDATE;',
      [userId]
    );

    if (cartRes.rows.length === 0) {
      const err = new Error('Cart is empty. Cannot checkout an empty cart.');
      err.statusCode = 400;
      throw err;
    }

    const cartId = cartRes.rows[0].id;

    // 5. Lock and read cart items
    const cartItemsRes = await client.query(
      `SELECT id, product_id, quantity 
       FROM cart_items 
       WHERE cart_id = $1 
       ORDER BY product_id ASC 
       FOR UPDATE;`,
      [cartId]
    );

    if (cartItemsRes.rows.length === 0) {
      // If concurrent request with same idempotency key already completed and emptied the cart, return that order
      if (idempotencyKey) {
        const existing = await client.query(
          `SELECT o.id, o.user_id AS "userId", o.order_number AS "orderNumber",
                  o.status, o.currency, o.subtotal::float AS subtotal,
                  o.total_amount::float AS "totalAmount", o.total_amount::float AS total,
                  o.idempotency_key AS "idempotencyKey", o.created_at AS "createdAt", o.updated_at AS "updatedAt",
                  COALESCE(
                    (
                      SELECT json_agg(
                        json_build_object(
                          'id', oi.id,
                          'productId', oi.product_id,
                          'productName', oi.product_name,
                          'unitPrice', oi.unit_price::float,
                          'quantity', oi.quantity,
                          'lineTotal', oi.line_total::float,
                          'createdAt', oi.created_at
                        ) ORDER BY oi.created_at ASC
                      )
                      FROM order_items oi
                      WHERE oi.order_id = o.id
                    ),
                    '[]'::json
                  ) AS items
           FROM orders o
           WHERE o.user_id = $1 AND o.idempotency_key = $2;`,
          [userId, idempotencyKey]
        );

        if (existing.rows.length > 0) {
          await client.query('COMMIT');
          return {
            order: existing.rows[0],
            isIdempotentReplay: true
          };
        }
      }

      const err = new Error('Cart is empty. Cannot checkout an empty cart.');
      err.statusCode = 400;
      throw err;
    }

    const cartItems = cartItemsRes.rows;

    // 6. Lock and fetch products in deterministic sorted ID order (Deadlock prevention)
    const productIds = cartItems.map((item) => item.product_id).sort();
    const prodsRes = await client.query(
      `SELECT id, name, price, stock_quantity, is_active
       FROM products
       WHERE id = ANY($1::uuid[])
       ORDER BY id ASC
       FOR UPDATE;`,
      [productIds]
    );

    const prodMap = new Map(prodsRes.rows.map((p) => [p.id, p]));

    // 7. Validate product existence, active status, valid price, and stock sufficiency
    let subtotalPaise = 0;
    const preparedItems = [];

    for (const item of cartItems) {
      const prod = prodMap.get(item.product_id);

      if (!prod) {
        const err = new Error('One or more products in your cart are no longer available.');
        err.statusCode = 400;
        throw err;
      }

      if (!prod.is_active) {
        const err = new Error(`Product "${prod.name}" is no longer active or available for purchase.`);
        err.statusCode = 400;
        throw err;
      }

      const unitPricePaise = parseToPaise(prod.price);
      if (unitPricePaise < 0) {
        const err = new Error(`Product "${prod.name}" has an invalid price.`);
        err.statusCode = 400;
        throw err;
      }

      if (prod.stock_quantity < item.quantity) {
        const err = new Error(
          `Insufficient stock for "${prod.name}". Available: ${prod.stock_quantity}, requested: ${item.quantity}.`
        );
        err.statusCode = 400;
        throw err;
      }

      const lineTotalPaise = unitPricePaise * item.quantity;
      subtotalPaise += lineTotalPaise;

      preparedItems.push({
        productId: prod.id,
        productName: prod.name,
        unitPricePaise,
        unitPriceStr: formatFromPaise(unitPricePaise),
        quantity: item.quantity,
        lineTotalPaise,
        lineTotalStr: formatFromPaise(lineTotalPaise)
      });
    }

    const subtotalStr = formatFromPaise(subtotalPaise);
    const totalAmountStr = subtotalStr; // In Phase 7.2 no taxes/shipping

    // 8. Create the order row
    const orderNumber = generateOrderNumber();
    const orderRes = await client.query(
      `INSERT INTO orders (
         user_id,
         order_number,
         status,
         currency,
         subtotal,
         total_amount,
         idempotency_key
       ) VALUES ($1, $2, 'pending', 'INR', $3::numeric, $4::numeric, $5)
       RETURNING id, order_number AS "orderNumber", status, currency, 
                 subtotal::float, total_amount::float AS "totalAmount", total_amount::float AS total,
                 idempotency_key AS "idempotencyKey", created_at AS "createdAt", updated_at AS "updatedAt";`,
      [userId, orderNumber, subtotalStr, totalAmountStr, idempotencyKey]
    );

    const createdOrder = orderRes.rows[0];

    // 9. Create immutable order item snapshot rows
    const createdItems = [];
    for (const item of preparedItems) {
      const itemRes = await client.query(
        `INSERT INTO order_items (
           order_id,
           product_id,
           product_name,
           unit_price,
           quantity,
           line_total
         ) VALUES ($1, $2, $3, $4::numeric, $5, $6::numeric)
         RETURNING id, product_id AS "productId", product_name AS "productName",
                   unit_price::float AS "unitPrice", quantity,
                   line_total::float AS "lineTotal", created_at AS "createdAt";`,
        [
          createdOrder.id,
          item.productId,
          item.productName,
          item.unitPriceStr,
          item.quantity,
          item.lineTotalStr
        ]
      );
      createdItems.push(itemRes.rows[0]);
    }

    // 10. Decrement inventory with guarded updates to prevent negative stock
    for (const item of preparedItems) {
      const decRes = await client.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - $1
         WHERE id = $2 AND stock_quantity >= $1
         RETURNING id, stock_quantity;`,
        [item.quantity, item.productId]
      );

      if (decRes.rowCount === 0) {
        const err = new Error(
          `Stock decrement failed for "${item.productName}". Insufficient stock available.`
        );
        err.statusCode = 400;
        throw err;
      }
    }

    // 11. Clear the customer's cart
    await client.query('DELETE FROM cart_items WHERE cart_id = $1;', [cartId]);
    await client.query('UPDATE carts SET updated_at = NOW() WHERE id = $1;', [cartId]);

    // 12. Commit atomic transaction
    await client.query('COMMIT');

    return {
      order: {
        ...createdOrder,
        items: createdItems
      },
      isIdempotentReplay: false
    };
  } catch (err) {
    // 13. Rollback on any failure
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // ignore rollback error
    }

    // Check if failure was caused by duplicate idempotency key race condition
    if (
      err.code === '23505' &&
      (err.constraint?.includes('idempotency') || err.message?.includes('idempotency'))
    ) {
      if (idempotencyKey) {
        const existing = await getOrderByUserAndIdempotencyKey(userId, idempotencyKey);
        if (existing) {
          return {
            order: existing,
            isIdempotentReplay: true
          };
        }
      }
    }

    throw err;
  } finally {
    // 14. Always release checked-out client back to pool
    client.release();
  }
};
