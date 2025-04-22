const express = require('express');
const router = express.Router();
const {
    createProduct,
    getProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    updateProductQuantity,
    getLowStockProducts,
    getExpiredProducts,
    getExpiringProducts
} = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Protect all routes after this middleware
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', getProducts);
router.get('/:id', getProduct);
router.get('/low-stock', getLowStockProducts);
router.get('/expired', getExpiredProducts);
router.get('/expiring', getExpiringProducts);
router.put('/:id/quantity', updateProductQuantity);

// Routes accessible only by suppliers
router.post('/', authorize('supplier'), createProduct);
router.put('/:id', authorize('supplier'), updateProduct);
router.delete('/:id', authorize('supplier'), deleteProduct);

module.exports = router; 