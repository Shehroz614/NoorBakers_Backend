const Inventory = require('../models/inventory.model');
const Product = require('../models/product.model');

// @desc    Add inventory item
// @route   POST /api/inventory
// @access  Private
exports.addInventoryItem = async (req, res) => {
    try {
        const product = await Product.findById(req.body.product);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Set owner based on user role
        req.body.owner = req.user.id;
        req.body.location = req.user.role === 'supplier' ? 'supplier' : 'shop';

        const inventory = await Inventory.create(req.body);

        res.status(201).json({
            success: true,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get inventory items
// @route   GET /api/inventory
// @access  Private
exports.getInventoryItems = async (req, res) => {
    try {
        const query = {
            owner: req.user.id,
            location: req.user.role === 'supplier' ? 'supplier' : 'shop'
        };

        // Filter by status if provided
        if (req.query.status) {
            query.status = req.query.status;
        }

        const inventory = await Inventory.find(query)
            .populate('product', 'name description unit price')
            .sort('-createdAt');

        res.json({
            success: true,
            count: inventory.length,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private
exports.updateInventoryItem = async (req, res) => {
    try {
        let inventory = await Inventory.findById(req.params.id);

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        // Make sure user is owner
        if (inventory.owner.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this inventory item'
            });
        }

        inventory = await Inventory.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('product', 'name description unit price');

        res.json({
            success: true,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private
exports.deleteInventoryItem = async (req, res) => {
    try {
        const inventory = await Inventory.findById(req.params.id);

        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }

        // Make sure user is owner
        if (inventory.owner.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to delete this inventory item'
            });
        }

        await inventory.remove();

        res.json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get expiring inventory items
// @route   GET /api/inventory/expiring
// @access  Private
exports.getExpiringItems = async (req, res) => {
    try {
        const daysThreshold = parseInt(req.query.days) || 7;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysThreshold);

        const inventory = await Inventory.find({
            owner: req.user.id,
            location: req.user.role === 'supplier' ? 'supplier' : 'shop',
            status: 'active',
            expiryDate: {
                $gte: new Date(),
                $lte: expiryDate
            }
        })
        .populate('product', 'name description unit price')
        .sort('expiryDate');

        res.json({
            success: true,
            count: inventory.length,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get inventory by product
// @route   GET /api/inventory/product/:productId
// @access  Private
exports.getInventoryByProduct = async (req, res) => {
    try {
        const inventory = await Inventory.find({
            product: req.params.productId,
            owner: req.user.id,
            location: req.user.role === 'supplier' ? 'supplier' : 'shop'
        })
        .populate('product', 'name description unit price')
        .sort('-createdAt');

        res.json({
            success: true,
            count: inventory.length,
            data: inventory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 