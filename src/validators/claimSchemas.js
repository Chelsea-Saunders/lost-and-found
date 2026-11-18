const Joi = require("joi");

const claimSchema = Joi.object({
  proof: Joi.string().trim().min(10).max(1000).required(),
});

const claimStatusSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),

  reviewNote: Joi.string().trim().max(1000).optional(),
});

module.exports = {
  claimSchema,
  claimStatusSchema,
};
