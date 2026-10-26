import {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct
} from '../services/product.service.js';
import {
  validateProductQuery,
  validateCreateProduct,
  validateUpdateProduct
} from '../validators/product.validators.js';

export const listProducts = async (req, res, next) => {
  try {
    const validation = validateProductQuery(req.query);
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

    const result = await getProducts(validation.data);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    res.status(200).json({
      success: true,
      data: { product }
    });
  } catch (err) {
    next(err);
  }
};

export const getBySlug = async (req, res, next) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    res.status(200).json({
      success: true,
      data: { product }
    });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const validation = validateCreateProduct(req.body);
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

    const product = await createProduct(validation.data);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const validation = validateUpdateProduct(req.body);
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

    const product = await updateProduct(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await deleteProduct(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

export default {
  listProducts,
  getById,
  getBySlug,
  create,
  update,
  remove
};