const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    creditBalance: {
        type: Number,
        default: 0
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'support'],
        default: 'user'
    },
    profilePicture: {
        type: String,
        default: ''
    },
    customerId: {
        type: Number,
        required: true,
        unique: true
    },
    affiliateCode: {
        type: String,
        unique: true,
        sparse: true
    },
    organization: { type: String },
    street_1: { type: String },
    city: { type: String },
    state: { type: String },
    postal_code: { type: String },
    voice: { type: String },
    country_code: { type: String, default: 'ID' }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);