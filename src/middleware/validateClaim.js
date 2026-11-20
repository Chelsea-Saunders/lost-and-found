const { validateRequest } = require("./validateRequest");
const {
  claimSchema,
  claimStatusSchema,
} = require("../validators/claimSchemas");

const validateClaim = validateRequest(claimSchema);
const validateClaimStatus = validateRequest(claimStatusSchema);

module.exports = { validateClaim, validateClaimStatus };
