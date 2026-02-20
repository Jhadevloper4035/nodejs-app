const Category = require('../models/category');
const { generateUniqueSlug } = require('../utils/slugify');

/**
 * Category & Subcategory Service
 * Pure business logic - no HTTP handling
 */

// ========== CATEGORY OPERATIONS ==========

/**
 * Create category or subcategory
 */
const createCategory = async (categoryData) => {
  const { name, slug, parent, ...rest } = categoryData;

  // Generate slug if not provided
  const finalSlug = slug || await generateUniqueSlug(name);

  // Validate parent if provided
  if (parent) {
    const parentCategory = await Category.findOne({
      _id: parent,
      isDeleted: false
    });
    if (!parentCategory) {
      throw new Error('Parent category not found');
    }
  }

  // Ensure only one primary image
  if (rest.images && rest.images.length > 0) {
    const primaryCount = rest.images.filter(img => img.isPrimary).length;
    if (primaryCount > 1) {
      throw new Error('Only one image can be marked as primary');
    }
    if (primaryCount === 0) {
      rest.images[0].isPrimary = true;
    }
  }

  const category = new Category({
    name,
    slug: finalSlug,
    parent: parent || null,
    ...rest
  });

  await category.save();
  return category;
};

/**
 * Get category by ID
 */
const getCategoryById = async (categoryId, includeDeleted = false) => {
  const query = { _id: categoryId };
  if (!includeDeleted) query.isDeleted = false;

  return await Category.findOne(query).populate('parent', 'name slug');
};



/**
 * Get category by slug
 */
const getCategoryBySlug = async (slug, includeDeleted = false) => {
  const query = { slug };
  if (!includeDeleted) query.isDeleted = false;

  return await Category.findOne(query).populate('parent', 'name slug');
};



/**
 * List categories with filters and pagination
 */
