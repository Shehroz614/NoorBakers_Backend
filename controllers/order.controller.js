const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Shopkeeper
exports.createOrder = async (req, res) => {
    try {
        req.body.shopkeeper = req.user.id;
        const order = await Order.create(req.body);
        res.status(201).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
    try {
        let query = {};
        
        // Filter based on user role
        if (req.user.role === 'shopkeeper') {
            query.shopkeeper = req.user.id;
        } else if (req.user.role === 'supplier') {
            query.supplier = req.user.id;
        }

        const orders = await Order.find(query)
            .populate('shopkeeper', 'name businessName')
            .populate('supplier', 'name businessName')
            .populate('products.product', 'name unit price')
            .sort('-createdAt');

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('shopkeeper', 'name businessName')
            .populate('supplier', 'name businessName')
            .populate('products.product', 'name unit price');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user has access to this order
        if (req.user.role === 'shopkeeper' && order.shopkeeper.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        if (req.user.role === 'supplier' && order.supplier.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
exports.updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user has access to this order
        if (req.user.role === 'shopkeeper' && order.shopkeeper.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this order'
            });
        }

        if (req.user.role === 'supplier' && order.supplier.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this order'
            });
        }

        // Update product quantities when order is delivered
        if (req.body.status === 'delivered' && order.status !== 'delivered') {
            for (const item of order.products) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.quantity -= item.quantity;
                    await product.save();
                }
            }
        }

        order.status = req.body.status;
        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Request product return
// @route   POST /api/orders/:id/returns
// @access  Private/Shopkeeper
exports.requestReturn = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is the shopkeeper
        if (order.shopkeeper.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to request returns for this order'
            });
        }

        // Check if order is delivered
        if (order.status !== 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Can only request returns for delivered orders'
            });
        }

        const { productId, quantity, reason } = req.body;

        // Find the product in the order
        const product = order.products.find(p => p.product.toString() === productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in this order'
            });
        }

        // Validate return quantity
        if (quantity > product.quantity) {
            return res.status(400).json({
                success: false,
                message: 'Return quantity cannot exceed ordered quantity'
            });
        }

        // Update product return details
        product.returned = quantity;
        product.returnReason = reason;
        product.returnStatus = 'pending';

        // Update order status if all products are being returned
        const allProductsReturned = order.products.every(p => p.returned === p.quantity);
        if (allProductsReturned) {
            order.status = 'returned';
        }

        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update return status
// @route   PUT /api/orders/:id/returns/:productId
// @access  Private/Supplier
exports.updateReturnStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is the supplier
        if (order.supplier.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update return status'
            });
        }

        const { status } = req.body;
        const product = order.products.find(p => p.product.toString() === req.params.productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in this order'
            });
        }

        if (product.returnStatus === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Return already completed'
            });
        }

        product.returnStatus = status;

        // If return is approved, update product quantities
        if (status === 'approved') {
            const productDoc = await Product.findById(product.product);
            if (productDoc) {
                productDoc.quantity += product.returned;
                await productDoc.save();
            }
        }

        // If return is completed, update order status if all returns are completed
        if (status === 'completed') {
            const allReturnsCompleted = order.products.every(p => 
                p.returned === 0 || p.returnStatus === 'completed'
            );
            if (allReturnsCompleted) {
                order.status = 'returned';
            }
        }

        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Add dispute to order
// @route   POST /api/orders/:id/disputes
// @access  Private
exports.addDispute = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user has access to this order
        if (req.user.role === 'shopkeeper' && order.shopkeeper.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to add dispute to this order'
            });
        }

        if (req.user.role === 'supplier' && order.supplier.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to add dispute to this order'
            });
        }

        order.disputes.push({
            ...req.body,
            raisedBy: req.user.id
        });

        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update dispute status
// @route   PUT /api/orders/:id/disputes/:disputeId
// @access  Private/Superadmin
exports.updateDisputeStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const dispute = order.disputes.id(req.params.disputeId);
        if (!dispute) {
            return res.status(404).json({
                success: false,
                message: 'Dispute not found'
            });
        }

        dispute.status = req.body.status;
        dispute.resolvedBy = req.user.id;
        dispute.resolvedAt = new Date();

        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 