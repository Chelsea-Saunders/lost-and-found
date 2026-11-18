const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../middleware/auth');
const messageController = require('../controllers/messageControllers');

router.get(
    '/claim/:claimId',
    ensureAuth,
    messageController.getMessagesByClaim);
router.patch(
    '/:messageId/read',
    ensureAuth,
    messageController.markMessageAsRead);
router.post(
    '/claim/:claimId',
    ensureAuth,
    messageController.createMessage);

module.exports = router;