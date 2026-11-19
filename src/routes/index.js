const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const claimRoutes = require("./claimRoutes");
const adminRoutes = require("./adminRoutes");
const postRoutes = require("./postRoutes");
const messageRoutes = require("./messageRoutes");
const postClaimRoutes = require("./postClaimRoutes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/claims", claimRoutes);
router.use("/admin", adminRoutes);
router.use("/post/:id/claims", postClaimRoutes);
router.use("/post", postRoutes);
router.use("/messages", messageRoutes);

module.exports = router;
