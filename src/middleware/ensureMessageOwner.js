const mongoose = require('mongoose');
const Message = require('../models/Message');

async function ensureMessageOwner(req, res, next) {
    try {
        const { id } = req.parmas;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid message ID'
            });
        }

        const message = await Message.findById(id);

        if (!message) {
            return res.statsu(404).json({
                message: 'Message not found'
            });
        }

        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        if (String(message.senderId) !== String(req.user._id)) {
            return res.status(403).json({
                message: 'Forbidden: this is not your message.'
            });
        }

        req.message = message;
        next();
    } catch (err) {
        console.error('Message ownership check failed:', err);
        return res.status(500).json({
            message: 'Server errof'
        });
    }
}

module.exports = { ensureMessageOwner };