const Joi = require('joi');

const itemSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .required(),

    description: Joi.string()
        .trim()
        .min(10)
        .max(2000)
        .required(),
    type: Joi.string()
        .valid('lost', 'found')
        .required(),
    category: Joi.string()
        .valid(
            'jewlry',
            'household',
            'pet',
            'clothing',
            'other'
        )
        .required(),
});

module.exports = { itemSchema };