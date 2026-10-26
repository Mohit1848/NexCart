import { query } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns all categories with active product count
 */
export const getAllCategories = async () => {
  const sql = `
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.image_url AS "imageUrl",
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      COUNT(p.id)::int AS "productCount"
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
    GROUP BY c.id
    ORDER BY c.name ASC;
  `;
  const res = await query(sql);
  return res.rows;
};

/**
 * Retrieves a category by UUID
 */
export const getCategoryById = async (id) => {
  if (!id || !UUID_REGEX.test(id)) {
    const error = new Error('Invalid category ID format');
    error.statusCode = 400;
    throw error;
  }

  const sql = `
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.image_url AS "imageUrl",
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      COUNT(p.id)::int AS "productCount"
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
    WHERE c.id = $1
    GROUP BY c.id
    LIMIT 1;
  `;
  const res = await query(sql, [id]);
  const category = res.rows[0];

  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  return category;
};

/**
 * Retrieves a category by unique slug
 */
export const getCategoryBySlug = async (slug) => {
  const sql = `
    SELECT 
      c.id,
      c.name,
      c.slug,
      c.description,
      c.image_url AS "imageUrl",
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      COUNT(p.id)::int AS "productCount"
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
    WHERE c.slug = $1
    GROUP BY c.id
    LIMIT 1;
  `;
  const res = await query(sql, [slug.trim().toLowerCase()]);
  const category = res.rows[0];

  if (!category) {
    const error = new Error(`Category with slug "${slug}" not found`);
    error.statusCode = 404;
    throw error;
  }

  return category;
};

/**
 * Creates a new category
 */
export const createCategory = async ({ name, slug, description, imageUrl }) => {
  try {
    const sql = `
      INSERT INTO categories (name, slug, description, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, slug, description, image_url AS "imageUrl", created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    const res = await query(sql, [name, slug, description, imageUrl]);
    return res.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('A category with this name or slug already exists');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Updates an existing category
 */
export const updateCategory = async (id, updateData) => {
  if (!id || !UUID_REGEX.test(id)) {
    const error = new Error('Invalid category ID format');
    error.statusCode = 400;
    throw error;
  }

  // Ensure category exists
  await getCategoryById(id);

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

  if (updateData.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updateData.description ? updateData.description.trim() : null);
  }

  if (updateData.imageUrl !== undefined) {
    fields.push(`image_url = $${paramIndex++}`);
    values.push(updateData.imageUrl ? updateData.imageUrl.trim() : null);
  }

  if (fields.length === 0) {
    const error = new Error('No valid fields provided for update');
    error.statusCode = 400;
    throw error;
  }

  values.push(id);
  const sql = `
    UPDATE categories
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, slug, description, image_url AS "imageUrl", created_at AS "createdAt", updated_at AS "updatedAt";
  `;

  try {
    const res = await query(sql, values);
    return res.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('A category with this name or slug already exists');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

/**
 * Deletes a category if no products are associated with it
 */
export const deleteCategory = async (id) => {
  if (!id || !UUID_REGEX.test(id)) {
    const error = new Error('Invalid category ID format');
    error.statusCode = 400;
    throw error;
  }

  // Check product dependency
  const countSql = 'SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1';
  const countRes = await query(countSql, [id]);
  const productCount = countRes.rows[0].count;

  if (productCount > 0) {
    const error = new Error(
      `Cannot delete category. There are ${productCount} product(s) linked to this category. Reassign or delete them first.`
    );
    error.statusCode = 409;
    throw error;
  }

  const deleteSql = 'DELETE FROM categories WHERE id = $1 RETURNING id, name';
  const deleteRes = await query(deleteSql, [id]);

  if (deleteRes.rows.length === 0) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  return {
    success: true,
    message: `Category "${deleteRes.rows[0].name}" deleted successfully`
  };
};

export default {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
};