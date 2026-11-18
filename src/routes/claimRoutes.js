const express = require('express');
const router = express.Router();

const { ensureAuth, ensureAdmin } = require('../middleware/auth');
const { ensureClaimOwner } = require('../middleware/ensureClaimOwner');
const { ensurePostOwnerOrAdmin } = require('../middleware/ensurePostOwnerOrAdmin');

const claimController = require('../controllers/claimControllers');

router.get(
    '/', 
    ensureAuth, 
    ensureAdmin,
    claimController.getAllClaims);
router.get(
    '/:id', 
    ensureAuth, 
    claimController.getClaimById);
router.put(
    '/:id', 
    ensureAuth, 
    ensureClaimOwner, 
    claimController.updateClaim);
router.delete(
    '/:id', 
    ensureAuth, 
    ensureAdmin,
    ensureClaimOwner, 
    claimController.deleteClaim);
router.patch(
    '/:id/status', 
    ensureAuth, 
    ensurePostOwnerOrAdmin, 
    claimController.updateClaimStatus);

module.exports = router;