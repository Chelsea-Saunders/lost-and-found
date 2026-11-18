const mongoose = require('mongoose');
const Post = require("../models/Post");

async function ensurePostOwner(req, res, next) {
  try {
    const { id } = req.params;

    if(!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
            message: 'invalid post ID'
        });
    }
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found"
        });
    }

    if (!req.user) {
        return res.status(401).json({
            message: 'Authentication required'
        });

    }
    // admins: bypass ownership check
    if (String(post.user) !== String(req.user._id)) {
        return res.status(403).json({
            message: 'Forbidden: This is not your post.'
        });
    }

    req.post = post; // pass post to middleware/controller
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { ensurePostOwner };
