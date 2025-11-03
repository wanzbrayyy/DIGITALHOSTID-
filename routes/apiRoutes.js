const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { ensureAuthenticated } = require('../middleware/auth');

router.get('/notifications', ensureAuthenticated, notificationController.getNotifications);
router.post('/notifications/read', ensureAuthenticated, notificationController.markNotificationsAsRead);

module.exports = router;