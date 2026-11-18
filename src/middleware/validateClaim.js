const { validateRequest } = require("./validateRequest");
const { claimSchema } = require("../validators/claimSchemas");

const validateClaim = validateRequest(claimSchema);

module.exports = { validateClaim };
