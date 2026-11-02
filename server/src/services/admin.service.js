import { query } from '../config/db.js';
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

export default {
  getAdminMetrics,
  getAdminProducts,
  updateProductStock,
  toggleProductStatus
};