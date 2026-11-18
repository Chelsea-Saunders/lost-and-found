const mongoose = require('mongoose');
const Message = require('../models/Message');
const Claim = require('../models/Claim');

const Post = require('../models/Post');

// check claim permission
const canAccessClaim = async (claim, userId) => {
    if (isClaimant) {
        return true;
    }
    const post = await Post.findById(clain.postId);

    if (!post) {
        return false;
    }

    const isPostOwner = String(post.userId) === String(userId);
    return isPostOwner;
};


// create new message
const createMessage = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { claimId } = req.params;
        const { content } = req.body

        if (!userId) {
            return res.status(401).json({ 
                message: 'Authentication required' 
            });
        }

        if (!mongoose.isValidObjectId(claimId)) {
            return res.status(400).json({
                message: 'Invalid claim Id'
            });
        }
        // validate message content
        if(
            typeof content !== 'string' ||
            !content.trim() ||
            content.length > 5000
        ) {
            return res.status(400).json({
                message: 'Message must contain 1-5000 characters'
            });
        }
        const claim = await Claim.findById(claimId);

        if(!claim) {
            return res.status(400).json({
                message: 'Claim not found'
            });
        }

        if (!(await canAccessClaim(claim, userId))) {
            return res.status(403).json({
                message: 'Access Denied'
            });
        }

        const message = await Message.create({
            claimId,
            senderId: userId,
            content: content.trim()
        });

        return res.status(201).json(message);

    } catch (err) {
        console.error('Create message error', err);

        if (err.name === 'ValidatorError') {
            return res.status(400).json({
                message: 'Invalid message data'
            });
        }
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
};

// messages for claim
const getMessagesByClaim = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { claimId } = req.params;

        if (!userId) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        if (!mongoose.isValidObjectId(claimId)) {
            return res.status(400).json({
                message: 'Invalid claim Id'
            });
        }

        const claim = await Claim.findById(claimId);

        if(!claim) {
            return res.status(404).json({
                message: 'Claim not found'
            });
        }

        if (!canAccessClaim(claim, userId)) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        const messages = await Message.find({ claimId })
            .sort({ createdAt: 1 })
            .limit(100);

        return res.status(200).json(messages);
    } catch (err) {
        console.error('Get messages error:', err);

        return res.status(500).json({
            message: 'Server error'
        });
    }
};

// mark message as read
const markMessageAsRead = async (req, res) => {
     try {
        const userId = req.user?._id;
        const { messageId } = req.params;

        if(!userId) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        if (!mongoose.isValidObjectId(messageId)) {
            return res.status(400).json({
                message: 'Invalid message ID'
            });
        }

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                message: 'Message not found'
            });
        }

        const claim = await Claim.findById(message.claimId) 

        if (!claim || !(await canAccessClaim(claim, userId))) {
            return res.status(403).json({
                message: 'Access denied'
            });
        }

        // sender can mark message as read
        if (message.senderId.toString() === userId.toString()) {
            return res.status(403).json({
                message: 'Cannot mark your own message as read'
            });
        }

        // only set readAt the first time
        const updateMessage = await Message.findOneAndUpdate(
            {
                _id: messageId,
                readAt: null
            },
            {
                $set: { readAt: new Date() }
            },
            {
                new: true,
                runValidators: true
            }
        );
        return res.status(200).json(
            updateMessage || message
        );
    } catch (err) {
        console.error('Mark read error:', err);

        return res.status(500).json({
            message: 'Server error'
        });
     }
};

module.exports = {
    createMessage,
    getMessagesByClaim,
    markMessageAsRead
}