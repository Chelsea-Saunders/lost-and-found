const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../middleware/auth');
const { ensurePostOwner } = require('../middleware/ensurePostOwner');
const { updateStatus } = require('../controllers/updateStatusController');

const { 
    validateCreatePost,
    validateUpdatePost,
    validateSearchPosts
} = require('../middleware/validatePost');

const postController = require('../controllers/postControllers');

router.get(
    '/', 
    validateSearchPosts,
    postController.getAllPosts);
router.get(
    '/:id', 
    postController.getPostById);
router.post(
    '/', 
    ensureAuth, 
    validateCreatePost, 
    postController.createPost);

router.put(
    '/:id', 
    ensureAuth, 
    ensurePostOwner, 
    validateUpdatePost, 
    postController.updatePost);
router.delete(
    '/:id', 
    ensureAuth, 
    ensurePostOwner, 
    postController.deletePost);

router.patch(
    '/:id/status', 
    ensureAuth, 
    ensurePostOwner, 
    validateUpdatePost,
    updateStatus
);

module.exports = router;