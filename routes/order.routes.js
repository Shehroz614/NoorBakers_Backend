const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    requestReturn,
    updateReturnStatus,
    addDispute,
    updateDisputeStatus,
    generateInvoice
} = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Protect all routes after this middleware
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', getOrders);
router.get('/:id', getOrder);
router.put('/:id/status', updateOrderStatus);
router.post('/:id/disputes', addDispute);
router.get('/:id/invoice', generateInvoice);

// Routes accessible only by shopkeepers
router.post('/', authorize('shopkeeper'), createOrder);
router.post('/:id/returns', authorize('shopkeeper'), requestReturn);

// Routes accessible only by suppliers
router.put('/:id/returns/:productId', authorize('supplier'), updateReturnStatus);

// Routes accessible only by superadmin
router.put('/:id/disputes/:disputeId', authorize('superadmin'), updateDisputeStatus);

module.exports = router; 