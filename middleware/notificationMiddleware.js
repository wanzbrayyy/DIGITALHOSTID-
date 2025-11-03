const Notification = require('../models/notification');

exports.fetchNotifications = async (req, res, next) => {
    res.locals.unreadNotifications = 0;
    
    if (req.session.user) {
        try {
            const count = await Notification.countDocuments({ user: req.session.user.id, isRead: false });
            res.locals.unreadNotifications = count;
        } catch (error) {
            console.error('Gagal mengambil jumlah notifikasi:', error);
            res.locals.unreadNotifications = 0;
        }
    }
    
    next();
};