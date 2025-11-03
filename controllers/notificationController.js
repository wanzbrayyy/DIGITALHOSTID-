const Notification = require('../models/notification');

exports.getNotifications = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const notifications = await Notification.find({ user: req.session.user.id })
            .sort({ createdAt: -1 })
            .limit(10);
            
        const unreadCount = await Notification.countDocuments({ user: req.session.user.id, isRead: false });

        res.json({
            unread: unreadCount,
            notifications: notifications
        });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil notifikasi.' });
    }
};

exports.markNotificationsAsRead = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        await Notification.updateMany({ user: req.session.user.id, isRead: false }, { isRead: true });
        res.json({ success: true, message: 'Semua notifikasi ditandai telah dibaca.' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal memperbarui notifikasi.' });
    }
};