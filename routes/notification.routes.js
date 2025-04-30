const express = require('express');
const router = express.Router();
const {
    createNotification,
    getNotifications,
    getNotification,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getNotificationsByCategory
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

// Protect all routes
router.use(protect);

// Notification routes
router.route('/')
    .get(getNotifications)
    .post(createNotification)
    .delete(deleteAllNotifications);

router.route('/unread/count')
    .get(getUnreadCount);

router.route('/:id')
    .get(getNotification)
    .delete(deleteNotification);

router.route('/:id/read')
    .put(markAsRead);

router.route('/read-all')
    .put(markAllAsRead);

router.route('/category/:category')
    .get(getNotificationsByCategory);

module.exports = router; 