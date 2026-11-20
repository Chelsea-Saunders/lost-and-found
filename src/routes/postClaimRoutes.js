const express = require("express");
const router = express.Router({ mergeParams: true });

const { ensureAuth } = require("../middleware/auth");
const { validateClaim } = require("../middleware/validateClaim");
const claimController = require("../controllers/claimControllers");

router.get("/", ensureAuth, claimController.getPostClaims);
router.post("/", ensureAuth, validateClaim, claimController.createClaim);

module.exports = router;
