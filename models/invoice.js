const mongoose = require('mongoose');
const invoiceSchema = new mongoose.Schema({
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
invoiceId: { type: String, required: true, unique: true },
items: [{
description: String,
amount: Number
}],
totalAmount: { type: Number, required: true },
status: { type: String, enum: ['unpaid', 'paid', 'cancelled'], default: 'unpaid' },
dueDate: { type: Date }
}, { timestamps: true });
module.exports = mongoose.model('Invoice', invoiceSchema);