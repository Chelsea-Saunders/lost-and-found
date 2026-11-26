const Joi = require('joi');

const postSearchSchema = Joi.object({
    search: Joi.string()
        .trim()
        .max(100)
        .optional(),

    category: Joi.string()
        .valid(
            'jewelry',
            'household',
            'pet',
            'clothing',
            'other'
        )
        .optional(),

    status: Joi.string()
        .valid('lost', 'found', 'returned')
        .optional(),

    startDate: Joi.date()
        .iso()
        .optional(),

    endDate: Joi.date()
        .iso()
        .when('startDate', {
            is: Joi.exist(),
            then: Joi.date().min(Joi.ref('startDate'))
        })
        .optional()
});

module.exports = { postSearchSchema };
