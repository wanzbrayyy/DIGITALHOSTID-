const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        default: null
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

const ticketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        enum: ['Teknis', 'Billing', 'Lainnya'],
        required: true
    },
    status: {
        type: String,
        enum: ['Buka', 'Dijawab', 'Ditutup'],
        default: 'Buka'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    messages: [messageSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema);