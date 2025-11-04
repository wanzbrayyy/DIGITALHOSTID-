const mongoose = require('mongoose');

const systemServiceSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    status: { type: String, enum: ['Operational', 'Maintenance', 'Degraded Performance', 'Outage'], default: 'Operational' },
    description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SystemService', systemServiceSchema);