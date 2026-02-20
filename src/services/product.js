const Product = require('../models/products');
const Category = require('../models/category');
const { generateUniqueSlug } = require('../utils/slugify');
const mongoose = require('mongoose');

/**
 * PRODUCT SERVICE
 */

const findOrCreateCategory = async (categoryName) => {
  let category = await Category.findOne({
    name: categoryName,
    isDeleted: false,
    parent: null
  });

  if (!category) {
    const slug = await generateUniqueSlug(categoryName);
    category = new Category({
      name: categoryName,
      slug,
      parent: null,
      level: 0
    });
    await category.save();
  }

  return category;
};

const findOrCreateSubcategory = async (subcategoryName, parentId) => {
  let subcategory = await Category.findOne({
    name: subcategoryName,
    parent: parentId,
    isDeleted: false
  });

  if (!subcategory) {
    const slug = await generateUniqueSlug(subcategoryName);
    subcategory = new Category({
      name: subcategoryName,
      slug,
      parent: parentId
    });
    await subcategory.save();
  }

  return subcategory;
};

const createProduct = async (productData) => {

  const { title, slug, category: categoryName, subcategory: subcategoryNames, ...rest } = productData;

  const finalSlug = slug || await generateUniqueSlug(title);

  const categoryDoc = await findOrCreateCategory(categoryName);

  const subcategoryDocs = [];
  if (subcategoryNames && subcategoryNames.length > 0) {
    for (const subName of subcategoryNames) {
      const subDoc = await findOrCreateSubcategory(subName, categoryDoc._id);
      subcategoryDocs.push(subDoc._id);
    }
  }

  const product = new Product({
    title,
    slug: finalSlug,
    category: categoryDoc._id,
    subcategories: subcategoryDocs,
    ...rest
  });

  await product.save();
  await product.populate('category', 'name slug');
  await product.populate('subcategories', 'name slug');

  return product;
};

const bulkSeedProducts = async (productsArray) => {
  const results = {
    success: [],
    failed: []
  };

  for (const productData of productsArray) {
    try {
      const product = await createProduct(productData);
      results.success.push({
        id: product._id,
        title: product.title,
        slug: product.slug
      });
    } catch (error) {
      results.failed.push({
        title: productData.title,
        reason: error.message
      });
    }
  }

  return results;
};

const getProductById = async (id) => {
  return await Product.findOne({ _id: id, isDeleted: false })
    .populate('category', 'name slug')
    .populate('subcategories', 'name slug');
};

const getProductBySlug = async (slug) => {
  return await Product.findOne({ slug, isDeleted: false })
    .populate('category', 'name slug')
    .populate('subcategories', 'name slug');
};

const listProducts = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    category,
    subcategory,
    minPrice,
    maxPrice,
    inStock,
    isOnSale,
    brand,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const query = { isDeleted: false, isActive: true };

  if (category) query.category = category;
  if (subcategory) query.subcategories = subcategory;
  if (minPrice) query.price = { ...query.price, $gte: minPrice };
  if (maxPrice) query.price = { ...query.price, $lte: maxPrice };
  if (inStock !== undefined) query.inStock = inStock;
  if (isOnSale !== undefined) query.isOnSale = isOnSale;
  if (brand) query.brand = brand;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } }
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .populate('subcategories', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query)
  ]);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

const updateProduct = async (id, updateData) => {
  const product = await getProductById(id);
  if (!product) throw new Error('Product not found');

  const { category: categoryName, subcategory: subcategoryNames, ...rest } = updateData;

  if (categoryName) {
    const categoryDoc = await findOrCreateCategory(categoryName);
    product.category = categoryDoc._id;
  }

  if (subcategoryNames) {
    const categoryDoc = await Category.findById(product.category);
    const subcategoryDocs = [];

    for (const subName of subcategoryNames) {
      const subDoc = await findOrCreateSubcategory(subName, categoryDoc._id);
      subcategoryDocs.push(subDoc._id);
    }

    product.subcategories = subcategoryDocs;
  }

  Object.assign(product, rest);

  await product.save();
  await product.populate('category', 'name slug');
  await product.populate('subcategories', 'name slug');

  return product;
};

const deleteProduct = async (id) => {
  const product = await getProductById(id);
  if (!product) throw new Error('Product not found');

  return await product.softDelete();
};


const getProductsByCategory = async (categoryId, options = {}) => {
  const { page = 1, limit = 20 } = options;

  const query = {
    category: categoryId,
    isDeleted: false,
    isActive: true
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('category', 'name slug')
      .populate('subcategories', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query)
  ]);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};




const getProductsBySubcategory = async (subcategoryId, options = {}) => {
  const { page = 1, limit = 20 } = options;

  const subId = new mongoose.Types.ObjectId(subcategoryId);

  const query = {
    subcategories: { $in: [subId] }, // ✅ array contains this subcategory
    isDeleted: false,
    isActive: true,
  };

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug")
      .populate("subcategories", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};








const getFilterOptions = async (categoryId = null) => {
  return await Product.getUniqueFilterOptions(categoryId);
};

module.exports = {
  createProduct,
  bulkSeedProducts,
  getProductById,
  getProductBySlug,
  listProducts,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getProductsBySubcategory,
  getFilterOptions
};
