const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
    qrId: {
        type: String,
        required: true,
        unique: true
    },
    hasFile: {
        type: Boolean,
        default: false
    },
    filename: {
        type: String,
        default: null
    },
    originalFilename: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('QRCode', qrCodeSchema); 