const Joi = require('joi');

const postSchema = Joi.object({
    title: Joi.string()
        .valid('lost', 'found')
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
            'jewelry',
            'household',
            'pet',
            'clothing',
            'electronics',
            'keys',
            'other'
        )
        .required(),
    imageUrl: Joi.string()
        .uri({ scheme: ['http', 'https' ] })
        .allow('', null)
        .optional(),
    location: Joi.String()
        .trim()
        .required(),
    eventDate: Joi.Date()
        .iso()
        .required(),
    status: Joi.string()
        .valid('open', 'pending', 'archived')
        .default('open')
});

const updatePostSchema = postSchema
    .fork(
        [
            'title',
            'type',
            'category',
            'imageUrl',
            'location', 
            'eventDate',
            'userId',
            'status',
        ],
        (schema) => schema.optional()
    )
    .min(1)
    .prefs({ noDefaults: true });

module.exports = { 
    postSchema,
    updatePostSchema 
};