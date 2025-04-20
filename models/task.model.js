const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a task title'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please add a task description']
    },
    type: {
        type: String,
        required: [true, 'Please add a task type'],
        enum: ['haccp', 'inventory', 'order', 'maintenance', 'other']
    },
    category: {
        type: String,
        required: function() {
            return this.type === 'haccp';
        },
        enum: ['receiving', 'storage', 'preparation', 'cooking', 'cooling', 'packaging', 'distribution', 'cleaning', 'pest_control', 'waste_management']
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'verified'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    dueDate: {
        type: Date,
        required: true,
        validate: {
            validator: function(v) {
                return v > new Date();
            },
            message: 'Due date must be in the future'
        }
    },
    // HACCP specific fields
    temperature: {
        type: Number,
        required: function() {
            return this.type === 'haccp';
        },
        validate: {
            validator: function(v) {
                return v >= -50 && v <= 150; // Reasonable temperature range in Celsius
            },
            message: 'Temperature must be between -50°C and 150°C'
        }
    },
    criticalLimit: {
        type: Number,
        required: function() {
            return this.type === 'haccp';
        },
        validate: {
            validator: function(v) {
                return v > 0;
            },
            message: 'Critical limit must be greater than 0'
        }
    },
    observations: {
        type: String,
        required: function() {
            return this.type === 'haccp';
        }
    },
    correctiveActions: {
        type: String,
        required: function() {
            return this.type === 'haccp' && this.status === 'completed';
        }
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verificationDate: {
        type: Date
    },
    attachments: [{
        url: String,
        type: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ type: 1, status: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema); 