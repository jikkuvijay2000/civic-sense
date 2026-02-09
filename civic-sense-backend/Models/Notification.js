const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: String, // 'Authority' or specific userId if needed later
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Emergency', 'Info', 'Alert'],
        default: 'Info'
    },
    relatedId: {
        type: String, // ID of the related complaint or post
        required: false
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = { Notification };
