import { query } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_SORT_MAP = {
  price: 'p.price',
  name: 'p.name',
  created_at: 'p.created_at'
};

/**
 * Retrieves paginated, filtered, and sorted products
 */
export const getProducts = async ({
  page = 1,
  limit = 12,
  category = null,
  search = null,
  sortBy = 'created_at',
  order = 'desc',
  includeInactive = false
} = {}) => {
  const whereClauses = [];
  const params = [];
  let paramIdx = 1;

  // Active status filter
  if (!includeInactive) {
    whereClauses.push('p.is_active = true');
  }

  // Category filter (accepts either slug or UUID)
  if (category) {
    if (UUID_REGEX.test(category)) {
      whereClauses.push(`p.category_id = $${paramIdx++}`);
      params.push(category);
    } else {
      whereClauses.push(`c.slug = $${paramIdx++}`);
      params.push(category.toLowerCase());
    }
  }

  // Search filter (searches product name and description)
  if (search) {
    whereClauses.push(`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 1. Count total matching rows
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    ${whereSql};
  `;
  const countRes = await query(countSql, params);
  const totalItems = countRes.rows[0].total;

  // 2. Fetch paginated data
  const sortColumn = ALLOWED_SORT_MAP[sortBy] || 'p.created_at';
  const sortDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT 
      p.id,
      p.category_id AS "categoryId",
      c.name AS "categoryName",
      c.slug AS "categorySlug",
      p.name,
      p.slug,
      p.description,
      p.price::float AS price,
      p.stock_quantity AS "stockQuantity",
      p.image_url AS "imageUrl",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt"
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    ${whereSql}
    ORDER BY ${sortColumn} ${sortDirection}, p.id ASC
    LIMIT $${paramIdx++} OFFSET $${paramIdx};
  `;

  const dataRes = await query(dataSql, dataParams);
  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    products: dataRes.rows,
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
 * Retrieves a single product by UUID
 */
export const getProductById = async (id, includeInactive = false) => {
  if (!id || !UUID_REGEX.test(id)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  const activeCondition = includeInactive ? '' : 'AND p.is_active = true';

  const sql = `
    SELECT 
      p.id,
      p.category_id AS "categoryId",
      c.name AS "categoryName",
      c.slug AS "categorySlug",
      p.name,
      p.slug,
      p.description,
      p.price::float AS price,
      p.stock_quantity AS "stockQuantity",
      p.image_url AS "imageUrl",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt"
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE p.id = $1 ${activeCondition}
    LIMIT 1;
  `;
  const res = await query(sql, [id]);
  const product = res.rows[0];

  if (!product) {
    const error = new Error('Product not found or currently unavailable');
    error.statusCode = 404;
    throw error;
  }

  return product;
};

/**
 * Retrieves a single product by unique slug
 */
export const getProductBySlug = async (slug, includeInactive = false) => {
  const activeCondition = includeInactive ? '' : 'AND p.is_active = true';

  const sql = `
    SELECT 
      p.id,
      p.category_id AS "categoryId",
      c.name AS "categoryName",
      c.slug AS "categorySlug",
      p.name,
      p.slug,
      p.description,
      p.price::float AS price,
      p.stock_quantity AS "stockQuantity",
      p.image_url AS "imageUrl",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt"
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE p.slug = $1 ${activeCondition}
    LIMIT 1;
  `;
  const res = await query(sql, [slug.trim().toLowerCase()]);
  const product = res.rows[0];

  if (!product) {
    const error = new Error(`Product with slug "${slug}" not found`);
    error.statusCode = 404;
    throw error;
  }

  return product;
};

/**
 * Creates a new product
 */
export const createProduct = async ({
  name,
  slug,
  categoryId,
  description,
  price,
  stockQuantity,
  imageUrl,
  isActive = true
}) => {
  // 1. Verify category exists
  const catCheck = await query('SELECT id FROM categories WHERE id = $1', [categoryId]);
  if (catCheck.rows.length === 0) {
    const error = new Error('Selected category does not exist');
    error.statusCode = 404;
    throw error;
  }

  try {
    const sql = `
      INSERT INTO products (
        name, slug, category_id, description, price, stock_quantity, image_url, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, category_id AS "categoryId", name, slug, description, price::float AS price,
        stock_quantity AS "stockQuantity", image_url AS "imageUrl", is_active AS "isActive",
        created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    const res = await query(sql, [
      name,
      slug,
      categoryId,
      description,
      price,
      stockQuantity,
      imageUrl,
      isActive
    ]);
    return res.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('A product with this slug already exists');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Updates an existing product
 */
export const updateProduct = async (id, updateData) => {
  if (!id || !UUID_REGEX.test(id)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  // Ensure product exists
  await getProductById(id, true);

  if (updateData.categoryId) {
    const catCheck = await query('SELECT id FROM categories WHERE id = $1', [updateData.categoryId]);
    if (catCheck.rows.length === 0) {
      const error = new Error('Selected category does not exist');
      error.statusCode = 404;
      throw error;
    }
  }

  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updateData.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updateData.name.trim());
  }

  if (updateData.slug !== undefined) {
    fields.push(`slug = $${paramIndex++}`);
    values.push(updateData.slug.trim().toLowerCase());
  }

  if (updateData.categoryId !== undefined) {
    fields.push(`category_id = $${paramIndex++}`);
    values.push(updateData.categoryId);
  }

  if (updateData.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updateData.description.trim());
  }

  if (updateData.price !== undefined) {
    fields.push(`price = $${paramIndex++}`);
    values.push(parseFloat(updateData.price));
  }

  if (updateData.stockQuantity !== undefined) {
    fields.push(`stock_quantity = $${paramIndex++}`);
    values.push(parseInt(updateData.stockQuantity, 10));
  }

  if (updateData.imageUrl !== undefined) {
    fields.push(`image_url = $${paramIndex++}`);
    values.push(updateData.imageUrl ? updateData.imageUrl.trim() : null);
  }

  if (updateData.isActive !== undefined) {
    fields.push(`is_active = $${paramIndex++}`);
    values.push(Boolean(updateData.isActive));
  }

  if (fields.length === 0) {
    const error = new Error('No valid fields provided for update');
    error.statusCode = 400;
    throw error;
  }

  values.push(id);
  const sql = `
    UPDATE products
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id, category_id AS "categoryId", name, slug, description, price::float AS price,
      stock_quantity AS "stockQuantity", image_url AS "imageUrl", is_active AS "isActive",
      created_at AS "createdAt", updated_at AS "updatedAt";
  `;

  try {
    const res = await query(sql, values);
    return res.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('A product with this slug already exists');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Safely deactivates a product (Soft Delete to preserve order history)
 */
export const deleteProduct = async (id) => {
  if (!id || !UUID_REGEX.test(id)) {
    const error = new Error('Invalid product ID format');
    error.statusCode = 400;
    throw error;
  }

  const sql = `
    UPDATE products
    SET is_active = false
    WHERE id = $1
    RETURNING id, name, is_active AS "isActive";
  `;
  const res = await query(sql, [id]);

  if (res.rows.length === 0) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    success: true,
    message: `Product "${res.rows[0].name}" has been deactivated successfully`
  };
};

export default {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct
};