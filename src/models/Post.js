const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
        immutable: true
    }, 
    type: {
        type: String,
        enum: ['lost', 'found'],
        required: true
    },
    title: {
        type: String, 
        required: true, 
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    postType: {
        type: String, 
        enum: ['lost', 'found'],
        required: true
    },
    category: {
        type: String, 
        enum: [
            'electronics',
            'jewelry', 
            'household', 
            'pet', 
            'clothing', 
            'keys',
            'other'
        ],
        default: 'other'
    },
    imageUrl: {
        type: String, 
        trim: true, 
        default: ''
    },
    location: {
        type: String, 
        required: true,
        trim: true
    },
    eventDate: {
        type: Date, 
        default: Date.now
    },
    status: {
        type: String,
        enum: ['open', 'pending', 'archived'],
        default: 'open'
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('Post', PostSchema);