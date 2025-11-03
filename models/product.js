const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true
    },
    price_unit: {
        type: String,
        default: '/bulan'
    },
    features: {
        type: [String],
        default: []
    },
    icon: {
        type: String,
        default: 'fas fa-server'
    },
    isFeatured: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);