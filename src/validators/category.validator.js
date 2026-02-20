const { body, param, query, validationResult } = require('express-validator');
const Category = require('../models/category');



// ========== HELPER: ERROR HANDLER ==========
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path || err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }

    next();
};

// ========== CATEGORY VALIDATORS ==========

/**
 * Validate: Create Category
 * POST /api/categories
 */
const validateCreateCategory = [
    body('name')
        .trim()
        .notEmpty().withMessage('Category name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-&]+$/)
        .withMessage('Name can only contain letters, numbers, spaces, hyphens, and &'),

    body('slug')
        .optional()
        .trim()
        .toLowerCase()
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug can only contain lowercase letters, numbers, and hyphens')
        .custom(async (slug) => {
            const isUnique = await Category.isSlugUnique(slug);
            if (!isUnique) throw new Error('Slug already exists');
            return true;  
        }),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),

    body('parent')
        .optional()
        .isMongoId().withMessage('Invalid parent category ID')
        .custom(async (parentId) => {
            if (parentId) {
                const parent = await Category.findOne({ _id: parentId, isDeleted: false });
                if (!parent) throw new Error('Parent category not found');
                if (parent.level >= 3) throw new Error('Maximum nesting level (3) reached');
            }
            return true;
        }),

    body('images')
        .optional()
        .isArray().withMessage('Images must be an array'),

    body('images.*.url')
        .if(body('images').exists())
        .trim()
        .notEmpty().withMessage('Image URL is required')
        .isURL().withMessage('Invalid image URL'),

    body('images.*.alt')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Image alt text cannot exceed 200 characters'),

    body('images.*.isPrimary')
        .optional()
        .isBoolean().withMessage('isPrimary must be a boolean'),

    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean'),

    body('displayOrder')
        .optional()
        .isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
        .toInt(),

    body('seo.title')
        .optional()
        .trim()
        .isLength({ max: 60 })
        .withMessage('SEO title cannot exceed 60 characters'),

    body('seo.description')
        .optional()
        .trim()
        .isLength({ max: 160 })
        .withMessage('SEO description cannot exceed 160 characters'),

    body('seo.keywords')
        .optional()
        .isArray().withMessage('SEO keywords must be an array'),

    body('seo.keywords.*')
        .if(body('seo.keywords').exists())
        .trim()
        .isLength({ max: 50 })
        .withMessage('Each keyword cannot exceed 50 characters'),

    handleValidationErrors
];

/**
 * Validate: Update Category
 * PUT /api/categories/:id
 */
const validateUpdateCategory = [
    param('id')
        .isMongoId().withMessage('Invalid category ID'),

    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-&]+$/)
        .withMessage('Name can only contain letters, numbers, spaces, hyphens, and &'),

    body('slug')
        .optional()
        .trim()
        .toLowerCase()
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug can only contain lowercase letters, numbers, and hyphens')
        .custom(async (slug, { req }) => {
            const isUnique = await Category.isSlugUnique(slug, req.params.id);
            if (!isUnique) throw new Error('Slug already exists');
            return true;
        }),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),

    body('parent')
        .optional()
        .custom(async (parentId, { req }) => {
            if (parentId === null) return true; // Allow removing parent

            if (!parentId.match(/^[0-9a-fA-F]{24}$/)) {
                throw new Error('Invalid parent category ID');
            }

            // Prevent self-reference
            if (parentId === req.params.id) {
                throw new Error('Category cannot be its own parent');
            }

            const parent = await Category.findOne({ _id: parentId, isDeleted: false });
            if (!parent) throw new Error('Parent category not found');

            if (parent.level >= 3) throw new Error('Maximum nesting level (3) reached');

            // Check for circular reference
            const category = await Category.findById(req.params.id);
            if (category) {
                const descendants = await category.getDescendants();
                const descendantIds = descendants.map(d => d._id.toString());
                if (descendantIds.includes(parentId)) {
                    throw new Error('Cannot set descendant as parent (circular reference)');
                }
            }

            return true;
        }),

    body('images')
        .optional()
        .isArray().withMessage('Images must be an array'),

    body('images.*.url')
        .if(body('images').exists())
        .trim()
        .notEmpty().withMessage('Image URL is required')
        .isURL().withMessage('Invalid image URL'),

    body('images.*.alt')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Image alt text cannot exceed 200 characters'),

    body('images.*.isPrimary')
        .optional()
        .isBoolean().withMessage('isPrimary must be a boolean'),

    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be a boolean'),

    body('displayOrder')
        .optional()
        .isInt({ min: 0 }).withMessage('Display order must be a non-negative integer')
        .toInt(),

    body('seo.title')
        .optional()
        .trim()
        .isLength({ max: 60 })
        .withMessage('SEO title cannot exceed 60 characters'),

    body('seo.description')
        .optional()
        .trim()
        .isLength({ max: 160 })
        .withMessage('SEO description cannot exceed 160 characters'),

    body('seo.keywords')
        .optional()
        .isArray().withMessage('SEO keywords must be an array'),

    handleValidationErrors
];

/**
 * Validate: Category ID Parameter
 * Used in GET, DELETE operations
 */
const validateCategoryId = [
    param('id')
        .isMongoId().withMessage('Invalid category ID'),

    handleValidationErrors
];

/**
 * Validate: Slug Parameter
 * GET /api/categories/slug/:slug
 */
const validateSlug = [
    param('slug')
        .trim()
        .notEmpty().withMessage('Slug is required')
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Invalid slug format'),

    handleValidationErrors
];

/**
 * Validate: List Categories with Filters
 * GET /api/categories
 */
