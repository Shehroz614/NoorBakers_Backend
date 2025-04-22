const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a product name'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    type: {
        type: String,
        required: [true, 'Please add a category'],
        enum: ['Raw', 'Ready']
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
    },
    materialType: {
        type: String,
        enum: ['active', 'passive'],
        required: function() {
            return this.category === 'Raw';
        }
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    unit: {
        type: String,
        required: [true, 'Please add a unit (e.g., kg, pieces)']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price']
    },
    minStockLevel: {
        type: Number,
        required: [true, 'Please add minimum stock level']
    },
    expiryDays: {
        type: Number,
        required: [true, 'Please add expiry days']
    },
    barcode: {
        type: String,
        unique: true,
        sparse: true
    },
    // Inventory fields
    quantity: {
        type: Number,
        default: 0
    },
    location: {
        type: String,
        // required: true,
        enum: ['supplier', 'shop']
    },
    batchNumber: {
        type: String,
        required: true
    },
    manufacturingDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'returned'],
        default: 'active'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
productSchema.index({ supplier: 1, location: 1 });
productSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('Product', productSchema); 