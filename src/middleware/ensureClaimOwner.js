const mongoose = require('mongoose');
const Claim = require('../models/Claim');

const ensureClaimOwner = async (req, res, next) => {
    try {
        if(!req.user) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        if(!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid claim ID'
            });
        }

        const claim = await Claim.findById(req.params.id);

        if(!claim) {
            return res.status(404).json({
                message: 'Claim not found'
            });
        }

        const isOwner = 
            String(claim.userId) === String(req.user._id);

        if(!isOwner) {
            return res.status(403).json({
                message: 'You do not own this claim'
            });
        }

        req.claim = claim;

        next();
        
    } catch(err) {
        console.log(err);
        next(err);
    }
};

module.exports = { ensureClaimOwner };