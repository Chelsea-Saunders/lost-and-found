const Post = require('../models/Post');

const getAllPosts = async (req, res) => {
    try {
        const {
            search,
            category,
            status,
            startDate,
            endDate
        } = req.searchFilters || {};

        const filter = {};

        // search by keyword
        if (search) {
            const escapedSearch = search.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&'
            );

            filter.$or = [
                { title: { $regex: escapedSearch, $options: 'i' } },
                { content: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        // filter by category
        if (category) {
            filter.category = category;
        }

        // filter by status
        if (status) {
            filter.status = status;
        }

        // filter by post created date
        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                filter.createdAt.$gte = startDate;
            }

            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setUTCHours(23, 59, 59, 999);
                filter.createdAt.$lte = endOfDay;
            }
        }
        const posts = await Post.find(filter).sort({ createdAt: -1 });

        res.json(posts);

    } catch (err) {

        console.error(err);
        res.status(500).json({
            message: 'Server error'
        });
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
        const { title, description, type, imageUrl, category, location, eventDate, status } = req.body;

        // only allow lost or found when post is created
        if (status !== undefined && 
            !['lost', 'found'].includes(status)) {
            return res.status(400).json({
                message: 'Status must be lost or found'
            });
        }

        const newPost = await Post.create({
            userId: req.user._id,
            title,
            description,
            type,
            imageUrl,
            category,
            location,
            eventDate,
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
            !['lost', 'found', 'archived'].includes(status)) {
                return res.status(400).json({
                    message: 'Invalid status'
                });
            }

        const post = req.post; //loads the middleware

        if(title !== undefined) {
            post.title = title;
        }
        if(content !== undefined) {
            post.content = content;
        }
        if (category !== undefined) {
            post.category = category;
        }
        if (status !== undefined) {
            post.status = status;
        }

        await post.save();

        res.json(post);

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