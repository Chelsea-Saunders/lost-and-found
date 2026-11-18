const mongoose = require('mongoose');

const ClaimSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post', 
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    proof: {
        type: String, 
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 1000
    },
    status: {
        type: String, 
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },

    reviewNote: {
        type: String,
        default: ''
    },
    reviewedAt: {
        type: Date, 
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Claim', ClaimSchema);