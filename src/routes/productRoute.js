const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const {
  validateCreate,
  validateUpdate,
  validateId,
  validateSlug,
  validateList,
  validateBulkSeed
} = require('../validators/product.validator');

/**
 * PUBLIC ROUTES
 */

router.get('/filters', productController.getFilterOptions);
router.get('/slug/:slug', validateSlug, productController.getProductBySlug);
router.get('/category/:categoryId', validateId, productController.getProductsByCategory);
router.get('/subcategory/:subcategoryId', validateId, productController.getProductsBySubcategory);
router.get('/:id', validateId, productController.getProductById);
router.get('/', validateList, productController.getProducts);



router.post('/bulk-seed', validateBulkSeed, productController.bulkSeedProducts);
router.post('/', validateCreate, productController.createProduct);
router.put('/:id', validateUpdate, productController.updateProduct);
router.delete('/:id', validateId, productController.deleteProduct);

module.exports = router;
