const Task = require('../models/task.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private/Superadmin
exports.createTask = async (req, res) => {
    try {
        req.body.createdBy = req.user.id;
        const task = await Task.create(req.body);
        res.status(201).json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
    try {
        let query = {};
        
        // Filter by assigned user if not superadmin
        if (req.user.role !== 'superadmin') {
            query.assignedTo = req.user.id;
        }

        // Add filters if provided
        if (req.query.type) query.type = req.query.type;
        if (req.query.status) query.status = req.query.status;
        if (req.query.category) query.category = req.query.category;

        const tasks = await Task.find(query)
            // .populate('assignedTo', 'name businessName')
            // .populate('createdBy', 'name businessName')
            // .populate('verifiedBy', 'name businessName')
            .sort('-createdAt');

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('assignedTo', 'name businessName')
            .populate('createdBy', 'name businessName')
            .populate('verifiedBy', 'name businessName');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check if user has access to this task
        if (req.user.role !== 'superadmin' && task.assignedTo.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to view this task'
            });
        }

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private
exports.updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check if user has access to this task
        if (req.user.role !== 'superadmin' && task.assignedTo.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this task'
            });
        }

        // For HACCP tasks, require corrective actions when completing
        if (task.type === 'haccp' && req.body.status === 'completed') {
            if (!req.body.correctiveActions) {
                return res.status(400).json({
                    success: false,
                    message: 'Corrective actions are required for HACCP tasks'
                });
            }
            task.correctiveActions = req.body.correctiveActions;
        }

        task.status = req.body.status;
        await task.save();

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Add attachment to task
// @route   POST /api/tasks/:id/attachments
// @access  Private
exports.addAttachment = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Check if user has access to this task
        if (req.user.role !== 'superadmin' && task.assignedTo.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to add attachments to this task'
            });
        }

        task.attachments.push({
            url: req.body.url,
            type: req.body.type,
            uploadedBy: req.user.id
        });

        await task.save();

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get tasks by user
// @route   GET /api/tasks/user/:userId
// @access  Private/Superadmin
exports.getTasksByUser = async (req, res) => {
    try {
        // Check if user exists
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const tasks = await Task.find({ assignedTo: req.params.userId })
            .populate('assignedTo', 'name businessName')
            .populate('createdBy', 'name businessName')
            .populate('verifiedBy', 'name businessName')
            .sort('-createdAt');

        res.json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Verify HACCP task
// @route   PUT /api/tasks/:id/verify
// @access  Private/Superadmin
exports.verifyTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        if (task.type !== 'haccp') {
            return res.status(400).json({
                success: false,
                message: 'Only HACCP tasks can be verified'
            });
        }

        if (task.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Task must be completed before verification'
            });
        }

        task.status = 'verified';
        task.verifiedBy = req.user.id;
        task.verificationDate = new Date();
        await task.save();

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}; 