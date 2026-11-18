const Post = require('../models/Post');

const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const createPost = async (req, res) => {
     try {
        const { title, content, category, status } = req.body;

        // only allow lost or found when post is created
        if (status !== undefined && 
            !['lost', 'found'].includes(status)) {
            return res.status(400).json({
                message: 'Status must be lost or found'
            });
        }

        const newPost = await Post.create({
            user: req.user._id,
            title,
            content,
            category,
            status
        });

        res.status(201).json(newPost);
     } catch (err) {
        console.error(err);

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: err.message
            });
        }
        res.status(500).json({ 
            message: 'Server error' 
        });
     }
};

const updatePost = async (req, res) => {
    try {
        const { title, content, category, status } = req.body;
        if (status !== undefined && 
            !['lost', 'found', 'returned'].includes(status)) {
                return res.status(400).json({
                    message: 'Invalid status'
                });
            }

        const item = req.item; //loads the middleware

        if(title !== undefined) {
            item.title = title;
        }
        if(content !== undefined) {
            item.content = content;
        }
        if (category !== undefined) {
            item.category = category;
        }
        if (status !== undefined) {
            item.status = status;
        }

        await item.save();

        res.json(item);

    } catch (err) {
        console.error(err);

        if(err.name === 'ValidationError') {
            return res.status(400).json({
                message: err.message
            });
        }
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
};

const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        if (String(post.userId) !== String(req.user._id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await Post.findByIdAndDelete(req.params.id);

        res.json({ message: 'Post deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAllPosts, 
    getPostById, 
    createPost, 
    updatePost, 
    deletePost
}