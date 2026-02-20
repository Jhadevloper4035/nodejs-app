const { body, param, query, validationResult } = require('express-validator');

/**
 * PRODUCT VALIDATOR
 * With description field validation
 */

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

/**
 * Create product validation
 */
const validateCreate = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title: 3-200 characters'),
  
  // ========== DESCRIPTION VALIDATION ==========
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Description: 10-2000 characters'),
  
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be positive'),
  
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be non-negative'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isString().withMessage('Category must be a string'),
  
  body('subcategory')
    .optional()
    .isArray().withMessage('Subcategory must be an array'),
  
  body('images')
    .notEmpty().withMessage('At least one image is required')
    .isArray({ min: 1 }).withMessage('Images must be array with at least 1 item'),
  
  body('images.*')
    .isString().withMessage('Each image must be a string'),
  
  validate
];

/**
 * Update product validation
 */
const validateUpdate = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Title: 3-200 characters'),
  
  // ========== DESCRIPTION VALIDATION ==========
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 }).withMessage('Description: 10-2000 characters'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be positive'),
  
  body('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be non-negative'),
  
  validate
];

/**
 * ID validation
 */
const validateId = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  validate
];

/**
 * Slug validation
 */
const validateSlug = [
  param('slug')
    .trim()
    .notEmpty().withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Invalid slug format'),
  validate
];

/**
 * List validation
 */
const validateList = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit: 1-100'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Min price must be positive'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Max price must be positive'),
  
  validate
];

/**
 * Bulk seed validation
 */
const validateBulkSeed = [
  body('products')
    .isArray({ min: 1 }).withMessage('Products array required with at least 1 item'),
  
  body('products.*.title')
    .notEmpty().withMessage('Each product must have title'),
  
  // ========== DESCRIPTION VALIDATION ==========
  body('products.*.description')
    .notEmpty().withMessage('Each product must have description'),
  
  body('products.*.price')
    .notEmpty().withMessage('Each product must have price')
    .isFloat({ min: 0 }).withMessage('Price must be positive'),
  
  body('products.*.category')
    .notEmpty().withMessage('Each product must have category'),
  
  body('products.*.images')
    .isArray({ min: 1 }).withMessage('Each product must have at least 1 image'),
  
  validate
];

module.exports = {
  validateCreate,
  validateUpdate,
  validateId,
  validateSlug,
  validateList,
  validateBulkSeed
};
