const mongoose = require('mongoose');
const User = require('../models/User');

// fields safe to return from user endpoints
const publicFields = 'name email role createdAt';

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
    getAllUsers, 
    getUserById,
    updateUserRole
}