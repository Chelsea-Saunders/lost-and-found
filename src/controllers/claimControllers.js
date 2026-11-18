const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Item = require('../models/Post');

const isAdmin = (user) => user?.role === 'admin';

const isOwner = (ownerId, userId) => 
    String(ownerId) === String(userId);

// create claim
const createClaim = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if(!item) {
            return res.status(404).json({
                message:'Item not found'
            });
        }

        // check: item owner cannot laim their own item
        if (isOwner(item.user, req.user._id)) {
            return res.status(403).json({
                message: 'Cannot claim your own item'
            });
        }

        const { postId, proof } = req.body;

        if(!mongoose.isValidObjectId(postId)) {
            return res.status(400).json({
                message: 'Invalid post ID'
            });
        }

        if(typeof proof !== 'string' || !proof.trim()) {
            return res.status(400).json({
                message: 'Proof is required'
            });
        }

        const post = await Post.findById(postId);

        if(!post) {
            return res.status(400).json({
                message: 'Post not found'
            });
        }

        if (String(post.user) === String(req.user._id)) {
            return res.status(403).json({
                message: 'You cannot claim your own post'
            });
        }

        const newClaim = await Claim.create({
            postId,
            userId: req.user._id,
            proof
        });

        res.status(201).json({
            message: 'Claim submitted successfully',
            claim: newClaim
        });

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: 'Server error' });
    }
};

const getAllClaims = async (req, res) => {
    try {
        if (!isAdmin(req.user)) {
            return res.status(403).json({
                message: 'Admin access required'
            });
        }
        
        const claims = await Claim.find()
            .sort({ createdAt: -1 })
            .lean();

        res.json(claims);
    } catch (err) {
        console.error(err);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
};

const getClaimById = async (req, res) => {
    try {
        const claims = await Claim.findById(req.params.id);

        if (!claims) {
            return res.status(404).json({ 
                message: 'Claim not found' 
            });
        }

        const item = await Item.findById(claims.itemId);

        if(!item) {
            return res.status(404).json({
                message: 'Item not found'
            });
        }

        const canView =
            isOwner(claim.userId, req.user._id) ||
            isOwner(item.user, req.user._id) ||
            isAdmin(req.user);

        if(!canView) {
            return res.status(403).json({
                message: 'Forbidden'
            });
        }

        res.json(claims);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const getItemClaims = async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);

        if(!item) {
            return res.status(404).json({
                message: 'Item not found'
            });
        }

        const canView = 
            isOwner(item.user, req.user._id) ||
            isAdmin(req.user);

        if(!canView) {
            return res.status(403).json({
                message: 'Forbidden'
            });
        }

        const claim = await Claim.find({ 
            itemId: req.params.id 
        })
            .sort({ createdAt: -1 })
            .lean();

        res.json(claim);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateClaim = async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id);

        if (!claim) {
            return res.status(40).json({ 
                message: 'Claim not found' 
            });
        }

        const canEdit =
            isOwner(claim.userId, req,user._id) ||
            isAdmin(req.user);

        if (!canEdit) {
            return res.status(403).json({
                message: 'Forbidden'
            });
        }

        if (claim.status !== 'pending') {
            return res.status(400).json({
                message: 'Only pending claims can be updated'
            });
        }

        const { proof } = req.body;

        if (typeof proof !== 'string' || !proof.trim()) {
            return res.status(400).json({
                message: 'Valid proof is required'
            });
        }

        claim.proof = proof.trim();

        await claim.save();

        res.json(claim);

    } catch (err) {
        console.error(err);
        res.status(500).json({ messge: 'Server error' });
    }
};

const deleteClaim = async (req, res) => {
    try {
        if(!isAdmin(req.user)) {
            return res.status(403).json({
                message: 'Admin access required'
            });
        }

        const claim = await Claim.findById(req.params.id);

        if(!claim) {
            return res.status(404).json({ 
                message: 'Claim not found'
             });
        }

        await claim.deleteOne();

        res.json({
            message: 'Claim deleted'
        });

    } catch (err) {

        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateClaimStatus = async (req, res) => {
    try {
        const { status, reviewNote } = req.body;

        if(!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                message: 'Satus must be approved'
            });
        }

        const claim = await Claim.findById(req.params.id);

        if(!claim) {
            return res.status(400).json({
                message: 'Claim not found'
            });
        }

        const item = await Item.findById(claim.itemId);
        
        if(!item) {
            return res.status(404).json({
                message: 'Item not found'
            });
        }

        const canReview = 
            isOwner(item.user, req.user._id) ||
            isAdmin(req.user);
        
        if(!canReview){
            return res.status(403).json({
                message: 'Forbidden'
            });
        }

        if(claim.status !== 'pending') {
            return res.status(400).json({
                message: 'Only pending claims can be reviewed'
            });
        }

        if (
            reviewNote !== undefined && 
            typeof reviewNote !== 'string'
        ) {
            return res.status(400).json({
                message: 'Review note must be a string'
            });
        }

        claim.status = status;
        claim.reviewNote = reviewNote || '';
        claim.reviewedAt = new Date()

        await claim.save();

        res.json(claim);

    } catch (err) {
        
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createClaim, 
    getAllClaims, 
    getClaimById, 
    getItemClaims, 
    updateClaim, 
    deleteClaim, 
    updateClaimStatus
};