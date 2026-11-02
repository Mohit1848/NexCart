/**
 * Cart Input Validators
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateAddToCart = ({ productId, quantity = 1 }) => {
  const errors = [];

  if (!productId || typeof productId !== 'string' || !UUID_REGEX.test(productId)) {
    errors.push('A valid productId (UUID) is required');
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty < 1 || parsedQty > 99) {
    errors.push('Quantity must be an integer between 1 and 99');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      productId,
      quantity: parsedQty || 1
    }
  };
};

export const validateUpdateCartItem = ({ quantity }) => {
  const errors = [];

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty < 1 || parsedQty > 99) {
    errors.push('Quantity must be an integer between 1 and 99');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: {
      quantity: parsedQty
    }
  };
};