const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const Message = require('../models/Message');

// fields safe to return from user endpoints
const publicFields = 'name email role createdAt';

const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select(publicFields)
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(user);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
};

const updateMyProfile = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: req.profileUpdates },
            { new: true, runValidators: true },
        ).select(publicFields).lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(user);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Email address is already in use' });
        }
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Invalid profile data' });
        }
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
};

const deleteMyAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select(publicFields)
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin' && await User.countDocuments({ role: 'admin' }) <= 1) {
            return res.status(409).json({ message: 'Cannot delete the last administrator' });
        }

        const relatedRecords = await Promise.all([
            Post.exists({ user: user._id }),
            Item.exists({ userId: user._id }),
            Claim.exists({ $or: [{ userId: user._id }, { reviewedBy: user._id }] }),
            Message.exists({ senderId: user._id }),
        ]);

        if (relatedRecords.some(Boolean)) {
            return res.status(409).json({
                message: 'Cannot delete account while related records exist',
            });
        }

        // End the session before deleting the account, so session failures leave it intact.
        await new Promise((resolve, reject) => {
            req.logout(err => err ? reject(err) : resolve());
        });
        if (req.session) {
            await new Promise((resolve, reject) => {
                req.session.destroy(err => err ? reject(err) : resolve());
            });
        }

        const deletedUser = await User.findByIdAndDelete(user._id);
        res.clearCookie('connect.sid');

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'Account deleted' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
};

// get all users
const getAllUsers = async(req, res) => {
    try {
        if(req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Admin access required'
            });
        }

        const user = await User.find() 
            .select(publicFields)
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json(user);

    } catch (err) {

        console.error(err);
        res.status(500).json({ 
            message: 'Server error'
         });
    }
};

// get user by id
const getUserById = async(req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid user ID'
            });
        }

        const isSelf = 
            String(req.user._id) === req.params.id;
            
        const isAdmin = req.user.role === 'admin';

        if (!isSelf && !isAdmin) {
            return res.status(403).json({
                message: 'Forbidden'
            });
        }

        const user = await User.findById(req.params.id)
            .select(publicFields)
            .lean();

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        res.status(200).json(user);

    } catch (err) {

        console.error(err);
        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid user ID'
            });
        }

        res.status(500).json({ message: 'Server error' });
    }
};

// edit user role
const updateUserRole = async (req, res) => {
    try {
        // admin only can change
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Admin access required'
            });
        }

        const { role } = req.body;

        // validate requested role
        if(!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                message: 'Role must be user or admin'
            });
        }

        // validate mongodb id
        if(!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid user ID'
            });
        }

        const user = await User.findByIdI(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // no update needed if role didn't change
        if(user.role === newRole) {
            return res.status(200).json({
                message: 'User already has this role'
            });
        }

        // prevent removing the last admin
        if(user.role === 'admin' && newrole === 'user') {
            const adminCount = await User.countDocuments({
                role: 'admin'
            });

            if (adminCount <=  1) {
                return res.status(409).json({
                    message: 'Cannot demote the last admin'
                });
            }
        }
        const previousRole = user.role;

        //update role
        user.role = newRole;
        await user.save();

        // log role change
        console.info('User role changed', {
            performedBy: String(req.user._id),
            targetUser: String(user._id),
            previousRole,
            newRole,
            changedAd: new Date().toISOString()
        });

        res.status(200).json({
            message: 'User role updated successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {

        console.error(err);

        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid user ID'
            });
        }

        res.status(500).json({ 
            message: 'Server error' 
        });
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    deleteMyAccount,
    getAllUsers, 
    getUserById,
    updateUserRole
}
