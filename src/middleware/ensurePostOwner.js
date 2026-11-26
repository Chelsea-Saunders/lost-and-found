const mongoose = require('mongoose');
const Post = require("../models/Post");

async function ensurePostOwner(req, res, next) {
  try {
    // check if user is authenticated
    if (!req.user) {
        return res.statu(401).json({
            message: 'Authentication required'
        });
    }

    const { id } = req.params;

    if(!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: 'invalid post ID'
        });
    }
    const post = await Post.findById(id);

    // check if post exists
    if (!post) {
      return res.status(404).json({
        message: "Post not found"
        });
    }

    // admins: bypass ownership check
    if (
        req.user.role !== 'admin' && 
        String(post.userId) !== String(req.user._id)
    ) {
        return res.status(403).json({
            message: 'Forbidden: This is not your post'
        });
    }

    req.post = post; // pass post to middleware/controller
    next();

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
        message: "Server error" 
    });
  }
}

module.exports = { ensurePostOwner };
