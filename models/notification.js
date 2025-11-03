const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Judul notifikasi tidak boleh kosong.'],
        trim: true
    },
    message: {
        type: String,
        required: [true, 'Pesan notifikasi tidak boleh kosong.'],
        trim: true
    },
    link: {
        type: String,
        default: '#'
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('Notification', notificationSchema);