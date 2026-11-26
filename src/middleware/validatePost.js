const { postSearchSchema } = require('../validators/postSearchSchema');

const validCategories = [
    'jewelry',
    'household',
    'pet',
    'clothing',
    'other'
];

const validStatuses = ['lost', 'found', 'returned'];

function validateCreatePost(req, res, next) {
    const { title, content, category, status } = req.body;

    if (
        typeof title !== 'string' ||
        !title.trim() ||
        typeof content !== 'string' ||
        !content.trim()
    ) {
        return res.status(400).json({
            message: 'Title and content are required'
        });
    }

    if (
        category !== undefined && 
        !validCategories.includes(category)
    ) {
        return res.status(400).json({
            message: 'Invalid category'
        });
    }

    if (
        status !== undefined &&
        !['lost', 'found'].includes(status)
    ) {
        return res.status(400).json({
            message: 'Status must be lost or found'
        });
    }
    next();
}

function validateUpdatePost(req, res, next) {
    const { title, content, category, status } = req.body;

    if(
        title !== undefined && 
        (typeof title !== 'string' || !title.trim())
    ) {
        return res.status(400).json({
            message: 'Title cannot be empty'
        });
    }

    if(
        content !== undefined &&
        (typeof content !== 'string' || !content.trim())
    ) {
        return res.status(400).json({
            message: 'Content cannot be empty'
        });
    }

    if (
        category !== undefined && 
        !validCategories.includes(category)
    ) {
        return res.status(400).json({
            message: 'Invalid category'
        });
    }

    if (
        category !== undefined &&
        !validStatuses.includes(status)
    ) {
        return res.status(400).json({
            message: 'Invalid status'
        });
    }

    next();
}

function validateSearchPosts(req, res, next) {
    const { error, value } = postSearchSchema.validate(
        req.query,
        { abortEarly: false }
    );

    if (error) {
        return res.status(400).json({
            message: 'Validation error',
            errors: error.details.map((d) => d.message)
        });
    }

    req.searchFilters = value;
    next();
}

module.exports = {
    validateCreatePost,
    validateUpdatePost,
    validateSearchPosts
};