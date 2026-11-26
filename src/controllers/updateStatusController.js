const updateStatus = async (req, res) => {
  try {
    const item = req.post; // loaded by ensurePostOwner middleware
    const { status } = req.body;

    const allowedStatus = ["lost", "found", "returned"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${allowedStatus.join(", ")}`,
      });
    }
    item.status = status;
    await item.save();

    res.json({
      message: "Status updated successfully",
      item,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { updateStatus };