const listCategories = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    isActive,
    parent,
    search,
    sortBy = 'displayOrder',
    sortOrder = 'asc'
  } = options;

  // Build query
  const query = { isDeleted: false };

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  if (parent === 'null' || parent === 'none') {
    query.parent = null;
  } else if (parent) {
    query.parent = parent;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  if (sortBy === 'displayOrder') sort.name = 1;

  // Execute
  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    Category.find(query)
      .populate('parent', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Category.countDocuments(query)
  ]);

  return {
    categories,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Update category
 */
const updateCategory = async (categoryId, updateData) => {
  const category = await getCategoryById(categoryId);
  if (!category) throw new Error('Category not found');

  const { name, slug, parent, ...rest } = updateData;

  // Handle slug update
  if (slug && slug !== category.slug) {
    const isUnique = await Category.isSlugUnique(slug, categoryId);
    if (!isUnique) throw new Error('Slug already exists');
    category.slug = slug;
  } else if (name && name !== category.name) {
    category.slug = await generateUniqueSlug(name, categoryId);
  }

  // Handle parent update
  if (parent !== undefined) {
    if (parent === null) {
      category.parent = null;
    } else {
      if (parent === categoryId) {
        throw new Error('Category cannot be its own parent');
      }

      const parentCategory = await Category.findOne({
        _id: parent,
        isDeleted: false
      });
      if (!parentCategory) throw new Error('Parent category not found');

      // Check circular reference
      const descendants = await category.getDescendants();
      const descendantIds = descendants.map(d => d._id.toString());
      if (descendantIds.includes(parent.toString())) {
        throw new Error('Cannot set descendant as parent');
      }

      category.parent = parent;
    }
  }

  // Update other fields
  if (name) category.name = name;
  Object.assign(category, rest);

  await category.save();
  return category;
};

/**
 * Soft delete category
 */
const deleteCategory = async (categoryId) => {
  const category = await getCategoryById(categoryId);
  if (!category) throw new Error('Category not found');

  // Check for children
  const childrenCount = await Category.countDocuments({
    parent: categoryId,
    isDeleted: false
  });

  if (childrenCount > 0) {
    throw new Error('Cannot delete category with active children');
  }

  return await category.softDelete();
};

/**
 * Restore category
 */
const restoreCategory = async (categoryId) => {
  const category = await getCategoryById(categoryId, true);
  if (!category) throw new Error('Category not found');
  if (!category.isDeleted) throw new Error('Category is not deleted');

  return await category.restore();
};

/**
 * Get category tree
 */
const getCategoryTree = async () => {
  return await Category.getTree();
};

// ========== SUBCATEGORY OPERATIONS ==========

/**
 * Get subcategories of a parent
 */
const getSubcategories = async (parentId) => {
  return await Category.find({
    parent: parentId,
    isDeleted: false
  })
    .sort({ displayOrder: 1, name: 1 })
    .lean();
};


const getSubcategoryBySlug = async (slug, includeDeleted = false) => {
  const query = { slug, parent: { $ne: null } };
  if (!includeDeleted) query.isDeleted = false;

  return await Category.findOne(query).populate("parent", "name slug");
};


const getSubcategoryBySlugAndParent = async (
  categorySlug,
  subcategorySlug,
  includeDeleted = false
) => {
  const parentQuery = { slug: categorySlug };
  if (!includeDeleted) parentQuery.isDeleted = false;

  const parentCategory = await Category.findOne(parentQuery).lean();
  if (!parentCategory) return null;

  const childQuery = {
    slug: subcategorySlug,
    parent: parentCategory._id,
  };
  if (!includeDeleted) childQuery.isDeleted = false;

  return await Category.findOne(childQuery).populate("parent", "name slug");
};




/**
 * Get subcategories with child counts
 */
const getSubcategoriesWithCounts = async (parentId) => {
  const subcategories = await getSubcategories(parentId);

  return await Promise.all(
    subcategories.map(async (sub) => {
      const childCount = await Category.countDocuments({
        parent: sub._id,
        isDeleted: false
      });

      return {
        ...sub,
        childCount,
        hasChildren: childCount > 0
      };
    })
  );
};

/**
 * Move subcategory to new parent
 */
const moveSubcategory = async (subcategoryId, newParentId) => {
  const subcategory = await getCategoryById(subcategoryId);
  if (!subcategory) throw new Error('Subcategory not found');

  if (subcategoryId === newParentId) {
    throw new Error('Category cannot be its own parent');
  }

  const newParent = await Category.findOne({
    _id: newParentId,
    isDeleted: false
  });
  if (!newParent) throw new Error('New parent not found');

  // Check circular reference
  const descendants = await subcategory.getDescendants();
  const descendantIds = descendants.map(d => d._id.toString());
  if (descendantIds.includes(newParentId)) {
    throw new Error('Cannot move to descendant');
  }

  subcategory.parent = newParentId;
  await subcategory.save();

  return subcategory;
};

/**
 * Get category hierarchy (nested)
 */
const getCategoryHierarchy = async (categoryId, depth = Infinity) => {
  const category = await getCategoryById(categoryId);
  if (!category) throw new Error('Category not found');

  const categoryObj = category.toObject();

  if (depth > 0) {
    categoryObj.subcategories = await getSubcategoriesRecursive(
      categoryId,
      depth - 1
    );
  }

  return categoryObj;
};

/**
 * Helper: Recursive subcategory fetch
 */
const getSubcategoriesRecursive = async (parentId, remainingDepth) => {
  const subcategories = await getSubcategories(parentId);

  if (remainingDepth > 0) {
    for (const sub of subcategories) {
      sub.subcategories = await getSubcategoriesRecursive(
        sub._id,
        remainingDepth - 1
      );
    }
  }

  return subcategories;
};

/**
 * Get all descendants (flat list)
 */
const getAllSubcategoriesFlat = async (categoryId) => {
  const category = await getCategoryById(categoryId);
  if (!category) throw new Error('Category not found');

  return await category.getDescendants();
};

/**
 * Get breadcrumbs
 */
const getBreadcrumbs = async (categoryId) => {
  const category = await getCategoryById(categoryId);
  if (!category) throw new Error('Category not found');

  const breadcrumbs = [];
  let current = category;

  while (current) {
    breadcrumbs.unshift({
      _id: current._id,
      name: current.name,
      slug: current.slug,
      level: current.level
    });

    if (current.parent) {
      current = await Category.findById(current.parent);
    } else {
      current = null;
    }
  }

  return breadcrumbs;
};

/**
 * Reorder subcategories
 */
const reorderSubcategories = async (parentId, orderData) => {
  const parent = await getCategoryById(parentId);
  if (!parent) throw new Error('Parent category not found');

  const updates = orderData.map(({ id, displayOrder }) =>
    Category.updateOne(
      { _id: id, parent: parentId, isDeleted: false },
      { $set: { displayOrder } }
    )
  );

  await Promise.all(updates);

  return { updated: orderData.length };
};

/**
 * Bulk move subcategories
 */
const bulkMoveSubcategories = async (subcategoryIds, newParentId) => {
  const newParent = await Category.findOne({
    _id: newParentId,
    isDeleted: false
  });
  if (!newParent) throw new Error('New parent not found');

  const results = { success: [], failed: [] };

  for (const subcategoryId of subcategoryIds) {
    try {
      await moveSubcategory(subcategoryId, newParentId);
      results.success.push(subcategoryId);
    } catch (error) {
      results.failed.push({
        id: subcategoryId,
        reason: error.message
      });
    }
  }

  return results;
};

/**
 * Bulk update categories
 */
const bulkUpdateCategories = async (categoryIds, updateData) => {
  const result = await Category.updateMany(
    { _id: { $in: categoryIds }, isDeleted: false },
    { $set: updateData }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  };
};

/**
 * Bulk delete categories
 */
const bulkDeleteCategories = async (categoryIds) => {
  // Check for children
  const categoriesWithChildren = await Category.find({
    parent: { $in: categoryIds },
    isDeleted: false
  });

  if (categoriesWithChildren.length > 0) {
    throw new Error('Some categories have active children');
  }

  const result = await Category.updateMany(
    { _id: { $in: categoryIds }, isDeleted: false },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false
      }
    }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  };
};

/**
 * Get statistics
 */
const getCategoryStats = async () => {
  const [total, active, deleted, roots] = await Promise.all([
    Category.countDocuments({ isDeleted: false }),
    Category.countDocuments({ isActive: true, isDeleted: false }),
    Category.countDocuments({ isDeleted: true }),
    Category.countDocuments({ parent: null, isDeleted: false })
  ]);

  return { total, active, inactive: total - active, deleted, roots };
};

module.exports = {
  // Category operations
  createCategory,
  getCategoryById,
  getCategoryBySlug,
  listCategories,
  updateCategory,
  deleteCategory,
  restoreCategory,
  getCategoryTree,
  getCategoryStats,

  // Subcategory operations
  getSubcategories,
  getSubcategoryBySlug,
  getSubcategoryBySlugAndParent,
  getSubcategoriesWithCounts,
  moveSubcategory,
  getCategoryHierarchy,
  getAllSubcategoriesFlat,
  getBreadcrumbs,
  reorderSubcategories,
  bulkMoveSubcategories,

  // Bulk operations
  bulkUpdateCategories,
  bulkDeleteCategories
};
