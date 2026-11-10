import { query, pool } from '../config/db.js';
import { getProducts } from './product.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieves aggregate catalog and inventory metrics from PostgreSQL
 * 
 * Valuation Note:
 * - "totalInventoryValue" represents the total retail value (selling price * stock quantity)
 *   of all ACTIVE marketable inventory items.
 * - Inactive (soft-deleted) items are excluded from active valuation but tracked in "inactiveProducts".
 */
export const getAdminMetrics = async () => {
  // 1. Single-pass conditional aggregation on products table
  const productStatsSql = `
    SELECT
      COUNT(*)::int AS "totalProducts",
      COUNT(*) FILTER (WHERE is_active = true)::int AS "activeProducts",
      COUNT(*) FILTER (WHERE is_active = false)::int AS "inactiveProducts",
      COUNT(*) FILTER (WHERE is_active = true AND stock_quantity >= 1 AND stock_quantity <= 5)::int AS "lowStockProducts",
      COUNT(*) FILTER (WHERE is_active = true AND stock_quantity = 0)::int AS "outOfStockProducts",
      COALESCE(SUM(CASE WHEN is_active = true THEN price * stock_quantity ELSE 0 END), 0)::numeric(12,2) AS "totalInventoryValue"
    FROM products;
  `;
  const prodStatsRes = await query(productStatsSql);
  const stats = prodStatsRes.rows[0];

  // 2. Total categories count
  const catCountRes = await query('SELECT COUNT(*)::int AS "totalCategories" FROM categories;');
  const totalCategories = catCountRes.rows[0].totalCategories;

  // 3. Restock priority list: items with stock <= 5 ordered by stock ascending
  const restockSql = `
    SELECT
      p.id,
      p.name,
      p.slug,
      p.stock_quantity AS "stockQuantity",
      p.price::float AS price,
      p.is_active AS "isActive",
      c.name AS "categoryName",
      c.slug AS "categorySlug"
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true AND p.stock_quantity >= 0 AND p.stock_quantity <= 5
    ORDER BY p.stock_quantity ASC, p.name ASC
    LIMIT 5;
  `;
  const restockRes = await query(restockSql);

  return {
    overview: {
      totalProducts: stats.totalProducts,
      activeProducts: stats.activeProducts,
      inactiveProducts: stats.inactiveProducts,
      lowStockProducts: stats.lowStockProducts,
      outOfStockProducts: stats.outOfStockProducts,
      totalCategories,
      totalInventoryValue: parseFloat(stats.totalInventoryValue),
      valuationBasis: 'active_retail_price'
    },
    restockPriorityList: restockRes.rows
  };
};

/**
 * Retrieves admin products listing (includes inactive items and stockStatus filtering)
 */
export const getAdminProducts = async (queryParams) => {
  return await getProducts({
    ...queryParams,
    includeInactive: true
  });
};

/**
 * Updates only the stock quantity for a specific product
 * @param {string} productId - Product UUID
 * @param {number} stockQuantity - Non-negative integer
 */
export const updateProductStock = async (productId, stockQuantity) => {
  if (!productId || !UUID_REGEX.test(productId)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  const sql = `
    UPDATE products
    SET stock_quantity = $1
    WHERE id = $2
    RETURNING 
      id, category_id AS "categoryId", name, slug, description, price::float AS price,
      stock_quantity AS "stockQuantity", image_url AS "imageUrl", is_active AS "isActive",
      created_at AS "createdAt", updated_at AS "updatedAt";
  `;
  const res = await query(sql, [stockQuantity, productId]);

  if (res.rows.length === 0) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return res.rows[0];
};

/**
 * Toggles product activation status (active <-> inactive)
 * @param {string} productId - Product UUID
 */
export const toggleProductStatus = async (productId) => {
  if (!productId || !UUID_REGEX.test(productId)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  const sql = `
    UPDATE products
    SET is_active = NOT is_active
    WHERE id = $1
    RETURNING 
      id, category_id AS "categoryId", name, slug, description, price::float AS price,
      stock_quantity AS "stockQuantity", image_url AS "imageUrl", is_active AS "isActive",
      created_at AS "createdAt", updated_at AS "updatedAt";
  `;
  const res = await query(sql, [productId]);

  if (res.rows.length === 0) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return res.rows[0];
};

export const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  pending: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
});

