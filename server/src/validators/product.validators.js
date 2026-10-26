import { slugify } from './category.validators.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_SORT_COLUMNS = ['price', 'name', 'created_at'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

export const validateProductQuery = (query) => {
  const errors = [];

  let page = parseInt(query.page || '1', 10);
  if (isNaN(page) || page < 1) {
    errors.push('Page must be a positive integer');
    page = 1;
  }

  let limit = parseInt(query.limit || '12', 10);
  if (isNaN(limit) || limit < 1 || limit > 50) {
    errors.push('Limit must be an integer between 1 and 50');
    limit = 12;
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

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      page,
      limit,
      category: query.category ? query.category.trim() : null,
      search: query.search ? query.search.trim() : (query.q ? query.q.trim() : null),
      sortBy,
      order
    }
  };
};

export const validateCreateProduct = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters long');
  } else if (data.name.trim().length > 255) {
    errors.push('Product name cannot exceed 255 characters');
  }

  const finalSlug = data.slug ? data.slug.trim() : slugify(data.name || '');
  if (!finalSlug || !SLUG_REGEX.test(finalSlug)) {
    errors.push('Slug must contain only lowercase alphanumeric characters and hyphens');
  } else if (finalSlug.length > 280) {
    errors.push('Slug cannot exceed 280 characters');
  }

  if (!data.categoryId || !UUID_REGEX.test(data.categoryId)) {
    errors.push('A valid categoryId (UUID) is required');
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }

  const price = parseFloat(data.price);
  if (isNaN(price) || price < 0) {
    errors.push('Price must be a valid non-negative number');
  }

  const stockQuantity = data.stockQuantity !== undefined ? parseInt(data.stockQuantity, 10) : 0;
  if (isNaN(stockQuantity) || stockQuantity < 0) {
    errors.push('Stock quantity must be a non-negative integer');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      name: data.name ? data.name.trim() : '',
      slug: finalSlug,
      categoryId: data.categoryId,
      description: data.description ? data.description.trim() : '',
      price,
      stockQuantity,
      imageUrl: data.imageUrl ? data.imageUrl.trim() : null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
    }
  };
};

export const validateUpdateProduct = (data) => {
  const errors = [];
  const allowedFields = ['name', 'slug', 'categoryId', 'description', 'price', 'stockQuantity', 'imageUrl', 'isActive'];
  const submittedFields = Object.keys(data);

  const forbiddenFields = submittedFields.filter((f) => !allowedFields.includes(f));
  if (forbiddenFields.length > 0) {
    errors.push(`Fields cannot be modified: ${forbiddenFields.join(', ')}`);
  }

  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length < 2)) {
    errors.push('Product name must be at least 2 characters long');
  }

  if (data.slug !== undefined && !SLUG_REGEX.test(data.slug.trim())) {
    errors.push('Slug must contain only lowercase alphanumeric characters and hyphens');
  }

  if (data.categoryId !== undefined && !UUID_REGEX.test(data.categoryId)) {
    errors.push('A valid categoryId (UUID) is required');
  }

  if (data.price !== undefined) {
    const price = parseFloat(data.price);
    if (isNaN(price) || price < 0) {
      errors.push('Price must be a valid non-negative number');
    }
  }

  if (data.stockQuantity !== undefined) {
    const stock = parseInt(data.stockQuantity, 10);
    if (isNaN(stock) || stock < 0) {
      errors.push('Stock quantity must be a non-negative integer');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};