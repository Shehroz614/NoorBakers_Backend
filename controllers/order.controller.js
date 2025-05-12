const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const { createNotificationHelper } = require('./notification.controller'); // Import the helper
const puppeteer = require('puppeteer');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Shopkeeper
exports.createOrder = async (req, res) => {
    try {
        req.body.shopkeeper = req.user.id;
        const order = await Order.create(req.body);

        // Create a notification for the shopkeeper
        const shopkeeperNotification = await createNotificationHelper(
            req.user.id, // userId: The shopkeeper who placed the order
            'New Order Created', // title
            `Your order #${order._id} has been successfully placed.`, // message
            'success', // type
            'order', // category
            { orderId: order._id }, // data
            `/orders/${order._id}` // link
        );

        if (!shopkeeperNotification) {
            console.error('Failed to create shopkeeper notification for order:', order._id);
        }

        // Optionally, notify the supplier if present
        if (order.supplier) {
            const supplierNotification = await createNotificationHelper(
                order.supplier, // userId: The supplier of the order
                'New Order Received', // title
                `You have received a new order #${order.orderNumber} from shopkeeper.`, // message
                'info', // type
                'order', // category
                { orderId: order._id }, // data
                `/orders/${order._id}` // link
            );

            if (!supplierNotification) {
                console.error('Failed to create supplier notification for order:', order._id);
            }
        }

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
        const order = await Order?.findById(req.params.id)
            .populate('shopkeeper', 'name businessName email address phone')
            .populate('supplier', 'name businessName')
            .populate('products.product', 'name unit price');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // // Check if user has access to this order
        // if (req.user.role === 'shopkeeper' && order.shopkeeper.toString() !== req.user.id) {
        //     return res.status(401).json({
        //         success: false,
        //         message: 'Not authorized to view this order'
        //     });
        // }

        // if (req.user.role === 'supplier' && order.supplier.toString() !== req.user.id) {
        //     return res.status(401).json({
        //         success: false,
        //         message: 'Not authorized to view this order'
        //     });
        // }

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

        // // Check if user has access to this order
        // if (req.user.role === 'shopkeeper' && order.shopkeeper.toString() !== req.user.id) {
        //     return res.status(401).json({
        //         success: false,
        //         message: 'Not authorized to update this order'
        //     });
        // }

        // if (req.user.role === 'supplier' && order.supplier.toString() !== req.user.id) {
        //     return res.status(401).json({
        //         success: false,
        //         message: 'Not authorized to update this order'
        //     });
        // }

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

        // Add to history if status is changed
        if (order.status !== req.body.status) {
            order.history = order.history || [];
            order.history.push({
                status: req.body.status,
                changedAt: new Date(),
                changedBy: req.body.changedBy
            });
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

// @desc    Generate and download invoice PDF for an order
// @route   GET /api/orders/:id/invoice
// @access  Private
exports.generateInvoice = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('shopkeeper', 'name businessName email address phone')
            .populate('supplier', 'name businessName email address phone')
            .populate('products.product', 'name unit price');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Build beautiful HTML for the invoice
        const html = `
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f7f7f7; }
                .invoice-box { max-width: 800px; margin: 40px auto; padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
                h1 { color: #4a90e2; margin-bottom: 0; }
                .header, .footer { text-align: center; }
                .info-table { width: 100%; margin: 20px 0; }
                .info-table td { padding: 4px 8px; }
                .products-table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                .products-table th, .products-table td { border: 1px solid #e0e0e0; padding: 10px; text-align: left; }
                .products-table th { background: #f0f4fa; color: #333; }
                .total-row td { font-weight: bold; font-size: 1.1em; }
                .status { display: inline-block; padding: 4px 12px; border-radius: 8px; background: #e3fcef; color: #27ae60; font-weight: bold; }
                .footer { margin-top: 40px; color: #888; font-size: 0.95em; }
            </style>
        </head>
        <body>
            <div class="invoice-box">
                <div class="header">
                    <h1>Noor Bakers</h1>
                    <div style="color:#888;">Order Invoice</div>
                </div>
                <table class="info-table">
                    <tr>
                        <td><b>Order #:</b> ${order.orderNumber}</td>
                        <td><b>Date:</b> ${order.createdAt.toLocaleDateString()}</td>
                    </tr>
                    <tr>
                        <td><b>Shopkeeper:</b> ${order.shopkeeper?.name || ''} (${order.shopkeeper?.businessName || ''})</td>
                        <td><b>Supplier:</b> ${order.supplier?.name || ''} (${order.supplier?.businessName || ''})</td>
                    </tr>
                    <tr>
                        <td><b>Status:</b> <span class="status">${order.status}</span></td>
                        <td><b>Payment:</b> ${order.paymentStatus} (${order.paymentMethod})</td>
                    </tr>
                </table>
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Product</th>
                            <th>Unit</th>
                            <th>Price</th>
                            <th>Qty</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.products.map((item, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${item.product?.name || ''}</td>
                                <td>${item.product?.unit || ''}</td>
                                <td>${item.price.toFixed(2)}</td>
                                <td>${item.quantity}</td>
                                <td>${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="5" style="text-align:right;">Total:</td>
                            <td>${order.totalAmount.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
                <div style="margin-top:30px;"><b>Notes:</b> ${order.notes || 'N/A'}</div>
                <div class="footer">
                    Thank you for your business!<br/>
                    Noor Bakers &copy; ${new Date().getFullYear()}
                </div>
            </div>
        </body>
        </html>
        `;

        // Generate PDF with Puppeteer
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Invoice_${order.orderNumber}.pdf"`
            // 'Content-Disposition': `attachment; filename="Invoice_${order.orderNumber}.pdf"`,
            // 'Content-Length': pdfBuffer.length
        });
        // res.send(pdfBuffer);
        res.end(pdfBuffer);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};