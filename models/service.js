const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    productName: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'annually'],
        default: 'monthly'
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    nextDueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Suspended', 'Terminated', 'Pending'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Service', serviceSchema);