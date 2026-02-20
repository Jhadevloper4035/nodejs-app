const categoryService = require('../services/category');

/**
 * UNIFIED CATEGORY & SUBCATEGORY CONTROLLER
 * Simple try-catch - no asyncHandler
 */

// ========== HELPER FUNCTIONS ==========

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, message, statusCode = 400) => {
  res.status(statusCode).json({
    success: false,
    message
  });
};

// ========== CATEGORY CONTROLLERS ==========

/**
 * Create category
 * POST /api/categories
 */
const createCategory = async (req, res) => {
  try {
    const category = await categoryService.createCategory(req.body);
    sendSuccess(res, category, 'Category created successfully', 201);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get all categories
 * GET /api/categories
 */
const getCategories = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      isActive: req.query.isActive,
      parent: req.query.parent,
      search: req.query.search,
      sortBy: req.query.sortBy || 'displayOrder',
      sortOrder: req.query.sortOrder || 'asc'
    };
    
    const result = await categoryService.listCategories(options);
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get category by ID
 * GET /api/categories/:id
 */
const getCategoryById = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    
    sendSuccess(res, category);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get category by slug
 * GET /api/categories/slug/:slug
 */
const getCategoryBySlug = async (req, res) => {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }
    
    sendSuccess(res, category);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Update category
 * PUT /api/categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    const category = await categoryService.updateCategory(
      req.params.id, 
      req.body
    );
    
    sendSuccess(res, category, 'Category updated successfully');
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Delete category (soft)
 * DELETE /api/categories/:id
 */
const deleteCategory = async (req, res) => {
  try {
    const category = await categoryService.deleteCategory(req.params.id);
    sendSuccess(res, category, 'Category deleted successfully');
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Restore category
 * POST /api/categories/:id/restore
 */
const restoreCategory = async (req, res) => {
  try {
    const category = await categoryService.restoreCategory(req.params.id);
    sendSuccess(res, category, 'Category restored successfully');
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get category tree
 * GET /api/categories/tree
 */
const getCategoryTree = async (req, res) => {
  try {
    const tree = await categoryService.getCategoryTree();
    sendSuccess(res, tree);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get statistics
 * GET /api/categories/stats
 */
const getCategoryStats = async (req, res) => {
  try {
    const stats = await categoryService.getCategoryStats();
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Bulk update categories
 * PATCH /api/categories/bulk
 */
const bulkUpdateCategories = async (req, res) => {
  try {
    const { ids, ...updateData } = req.body;
    
    const result = await categoryService.bulkUpdateCategories(ids, updateData);
    sendSuccess(res, result, `${result.modifiedCount} categories updated`);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Bulk delete categories
 * POST /api/categories/bulk-delete
 */
const bulkDeleteCategories = async (req, res) => {
  try {
    const { ids } = req.body;
    
    const result = await categoryService.bulkDeleteCategories(ids);
    sendSuccess(res, result, `${result.modifiedCount} categories deleted`);
  } catch (error) {
    sendError(res, error.message);
  }
};

// ========== SUBCATEGORY CONTROLLERS ==========

/**
 * Create subcategory
 * POST /api/categories/:parentId/subcategories
 */
const createSubcategory = async (req, res) => {
  try {
    const subcategoryData = {
      ...req.body,
      parent: req.params.parentId
    };
    
    const subcategory = await categoryService.createCategory(subcategoryData);
    sendSuccess(res, subcategory, 'Subcategory created successfully', 201);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get subcategories
 * GET /api/categories/:parentId/subcategories
 */
const getSubcategories = async (req, res) => {
  try {
    const subcategories = await categoryService.getSubcategories(
      req.params.parentId
    );
    
    sendSuccess(res, subcategories);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get subcategories with counts
 * GET /api/categories/:parentId/subcategories/with-counts
 */
const getSubcategoriesWithCounts = async (req, res) => {
  try {
    const subcategories = await categoryService.getSubcategoriesWithCounts(
      req.params.parentId
    );
    
    sendSuccess(res, subcategories);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Move subcategory
 * PATCH /api/subcategories/:subcategoryId/move
 */
const moveSubcategory = async (req, res) => {
  try {
    const { newParentId } = req.body;
    
    const subcategory = await categoryService.moveSubcategory(
      req.params.subcategoryId,
      newParentId
    );
    
    sendSuccess(res, subcategory, 'Subcategory moved successfully');
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get category hierarchy
 * GET /api/categories/:categoryId/hierarchy
 */
const getCategoryHierarchy = async (req, res) => {
  try {
    const depth = parseInt(req.query.depth) || Infinity;
    
    const hierarchy = await categoryService.getCategoryHierarchy(
      req.params.categoryId,
      depth
    );
    
    sendSuccess(res, hierarchy);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get all subcategories (flat)
 * GET /api/categories/:categoryId/all-subcategories
 */
const getAllSubcategoriesFlat = async (req, res) => {
  try {
    const subcategories = await categoryService.getAllSubcategoriesFlat(
      req.params.categoryId
    );
    
    sendSuccess(res, subcategories);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Get breadcrumbs
 * GET /api/categories/:categoryId/breadcrumbs
 */
const getBreadcrumbs = async (req, res) => {
  try {
    const breadcrumbs = await categoryService.getBreadcrumbs(
      req.params.categoryId
    );
    
    sendSuccess(res, breadcrumbs);
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Reorder subcategories
 * PUT /api/categories/:parentId/subcategories/reorder
 */
const reorderSubcategories = async (req, res) => {
  try {
    const { orderData } = req.body;
    
    const result = await categoryService.reorderSubcategories(
      req.params.parentId,
      orderData
    );
    
    sendSuccess(res, result, 'Subcategories reordered successfully');
  } catch (error) {
    sendError(res, error.message);
  }
};

/**
 * Bulk move subcategories
 * POST /api/subcategories/bulk-move
 */
const bulkMoveSubcategories = async (req, res) => {
  try {
    const { subcategoryIds, newParentId } = req.body;
    
    const result = await categoryService.bulkMoveSubcategories(
      subcategoryIds,
      newParentId
    );
    
    sendSuccess(
      res, 
      result, 
      `Moved ${result.success.length} subcategories, ${result.failed.length} failed`
    );
  } catch (error) {
    sendError(res, error.message);
  }
};

module.exports = {
  // Category controllers
  createCategory,
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  restoreCategory,
  getCategoryTree,
  getCategoryStats,
  bulkUpdateCategories,
  bulkDeleteCategories,
  
  // Subcategory controllers
  createSubcategory,
  getSubcategories,
  getSubcategoriesWithCounts,
  moveSubcategory,
  getCategoryHierarchy,
  getAllSubcategoriesFlat,
  getBreadcrumbs,
  reorderSubcategories,
  bulkMoveSubcategories
};