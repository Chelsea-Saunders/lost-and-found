const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Post = require('../models/Post');

const ensurePostOwnerOrAdmin = async (req, res, next) => {
    try {
        if(!req.user) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        if(!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid claim ID'
            });
        }

        const claim = await Claim.findById(req.params.id);

        if(!claim) {
            return res.status(404).json({
                message: 'Claim not found'
            });
        }

        const post = await Post.findById(claim.postId);

        if(!post) {
            return res.status(404).json({
                message: 'Associated post not found'
            });
        }

        const isPostOwner = 
            String(post.userId) === String(req.user._id);

        const isAdmin = req.user.role === 'Admin';

        if(!isPostOwner && !isAdmin) {
            return res.status(403).json({
                message: 'Only the post owner or admain can change claim status'
            });
        }

        req.claim = claim;
        req.post = post;

        next();
        
    } catch(err) {
        console.error(err);
        next(err);
    }
};

module.exports = { ensurePostOwnerOrAdmin };