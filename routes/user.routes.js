const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    getUsersByRole
} = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Protect all routes after this middleware
router.use(protect);

// Routes accessible by all authenticated users
router.get('/me', getUser);

// Routes accessible only by superadmin
router.get('/', authorize('superadmin'), getUsers);
router.get('/role/:role', authorize('superadmin'), getUsersByRole);
router.put('/:id', updateUser);
router.delete('/:id', authorize('superadmin'), deleteUser);

module.exports = router; 