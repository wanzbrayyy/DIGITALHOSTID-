const mongoose = require('mongoose');

const affiliateReferralSchema = new mongoose.Schema({
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    referredUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'credited'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('AffiliateReferral', affiliateReferralSchema);