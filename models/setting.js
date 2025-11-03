const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    singleton: {
        type: Boolean,
        default: true,
        unique: true
    },
    prices: {
        whois: {
            type: Number,
            default: 50000
        },
        tld: {
            type: Map,
            of: Number,
            default: {
                'com': 150000,
                'id': 220000,
                'cloud': 50000,
                'net': 60000,
                'org': 40000,
                'xyz': 30000,
                'site': 30000
            }
        },
        ssl: {
            type: Map,
            of: Number,
            default: {}
        }
    }
});

module.exports = mongoose.model('Setting', settingSchema);