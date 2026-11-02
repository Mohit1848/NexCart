import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart
} from '../services/cart.service.js';
import {
  validateAddToCart,
  validateUpdateCartItem
} from '../validators/cart.validators.js';

export const fetchUserCart = async (req, res, next) => {
  try {
    const cart = await getCart(req.user.id);
    res.status(200).json({
      success: true,
      data: { cart }
    });
  } catch (err) {
    next(err);
  }
};

export const addItemToCart = async (req, res, next) => {
  try {
    const validation = validateAddToCart(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validation.errors,
          statusCode: 400
        }
      });
    }

    const cart = await addToCart(req.user.id, validation.data);
    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: { cart }
    });
  } catch (err) {
    next(err);
  }
};

export const updateItemQuantity = async (req, res, next) => {
  try {
    const validation = validateUpdateCartItem(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: validation.errors,
          statusCode: 400
        }
      });
    }

    const cart = await updateCartItemQuantity(
      req.user.id,
      req.params.productId,
      validation.data.quantity
    );

    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: { cart }
    });
  } catch (err) {
    next(err);
  }
};

export const removeItem = async (req, res, next) => {
  try {
    const cart = await removeFromCart(req.user.id, req.params.productId);
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: { cart }
    });
  } catch (err) {
    next(err);
  }
};

export const emptyCart = async (req, res, next) => {
  try {
    const cart = await clearCart(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: { cart }
    });
  } catch (err) {
    next(err);
  }
};

export default {
  fetchUserCart,
  addItemToCart,
  updateItemQuantity,
  removeItem,
  emptyCart
};