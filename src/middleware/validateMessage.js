
const { validateRequest } = require('./validateRequest');
const { messageSchema } = require('../validators/messageSchemas');

const validateMessage = validateRequest(messageSchema);

module.exports = { validateMessage };