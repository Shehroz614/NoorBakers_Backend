const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    shopkeeper: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        returned: {
            type: Number,
            default: 0
        },
        returnReason: String,
        returnStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed'],
            default: 'pending'
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'delivered', 'cancelled', 'returned'],
        default: 'pending'
    },
    deliveryDate: Date,
    paymentStatus: {
        type: String,
        enum: ['pending', 'partial', 'completed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'check'],
        required: true
    },
    notes: String,
    disputes: [{
        description: String,
        status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved', 'rejected'],
            default: 'open'
        },
        raisedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        raisedAt: {
            type: Date,
            default: Date.now
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolvedAt: Date
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
    if (!this.orderNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.orderNumber = `ORD${year}${month}${random}`;
    }
    next();
});

// Indexes for efficient querying
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ shopkeeper: 1, status: 1 });
orderSchema.index({ supplier: 1, status: 1 });
orderSchema.index({ deliveryDate: 1 });

module.exports = mongoose.model('Order', orderSchema); 