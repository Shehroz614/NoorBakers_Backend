const express = require('express');
const router = express.Router();
const {
    createTask,
    getTasks,
    getTask,
    updateTaskStatus,
    addAttachment,
    getTasksByUser,
    verifyTask
} = require('../controllers/task.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Protect all routes after this middleware
router.use(protect);

// Routes accessible by all authenticated users
router.get('/', getTasks);
router.get('/:id', getTask);
router.patch('/:id/status', updateTaskStatus);
router.post('/:id/attachments', addAttachment);

// Routes accessible only by superadmin
router.post('/', authorize('superadmin'), createTask);
router.get('/user/:userId', authorize('superadmin'), getTasksByUser);
router.put('/:id/verify', authorize('superadmin'), verifyTask);

// Handle 404 for undefined routes
router.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

module.exports = router; 