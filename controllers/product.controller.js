const Product = require('../models/product.model');

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Supplier
exports.createProduct = async (req, res) => {
    try {
        req.body.supplier = req.user.id;
        req.body.location = req.user.role === 'supplier' ? 'supplier' : 'shop';
        const product = await Product.create(req.body);
        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
    try {
        let query = {};
        
        // Filter by supplier if user is a supplier
        if (req.user.role === 'supplier') {
            query.supplier = req.user.id;
        }

        // Filter by location based on user role
        query.location = req.user.role === 'supplier' ? 'supplier' : 'shop';

        const products = await Product.find(query)
            .populate('supplier', 'name businessName');

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('supplier', 'name businessName');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Supplier
exports.updateProduct = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Make sure user is product owner
        if (product.supplier.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this product'
            });
        }

        product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Supplier
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Make sure user is product owner
        if (product.supplier.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to delete this product'
            });
        }

        await product.remove();

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

// @desc    Update product quantity
// @route   PUT /api/products/:id/quantity
// @access  Private
exports.updateProductQuantity = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Make sure user is product owner
        if (product.supplier.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this product'
            });
        }

        product.quantity = req.body.quantity;
        await product.save();

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res) => {
    try {
        const query = {
            supplier: req.user.id,
            location: req.user.role === 'supplier' ? 'supplier' : 'shop',
            quantity: { $lte: '$minStockLevel' }
        };

        const products = await Product.find(query)
            .populate('supplier', 'name businessName');

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get expiring products
// @route   GET /api/products/expiring
// @access  Private
exports.getExpiringProducts = async (req, res) => {
    try {
        const daysThreshold = parseInt(req.query.days) || 7;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysThreshold);

        const query = {
            supplier: req.user.id,
            location: req.user.role === 'supplier' ? 'supplier' : 'shop',
            status: 'active',
            expiryDate: {
                $gte: new Date(),
                $lte: expiryDate
            }
        };

        const products = await Product.find(query)
            .populate('supplier', 'name businessName')
            .sort('expiryDate');

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 