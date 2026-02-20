
const productService = require('../services/product');

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({ success: true, message, data });
};

const sendError = (res, message, statusCode = 400) => {
  res.status(statusCode).json({ success: false, message });
};

const createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);
    sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    sendError(res, error.message);
  }
};

const bulkSeedProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return sendError(res, 'Products array is required');
    }

    const result = await productService.bulkSeedProducts(products);

    sendSuccess(
      res,
      result,
      `Created ${result.success.length} products, ${result.failed.length} failed`,
      201
    );
  } catch (error) {
    sendError(res, error.message);
  }
};

const getProducts = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      category: req.query.category,
      subcategory: req.query.subcategory,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      inStock: req.query.inStock === 'true' ? true : req.query.inStock === 'false' ? false : undefined,
      isOnSale: req.query.isOnSale === 'true' ? true : req.query.isOnSale === 'false' ? false : undefined,
      brand: req.query.brand,
      search: req.query.search,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await productService.listProducts(options);
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error.message);
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    sendSuccess(res, product);
  } catch (error) {
    sendError(res, error.message);
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);

    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    sendSuccess(res, product);
  } catch (error) {
    sendError(res, error.message);
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    sendSuccess(res, product, 'Product updated successfully');
  } catch (error) {
    sendError(res, error.message);
  }
};

const deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    sendSuccess(res, null, 'Product deleted successfully');
  } catch (error) {
    sendError(res, error.message);
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await productService.getProductsByCategory(
      req.params.categoryId,
      options
    );

    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error.message);
  }
};

const getProductsBySubcategory = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await productService.getProductsBySubcategory(
      req.params.subcategoryId,
      options
    );

    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error.message);
  }
};

const getFilterOptions = async (req, res) => {
  try {
    const { category } = req.query;

    const filterOptions = category
      ? await productService.getFilterOptions(category)
      : await productService.getFilterOptions();

    sendSuccess(res, filterOptions, 'Filter options retrieved successfully');
  } catch (error) {
    sendError(res, error.message);
  }
};


module.exports = {
  createProduct,
  bulkSeedProducts,
  getProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getProductsBySubcategory,
  getFilterOptions
};
