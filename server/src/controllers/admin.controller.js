import {
  getAdminMetrics,
  getAdminProducts,
  updateProductStock,
  toggleProductStatus,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus
} from '../services/admin.service.js';
import {
  validateAdminProductQuery,
  validateUpdateStock,
  validateUUIDParam,
  validateAdminOrderQuery,
  validateOrderUUIDParam,
  validateUpdateOrderStatus
} from '../validators/admin.validators.js';

export const fetchMetrics = async (req, res, next) => {
  try {
    const metrics = await getAdminMetrics();
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (err) {
    next(err);
  }
};

export const fetchProducts = async (req, res, next) => {
  try {
    const validation = validateAdminProductQuery(req.query);
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

    const result = await getAdminProducts(validation.data);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const updateStock = async (req, res, next) => {
  try {
    const idValidation = validateUUIDParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: idValidation.error,
          statusCode: 400
        }
      });
    }

    const bodyValidation = validateUpdateStock(req.body);
    if (!bodyValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: bodyValidation.errors,
          statusCode: 400
        }
      });
    }

    const product = await updateProductStock(
      req.params.id,
      bodyValidation.data.stockQuantity
    );

    res.status(200).json({
      success: true,
      message: `Stock for "${product.name}" updated to ${product.stockQuantity}`,
      data: { product }
    });
  } catch (err) {
    next(err);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const idValidation = validateUUIDParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: idValidation.error,
          statusCode: 400
        }
      });
    }

    const product = await toggleProductStatus(req.params.id);

    res.status(200).json({
      success: true,
      message: `Product "${product.name}" is now ${product.isActive ? 'active' : 'inactive'}`,
      data: { product }
    });
  } catch (err) {
    next(err);
  }
};

export const fetchOrders = async (req, res, next) => {
  try {
    const validation = validateAdminOrderQuery(req.query);
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

    const result = await getAdminOrders(validation.data);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const fetchOrderDetail = async (req, res, next) => {
  try {
    const idValidation = validateOrderUUIDParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: idValidation.error,
          statusCode: 400
        }
      });
    }

    const order = await getAdminOrderById(req.params.id);
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

export const updateOrderStatus = async (req, res, next) => {
  try {
    const idValidation = validateOrderUUIDParam(req.params.id);
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: idValidation.error,
          statusCode: 400
        }
      });
    }

    const bodyValidation = validateUpdateOrderStatus(req.body);
    if (!bodyValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: bodyValidation.errors,
          statusCode: 400
        }
      });
    }

    const updatedOrder = await updateAdminOrderStatus(
      req.params.id,
      bodyValidation.data.status
    );

    res.status(200).json({
      success: true,
      message: `Order #${updatedOrder.orderNumber} status updated to ${updatedOrder.status}`,
      data: { order: updatedOrder }
    });
  } catch (err) {
    next(err);
  }
};

export default {
  fetchMetrics,
  fetchProducts,
  updateStock,
  toggleStatus,
  fetchOrders,
  fetchOrderDetail,
  updateOrderStatus
};