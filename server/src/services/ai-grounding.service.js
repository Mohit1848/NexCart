import { query } from '../config/db.js';

/**
 * Retrieves all active catalog products from PostgreSQL with category details.
 *
 * @returns {Promise<Array<Object>>} List of active products
 */
export const getAllActiveCatalogProducts = async () => {
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
      p.is_active AS "isActive"
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true
    ORDER BY p.name ASC;
  `;

  const result = await query(sql);
  return result.rows;
};

/**
 * Searches and filters active catalog products by keywords, price bounds, or category.
 *
 * @param {Object} options
 * @param {string} [options.search]
 * @param {number} [options.maxPrice]
 * @param {number} [options.minPrice]
 * @param {string} [options.category]
 * @param {number} [options.limit=12]
 * @returns {Promise<Array<Object>>}
 */
export const searchCatalogProducts = async ({
  search = null,
  maxPrice = null,
  minPrice = null,
  category = null,
  limit = 12
} = {}) => {
  const whereClauses = ['p.is_active = true'];
  const params = [];
  let paramIdx = 1;

  if (search && typeof search === 'string' && search.trim()) {
    whereClauses.push(`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`);
    params.push(`%${search.trim()}%`);
    paramIdx++;
  }

  if (typeof maxPrice === 'number' && !isNaN(maxPrice) && maxPrice > 0) {
    whereClauses.push(`p.price <= $${paramIdx++}`);
    params.push(maxPrice);
  }

  if (typeof minPrice === 'number' && !isNaN(minPrice) && minPrice >= 0) {
    whereClauses.push(`p.price >= $${paramIdx++}`);
    params.push(minPrice);
  }

  if (category && typeof category === 'string' && category.trim()) {
    whereClauses.push(`c.slug = $${paramIdx++}`);
    params.push(category.trim().toLowerCase());
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
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
      p.is_active AS "isActive"
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    ${whereSql}
    ORDER BY p.price ASC, p.name ASC
    LIMIT $${paramIdx};
  `;

  params.push(limit);
  const result = await query(sql, params);
  return result.rows;
};

/**
 * Builds a structured, grounded catalog representation for the AI prompt.
 * Ensures the assistant has live prices, stock levels, and authentic slugs.
 *
 * @param {Array<Object>} products Active products array
 * @returns {string} Formatted catalog text for system prompt
 */
export const formatCatalogForPrompt = (products) => {
  return products.map((p, idx) => {
    return `${idx + 1}. [${p.name}]
- Slug: ${p.slug}
- Category: ${p.categoryName}
- Price: ₹${p.price.toLocaleString('en-IN')}
- Stock Quantity: ${p.stockQuantity} (${p.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'})
- Description: ${p.description || 'No description provided.'}`;
  }).join('\n\n');
};

/**
 * Given a list of product slugs returned by the AI, fetches and verifies
 * authentic product records from PostgreSQL. Filters out non-existent slugs.
 *
 * @param {Array<string>} slugs
 * @returns {Promise<Array<Object>>} Genuine hydrated product objects
 */
export const hydrateProductsBySlugs = async (slugs) => {
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return [];
  }

  // Deduplicate and normalize slugs
  const cleanSlugs = [...new Set(slugs.map(s => String(s).trim().toLowerCase()))].filter(Boolean);
  if (cleanSlugs.length === 0) return [];

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
      p.is_active AS "isActive"
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = true AND p.slug = ANY($1)
    ORDER BY p.name ASC;
  `;

  const result = await query(sql, [cleanSlugs]);
  return result.rows;
};

/**
 * Offline/Fallback recommendation engine when OpenAI API key is unavailable.
 * Inspects user query for price limits, stock inquiries, and keywords to query PostgreSQL.
 *
 * @param {string} userMessage
 * @returns {Promise<{ reply: string, products: Array<Object> }>}
 */
export const getOfflineCatalogResponse = async (userMessage) => {
  const text = (userMessage || '').toLowerCase();
  let maxPrice = null;

  // Extract price constraints e.g., "under 3000", "under ₹5,000", "below 10000", "< 5000"
  const priceMatch = text.match(/(?:under|below|less than|<|budget of)\s*(?:rs\.?|inr|₹)?\s*([\d,]+)/i);
  if (priceMatch && priceMatch[1]) {
    const parsed = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) {
      maxPrice = parsed;
    }
  }

  // Keyword extraction for search
  const knownKeywords = [
    { term: 'headphone', query: 'headphones' },
    { term: 'bud', query: 'bud' },
    { term: 'earphone', query: 'bud' },
    { term: 'audio', query: 'audio' },
    { term: 'watch', query: 'smartwatch' },
    { term: 'fitness', query: 'fitness' },
    { term: 'monitor', query: 'monitor' },
    { term: 'pc', query: 'pc' },
    { term: 'keyboard', query: 'keyboard' },
    { term: 'charger', query: 'charging' },
    { term: 'station', query: 'charging' }
  ];

  let matchedSearch = null;
  for (const kw of knownKeywords) {
    if (text.includes(kw.term)) {
      matchedSearch = kw.query;
      break;
    }
  }

  let products = [];
  if (matchedSearch || maxPrice) {
    products = await searchCatalogProducts({
      search: matchedSearch,
      maxPrice,
      limit: 6
    });
  }

  // If still empty, return top active products
  if (products.length === 0) {
    products = (await getAllActiveCatalogProducts()).slice(0, 4);
  }

  let reply = 'Here are relevant products from our live catalog:';
  if (maxPrice) {
    reply = `Here are items from our catalog priced under ₹${maxPrice.toLocaleString('en-IN')}:`;
  } else if (matchedSearch) {
    reply = `Here are matching items from our live catalog:`;
  }

  return {
    reply,
    products
  };
};

export default {
  getAllActiveCatalogProducts,
  searchCatalogProducts,
  formatCatalogForPrompt,
  hydrateProductsBySlugs,
  getOfflineCatalogResponse
};

