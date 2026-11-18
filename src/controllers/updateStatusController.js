const updateStatus = async (req, res) => {
    try {
        const post = req.post; // loaded by ensurePostOwner middleware
        const { status } = req.body;

        const allowedStatus = ['open', 'pending', 'archived'];

        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${allowedStatus.join(', ')}`
            });
        }
        post.status = status;
        await post.save();

        res.json({
            message: 'Status updated successfully', 
            post
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { updateStatus };