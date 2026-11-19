const express = require("express");
const router = express.Router();

const { ensureAuth, ensureAdmin } = require("../middleware/auth");
const {
  validateClaim,
  validateClaimStatus,
} = require("../middleware/validateClaim");

const claimController = require("../controllers/claimControllers");

router.get("/", ensureAuth, ensureAdmin, claimController.getAllClaims);
router.get("/:id", ensureAuth, claimController.getClaimById);
router.put("/:id", ensureAuth, validateClaim, claimController.updateClaim);
router.delete("/:id", ensureAuth, claimController.deleteClaim);
router.patch(
  "/:id/status",
  ensureAuth,
  validateClaimStatus,
  claimController.updateClaimStatus,
);

module.exports = router;
