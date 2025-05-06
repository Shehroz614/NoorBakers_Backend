const Product = require('../models/product.model');

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Supplier
exports.createProduct = async (req, res) => {
    // console.log(`User role ${req.user.role} is not authorized to access this route`);
    try {
        req.body.supplier = req.user.id;
        req.body.location = req.user.role === 'supplier' ? 'supplier' : 'shop';

        // Handle convertRawToReady and rawItems
        const { convertRawToReady, rawItems } = req.body;
        if (convertRawToReady && Array.isArray(rawItems)) {
            for (const item of rawItems) {
                const { id, quantity } = item;
                const rawProduct = await Product.findById(id);
                if (!rawProduct) {
                    return res.status(400).json({
                        success: false,
                        message: `Raw product with id ${id} not found`
                    });
                }
                if (rawProduct.quantity < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient quantity for raw product ${rawProduct.name}`
                    });
                }
                rawProduct.quantity -= quantity;
                await rawProduct.save();
            }
        }

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

        // Filter by status if provided
        if (req.query.status) {
            query.status = req.query.status;
        }

        const products = await Product.find(query)
            .populate('supplier', 'name businessName')
            .sort('-createdAt');

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
        }).populate('supplier', 'name businessName');

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
        const { quantity } = req.body;
        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if user has access to the product's location
        if (product.location === 'supplier' && req.user.role !== 'supplier') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update supplier inventory'
            });
        }

        product.quantity = quantity;
        
        // Update status based on quantity
        if (quantity <= 0) {
            product.status = 'out_of_stock';
        } else if (quantity <= product.minStockLevel) {
            product.status = 'low_stock';
        } else {
            product.status = 'in_stock';
        }

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
        let query = {
            quantity: { $lte: '$minStockLevel' }
        };

        // Filter by location based on user role
        query.location = req.user.role === 'supplier' ? 'supplier' : 'shop';

        const products = await Product.find(query)
            .populate('supplier', 'name businessName')
            .sort('quantity');

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

// @desc    Get expired products
// @route   GET /api/products/expired
// @access  Private
exports.getExpiredProducts = async (req, res) => {
    try {
        let query = {
            expiryDate: { $lt: new Date() },
            status: { $ne: 'expired' }
        };

        // Filter by location based on user role
        query.location = req.user.role === 'supplier' ? 'supplier' : 'shop';

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