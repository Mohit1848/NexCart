/**
 * Order Query and Input Validators
 */

export const validateOrderQuery = (query = {}) => {
  const errors = [];

  let page = parseInt(query.page || '1', 10);
  if (isNaN(page) || page < 1) {
    errors.push('Page must be a positive integer');
    page = 1;
  }

  let limit = parseInt(query.limit || '10', 10);
  if (isNaN(limit) || limit < 1 || limit > 50) {
    errors.push('Limit must be an integer between 1 and 50');
    limit = 10;
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      page,
      limit
    }
  };
};

/**
 * Validates checkout request headers and body for optional idempotency key
 */
export const validateCheckoutRequest = (headers = {}, body = {}) => {
  const errors = [];
  let rawKey = undefined;

  if (headers['idempotency-key'] !== undefined) {
    rawKey = headers['idempotency-key'];
  } else if (headers['x-idempotency-key'] !== undefined) {
    rawKey = headers['x-idempotency-key'];
  } else if (body && typeof body === 'object' && body.idempotencyKey !== undefined) {
    rawKey = body.idempotencyKey;
  }

  let idempotencyKey = null;
  if (rawKey !== undefined && rawKey !== null) {
    if (typeof rawKey !== 'string' || rawKey.trim().length === 0) {
      errors.push('Idempotency-Key must be a non-empty string');
    } else if (rawKey.trim().length > 255) {
      errors.push('Idempotency-Key cannot exceed 255 characters');
    } else {
      idempotencyKey = rawKey.trim();
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      idempotencyKey
    }
  };
};
