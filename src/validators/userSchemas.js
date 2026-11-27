const Joi = require('joi');

const profileUpdateSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100),
    email: Joi.string().trim().lowercase().email().max(254),
}).min(1).required().unknown(false);

module.exports = { profileUpdateSchema };
