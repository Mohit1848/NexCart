/**
 * Admin Input Validators
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_SORT_COLUMNS = ['created_at', 'price', 'name', 'stock_quantity'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];
const ALLOWED_STOCK_STATUS = ['all', 'in_stock', 'low_stock', 'out_of_stock'];

export const validateAdminProductQuery = (query) => {
  const errors = [];

  let page = parseInt(query.page || '1', 10);
  if (isNaN(page) || page < 1) {
    errors.push('Page must be a positive integer');
    page = 1;
  }

  let limit = parseInt(query.limit || '10', 10);
  if (isNaN(limit) || limit < 1 || limit > 100) {
    errors.push('Limit must be an integer between 1 and 100');
    limit = 10;
  }

  let sortBy = (query.sortBy || 'created_at').toLowerCase();
  if (!ALLOWED_SORT_COLUMNS.includes(sortBy)) {
    errors.push(`sortBy must be one of: ${ALLOWED_SORT_COLUMNS.join(', ')}`);
    sortBy = 'created_at';
  }

  let order = (query.order || 'desc').toLowerCase();
  if (!ALLOWED_SORT_ORDERS.includes(order)) {
    errors.push(`order must be one of: ${ALLOWED_SORT_ORDERS.join(', ')}`);
    order = 'desc';
  }

  let stockStatus = (query.stockStatus || 'all').toLowerCase();
  if (!ALLOWED_STOCK_STATUS.includes(stockStatus)) {
    errors.push(`stockStatus must be one of: ${ALLOWED_STOCK_STATUS.join(', ')}`);
    stockStatus = 'all';
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      page,
      limit,
      category: query.category ? query.category.trim() : null,
      search: query.search ? query.search.trim() : (query.q ? query.q.trim() : null),
      stockStatus,
      sortBy,
      order,
      includeInactive: true // Admin catalog always includes inactive products
    }
  };
};

export const validateUpdateStock = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: ['Request body must be a JSON object'],
      data: null
    };
  }

  const errors = [];

  if (body.stockQuantity === undefined || body.stockQuantity === null || body.stockQuantity === '') {
    errors.push('stockQuantity is required');
  } else {
    const rawVal = body.stockQuantity;
    // Disallow floating point, boolean, string with non-digits
    const num = Number(rawVal);
    if (!Number.isInteger(num) || typeof rawVal === 'boolean') {
      errors.push('stockQuantity must be an integer');
    } else if (num < 0) {
      errors.push('stockQuantity cannot be negative');
    } else if (num > 100000) {
      errors.push('stockQuantity exceeds reasonable upper limit (100,000)');
    }
  }

  // Ensure no unintended fields are modified through this focused endpoint
  const allowedKeys = ['stockQuantity'];
  const extraKeys = Object.keys(body).filter((k) => !allowedKeys.includes(k));
  if (extraKeys.length > 0) {
    errors.push(`This endpoint only updates stock. Unpermitted fields: ${extraKeys.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      stockQuantity: Number(body.stockQuantity)
    }
  };
};

export const validateUUIDParam = (id) => {
  if (!id || typeof id !== 'string' || !UUID_REGEX.test(id)) {
    return {
      isValid: false,
      error: 'Invalid product ID format'
    };
  }
  return {
    isValid: true
  };
};