const ALLOWED_ORDER_SORT_MAP = {
  created_at: 'o.created_at',
  total_amount: 'o.total_amount',
  order_number: 'o.order_number',
  status: 'o.status'
};

/**
 * Retrieves paginated, filtered, and searchable orders across all customers for admins.
 * Uses a single aggregation query with GROUP BY to avoid N+1 queries for item counts.
 */
export const getAdminOrders = async ({
  page = 1,
  limit = 10,
  status = 'all',
  search = null,
  sortBy = 'created_at',
  order = 'desc'
} = {}) => {
  const whereClauses = [];
  const params = [];
  let paramIdx = 1;

  if (status && status !== 'all') {
    whereClauses.push(`o.status = $${paramIdx++}`);
    params.push(status);
  }

  if (search) {
    whereClauses.push(
      `(o.order_number ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx})`
    );
    params.push(`%${search}%`);
    paramIdx++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Total matching orders count
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM orders o
    INNER JOIN users u ON u.id = o.user_id
    ${whereSql};
  `;
  const countRes = await query(countSql, params);
  const totalItems = countRes.rows[0].total;

  // 2. Paginated data query with single-pass item count aggregation
  const sortColumn = ALLOWED_ORDER_SORT_MAP[sortBy] || 'o.created_at';
  const sortDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT 
      o.id,
      o.order_number AS "orderNumber",
      o.status,
      o.currency,
      o.subtotal::float AS subtotal,
      o.total_amount::float AS "totalAmount",
      o.total_amount::float AS total,
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      COALESCE(SUM(oi.quantity), 0)::int AS "itemCount",
      json_build_object(
        'id', u.id,
        'fullName', u.full_name,
        'email', u.email
      ) AS user
    FROM orders o
    INNER JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ${whereSql}
    GROUP BY o.id, u.id
    ORDER BY ${sortColumn} ${sortDirection}, o.id ASC
    LIMIT $${paramIdx++} OFFSET $${paramIdx};
  `;

  const dataRes = await query(dataSql, dataParams);
  const totalPages = Math.ceil(totalItems / limit) || 1;

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
 * Retrieves full order details by ID for admins, including customer summary and immutable item snapshots.
 */
export const getAdminOrderById = async (orderId) => {
  const sql = `
    SELECT 
      o.id,
      o.order_number AS "orderNumber",
      o.status,
      o.currency,
      o.subtotal::float AS subtotal,
      o.total_amount::float AS "totalAmount",
      o.total_amount::float AS total,
      o.idempotency_key AS "idempotencyKey",
      o.created_at AS "createdAt",
      o.updated_at AS "updatedAt",
      json_build_object(
        'id', u.id,
        'fullName', u.full_name,
        'email', u.email,
        'role', u.role
      ) AS user,
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
    INNER JOIN users u ON u.id = o.user_id
    WHERE o.id = $1;
  `;
  const res = await query(sql, [orderId]);
  return res.rows[0] || null;
};

/**
 * Updates order fulfilment status enforcing strict sequential lifecycle rules and concurrency locking.
 * 
 * Permitted transitions:
 * - pending -> processing
 * - processing -> shipped
 * - shipped -> delivered
 */
export const updateAdminOrderStatus = async (orderId, nextStatus) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Row lock on the order row to serialize concurrent status update attempts
    const orderRes = await client.query(
      'SELECT id, order_number AS "orderNumber", status FROM orders WHERE id = $1 FOR UPDATE;',
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }

    const currentOrder = orderRes.rows[0];
    const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentOrder.status] || [];

    if (!allowedNext.includes(nextStatus)) {
      const err = new Error(
        `Cannot transition order from "${currentOrder.status}" to "${nextStatus}". ` +
        (allowedNext.length > 0
          ? `Allowed next transition is: ${allowedNext.join(', ')}.`
          : `Order is in a terminal status ("${currentOrder.status}") and cannot be transitioned further.`)
      );
      err.statusCode = 400;
      throw err;
    }

    const updateRes = await client.query(
      `UPDATE orders 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, order_number AS "orderNumber", status, updated_at AS "updatedAt";`,
      [nextStatus, orderId]
    );

    await client.query('COMMIT');
    return updateRes.rows[0];
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // ignore
    }
    throw err;
  } finally {
    client.release();
  }
};

export default {
  getAdminMetrics,
  getAdminProducts,
  updateProductStock,
  toggleProductStatus,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus
};