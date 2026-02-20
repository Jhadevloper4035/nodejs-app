
const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const {
  validateCreateCategory,
  validateUpdateCategory,
  validateCategoryId,
  validateSlug,
  validateListCategories,
  validateBulkOperation,
  validateCreateSubcategory,
  validateMoveSubcategory,
  validateBulkMoveSubcategories,
  validateReorderSubcategories,
  validateHierarchyQuery
} = require('../validators/category.validator');

// Uncomment when auth is ready
// const { authenticate, authorize } = require('../middleware/authMiddleware');

/**
 * =====================================================
 * CATEGORY ROUTES
 * =====================================================
 */

// ========== PUBLIC ROUTES ==========

/**
 * @route   GET /api/categories/stats
 * @desc    Get category statistics
 * @access  Public
 */
router.get('/stats', categoryController.getCategoryStats);

/**
 * @route   GET /api/categories/tree
 * @desc    Get full category tree
 * @access  Public
 */
router.get('/tree', categoryController.getCategoryTree);

/**
 * @route   GET /api/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get(
  '/slug/:slug',
  validateSlug,
  categoryController.getCategoryBySlug
);

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category
 * @access  Public
 */
router.get(
  '/:id',
  validateCategoryId,
  categoryController.getCategoryById
);

/**
 * @route   GET /api/categories
 * @desc    List all categories with filters
 * @access  Public
 * @query   page, limit, isActive, parent, search, sortBy, sortOrder
 */
router.get(
  '/',
  validateListCategories,
  categoryController.getCategories
);

// ========== PROTECTED ROUTES ==========

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin)
 */
router.post(
  '/',
  // authenticate,
  // authorize('admin'),
  validateCreateCategory,
  categoryController.createCategory
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  // authenticate,
  // authorize('admin'),
  validateUpdateCategory,
  categoryController.updateCategory
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Soft delete category
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  // authenticate,
  // authorize('admin'),
  validateCategoryId,
  categoryController.deleteCategory
);

/**
 * @route   POST /api/categories/:id/restore
 * @desc    Restore deleted category
 * @access  Private (Admin)
 */
router.post(
  '/:id/restore',
  // authenticate,
  // authorize('admin'),
  validateCategoryId,
  categoryController.restoreCategory
);

/**
 * @route   PATCH /api/categories/bulk
 * @desc    Bulk update categories
 * @access  Private (Admin)
 * @body    { ids: [...], ...updateData }
 */
router.patch(
  '/bulk',
  // authenticate,
  // authorize('admin'),
  validateBulkOperation,
  categoryController.bulkUpdateCategories
);

/**
 * @route   POST /api/categories/bulk-delete
 * @desc    Bulk delete categories
 * @access  Private (Admin)
 * @body    { ids: [...] }
 */
router.post(
  '/bulk-delete',
  // authenticate,
  // authorize('admin'),
  validateBulkOperation,
  categoryController.bulkDeleteCategories
);

/**
 * =====================================================
 * SUBCATEGORY ROUTES
 * =====================================================
 */

// ========== PARENT-BASED ROUTES ==========

/**
 * @route   GET /api/categories/:parentId/subcategories/with-counts
 * @desc    Get subcategories with child counts
 * @access  Public
 */
router.get(
  '/:parentId/subcategories/with-counts',
  validateCategoryId,
  categoryController.getSubcategoriesWithCounts
);

/**
 * @route   PUT /api/categories/:parentId/subcategories/reorder
 * @desc    Reorder subcategories
 * @access  Private (Admin)
 * @body    { orderData: [{ id, displayOrder }] }
 */
router.put(
  '/:parentId/subcategories/reorder',
  // authenticate,
  // authorize('admin'),
  validateReorderSubcategories,
  categoryController.reorderSubcategories
);

/**
 * @route   GET /api/categories/:parentId/subcategories
 * @desc    Get all subcategories of parent
 * @access  Public
 */
router.get(
  '/:parentId/subcategories',
  validateCategoryId,
  categoryController.getSubcategories
);

/**
 * @route   POST /api/categories/:parentId/subcategories
 * @desc    Create subcategory under parent
 * @access  Private (Admin)
 */
router.post(
  '/:parentId/subcategories',
  // authenticate,
  // authorize('admin'),
  validateCreateSubcategory,
  categoryController.createSubcategory
);

// ========== HIERARCHY ROUTES ==========

/**
 * @route   GET /api/categories/:categoryId/hierarchy
 * @desc    Get category with nested subcategories
 * @access  Public
 * @query   depth (optional, default: unlimited)
 */
router.get(
  '/:categoryId/hierarchy',
  validateHierarchyQuery,
  categoryController.getCategoryHierarchy
);

/**
 * @route   GET /api/categories/:categoryId/all-subcategories
 * @desc    Get all descendants (flat list)
 * @access  Public
 */
router.get(
  '/:categoryId/all-subcategories',
  validateCategoryId,
  categoryController.getAllSubcategoriesFlat
);

/**
 * @route   GET /api/categories/:categoryId/breadcrumbs
 * @desc    Get breadcrumb path
 * @access  Public
 */
router.get(
  '/:categoryId/breadcrumbs',
  validateCategoryId,
  categoryController.getBreadcrumbs
);

// ========== SUBCATEGORY OPERATIONS ==========

/**
 * @route   PATCH /api/subcategories/:subcategoryId/move
 * @desc    Move subcategory to new parent
 * @access  Private (Admin)
 * @body    { newParentId }
 */
router.patch(
  '/subcategories/:subcategoryId/move',
  // authenticate,
  // authorize('admin'),
  validateMoveSubcategory,
  categoryController.moveSubcategory
);

/**
 * @route   POST /api/subcategories/bulk-move
 * @desc    Bulk move subcategories
 * @access  Private (Admin)
 * @body    { subcategoryIds: [...], newParentId }
 */
router.post(
  '/subcategories/bulk-move',
  // authenticate,
  // authorize('admin'),
  validateBulkMoveSubcategories,
  categoryController.bulkMoveSubcategories
);

module.exports = router;
