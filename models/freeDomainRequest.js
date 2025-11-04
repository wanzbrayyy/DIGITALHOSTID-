const mongoose = require('mongoose');

const freeDomainRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    domainName: { type: String, required: true },
    purpose: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('FreeDomainRequest', freeDomainRequestSchema);