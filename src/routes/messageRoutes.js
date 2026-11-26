const express = require('express');
const router = express.Router();

const { ensureAuth } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validateMessage');
const { ensureMessageOwner } = require('../middleware/ensureMessageOwner');
const messageController = require('../controllers/messageControllers');

router.get(
    '/claim/:claimId',
    ensureAuth,
    messageController.getMessagesByClaim
);
router.patch(
    '/:messageId/read',
    ensureAuth,
    messageController.markMessageAsRead
);
router.post(
    '/claim/:claimId',
    ensureAuth,
    validateMessage,
    messageController.createMessage
);
// delete route
router.delete(
    '/:id',
    ensureAuth,
    ensureMessageOwner,
    messageController.deleteMessage
);

module.exports = router;