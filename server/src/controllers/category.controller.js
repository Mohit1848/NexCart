import {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} from '../services/category.service.js';
import {
  validateCreateCategory,
  validateUpdateCategory
} from '../validators/category.validators.js';

export const getAll = async (req, res, next) => {
  try {
    const categories = await getAllCategories();
    res.status(200).json({
      success: true,
      data: { categories }
    });
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const category = await getCategoryById(req.params.id);
    res.status(200).json({
      success: true,
      data: { category }
    });
  } catch (err) {
    next(err);
  }
};

export const getBySlug = async (req, res, next) => {
  try {
    const category = await getCategoryBySlug(req.params.slug);
    res.status(200).json({
      success: true,
      data: { category }
    });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const validation = validateCreateCategory(req.body);
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

    const category = await createCategory(validation.data);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const validation = validateUpdateCategory(req.body);
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

    const category = await updateCategory(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await deleteCategory(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getAll,
  getById,
  getBySlug,
  create,
  update,
  remove
};