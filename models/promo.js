const mongoose = require('mongoose');

const promoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    link: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
promoSchema.pre('save', async function(next) {
    if (this.isModified('isActive') && this.isActive) {
        await this.constructor.updateMany({ _id: { $ne: this._id } }, { isActive: false });
    }
    next();
});

module.exports = mongoose.model('Promo', promoSchema);