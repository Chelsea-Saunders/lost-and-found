const { profileUpdateSchema } = require('../validators/userSchemas');

function validateProfileUpdate(req, res, next) {
    const { error, value } = profileUpdateSchema.validate(req.body, {
        abortEarly: false,
    });

    if (error) {
        return res.status(400).json({
            message: 'Validation error',
            errors: error.details.map(detail => detail.message),
        });
    }

    req.profileUpdates = value;
    next();
}

module.exports = { validateProfileUpdate };
