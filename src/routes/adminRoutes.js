const express = require('express');
const router = express.Router();

const { ensureAuth, ensureAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminControllers');

router.get(
    '/users',
    ensureAuth,
    ensureAdmin,
    adminController.getAllUsers);

router.get(
    '/users/:id',
    ensureAuth,
    ensureAdmin,
    adminController.getUserById);

router.patch(
    '/users/:id/role',
    ensureAuth,
    ensureAdmin,
    adminController.updateUserRole);

module.exports = router;