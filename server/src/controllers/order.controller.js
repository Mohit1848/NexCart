import { getUserOrders, getOrderById, processCheckout } from '../services/order.service.js';
import { validateOrderQuery, validateCheckoutRequest } from '../validators/order.validators.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const fetchUserOrders = async (req, res, next) => {
  try {
    const validation = validateOrderQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          details: validation.errors,
          statusCode: 400
        }
      });
    }

    const result = await getUserOrders(req.user.id, validation.data);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const fetchOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid order ID format',
          statusCode: 400
        }
      });
    }

    const order = await getOrderById(id, req.user.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Order not found',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (err) {
    next(err);
  }
};

export const checkout = async (req, res, next) => {
  try {
    const validation = validateCheckoutRequest(req.headers, req.body);
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

    const { order, isIdempotentReplay } = await processCheckout(
      req.user.id,
      validation.data
    );

    res.status(isIdempotentReplay ? 200 : 201).json({
      success: true,
      message: isIdempotentReplay
        ? 'Order already placed (idempotent replay)'
        : 'Order placed successfully',
      data: { order }
    });
  } catch (err) {
    next(err);
  }
};
