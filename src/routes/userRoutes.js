const express = require('express');
const router = express.Router();

const { 
    ensureAuth, 
    ensureAdmin 
} = require('../middleware/auth');

const userController = require('../controllers/userControllers');
const { validateProfileUpdate } = require('../middleware/validateUser');

// Register literal self-service paths before /:id.
router.get('/me', ensureAuth, userController.getMyProfile);
router.put('/me', ensureAuth, validateProfileUpdate, userController.updateMyProfile);
router.delete('/me', ensureAuth, userController.deleteMyAccount);

router.get(
    '/', 
    ensureAuth, 
    ensureAdmin, 
    userController.getAllUsers);
router.get(
    '/:id', 
    ensureAuth, 
    userController.getUserById);
router.patch(
    '/:id/role', 
    ensureAuth, 
    ensureAdmin, 
    userController.updateUserRole);

module.exports = router;
