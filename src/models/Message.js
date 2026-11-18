const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    claimId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Claim',
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 5000
    },
    readAt: {
        type: Date,
        default: null
    },
}, 
{
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);