const validateListCategories = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),

    query('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be true or false')
        .toBoolean(),

    query('parent')
        .optional()
        .custom((value) => {
            if (value === 'null' || value === 'none') return true;
            if (!value.match(/^[0-9a-fA-F]{24}$/)) {
                throw new Error('Invalid parent category ID');
            }
            return true;
        }),

    query('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters'),

    query('sortBy')
        .optional()
        .isIn(['name', 'createdAt', 'displayOrder', 'productCount'])
        .withMessage('Invalid sort field'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),

    handleValidationErrors
];

// ========== SUBCATEGORY VALIDATORS ==========

/**
 * Validate: Create Subcategory
 * POST /api/categories/:parentId/subcategories
 */
const validateCreateSubcategory = [
    param('parentId')
        .isMongoId().withMessage('Invalid parent category ID')
        .custom(async (parentId) => {
            const parent = await Category.findOne({ _id: parentId, isDeleted: false });
            if (!parent) throw new Error('Parent category not found');
            if (parent.level >= 3) throw new Error('Maximum nesting level (3) reached');
            return true;
        }),

    ...validateCreateCategory.slice(0, -1), // Reuse create validation without error handler

    handleValidationErrors
];

/**
 * Validate: Move Subcategory
 * PATCH /api/subcategories/:subcategoryId/move
 */
const validateMoveSubcategory = [
    param('subcategoryId')
        .isMongoId().withMessage('Invalid subcategory ID'),

    body('newParentId')
        .notEmpty().withMessage('New parent ID is required')
        .isMongoId().withMessage('Invalid parent category ID')
        .custom(async (newParentId, { req }) => {
            // Prevent self-reference
            if (newParentId === req.params.subcategoryId) {
                throw new Error('Category cannot be its own parent');
            }

            // Check parent exists
            const newParent = await Category.findOne({ _id: newParentId, isDeleted: false });
            if (!newParent) throw new Error('New parent category not found');

            if (newParent.level >= 3) throw new Error('Maximum nesting level (3) reached');

            // Check circular reference
            const subcategory = await Category.findById(req.params.subcategoryId);
            if (subcategory) {
                const descendants = await subcategory.getDescendants();
                const descendantIds = descendants.map(d => d._id.toString());
                if (descendantIds.includes(newParentId)) {
                    throw new Error('Cannot move to descendant (circular reference)');
                }
            }

            return true;
        }),

    handleValidationErrors
];

/**
 * Validate: Bulk Move Subcategories
 * POST /api/subcategories/bulk-move
 */
const validateBulkMoveSubcategories = [
    body('subcategoryIds')
        .isArray({ min: 1 }).withMessage('subcategoryIds must be a non-empty array')
        .custom((ids) => {
            if (!ids.every(id => id.match(/^[0-9a-fA-F]{24}$/))) {
                throw new Error('All IDs must be valid MongoDB ObjectIds');
            }
            return true;
        }),

    body('newParentId')
        .notEmpty().withMessage('New parent ID is required')
        .isMongoId().withMessage('Invalid parent category ID')
        .custom(async (newParentId, { req }) => {
            // Check if any subcategory is being moved to itself
            if (req.body.subcategoryIds.includes(newParentId)) {
                throw new Error('Cannot move category to itself');
            }

            const newParent = await Category.findOne({ _id: newParentId, isDeleted: false });
            if (!newParent) throw new Error('New parent category not found');

            if (newParent.level >= 3) throw new Error('Maximum nesting level (3) reached');

            return true;
        }),

    handleValidationErrors
];

/**
 * Validate: Reorder Subcategories
 * PUT /api/categories/:parentId/subcategories/reorder
 */
const validateReorderSubcategories = [
    param('parentId')
        .isMongoId().withMessage('Invalid parent category ID')
        .custom(async (parentId) => {
            const parent = await Category.findOne({ _id: parentId, isDeleted: false });
            if (!parent) throw new Error('Parent category not found');
            return true;
        }),

    body('orderData')
        .isArray({ min: 1 }).withMessage('orderData must be a non-empty array'),

    body('orderData.*.id')
        .isMongoId().withMessage('Each item must have a valid id'),

    body('orderData.*.displayOrder')
        .isInt({ min: 0 }).withMessage('displayOrder must be a non-negative integer')
        .toInt(),

    handleValidationErrors
];

/**
 * Validate: Bulk Operations
 * Used for bulk update/delete
 */
const validateBulkOperation = [
    body('ids')
        .isArray({ min: 1 }).withMessage('IDs must be a non-empty array')
        .custom((ids) => {
            if (!ids.every(id => id.match(/^[0-9a-fA-F]{24}$/))) {
                throw new Error('All IDs must be valid MongoDB ObjectIds');
            }
            return true;
        }),

    handleValidationErrors
];

/**
 * Validate: Hierarchy Depth Query
 * GET /api/categories/:categoryId/hierarchy
 */
const validateHierarchyQuery = [
    param('categoryId')
        .isMongoId().withMessage('Invalid category ID'),

    query('depth')
        .optional()
        .isInt({ min: 1, max: 10 }).withMessage('Depth must be between 1 and 10')
        .toInt(),

    handleValidationErrors
];

module.exports = {
    // Category validators
    validateCreateCategory,
    validateUpdateCategory,
    validateCategoryId,
    validateSlug,
    validateListCategories,
    validateBulkOperation,

    // Subcategory validators
    validateCreateSubcategory,
    validateMoveSubcategory,
    validateBulkMoveSubcategories,
    validateReorderSubcategories,
    validateHierarchyQuery,

    // Error handler (can be used standalone)
    handleValidationErrors
};
