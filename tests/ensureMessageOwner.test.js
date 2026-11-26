const { test } = require('node:test');
const assert = require('node:assert/strict');
const Message = require('../src/models/Message');

const {
    ensureMessageOwner
} = require('../src/middleware/ensureMessageOwner');

// Mock IDs
const messageId = '507f1f77bcf86cd799439016';
const senderId = '507f1f77bcf86cd799439013';
const otherUserId = '507f1f77bcf86cd799439014';

// Create mock request and response objects
function createMocks(t, {
    id = messageId,
    userId = senderId,
    authenticated = true
} = {}) {
    const req = {
        params: { id },
        user: authenticated ? { _id: userId } : undefined
    };

    const res = {
        statusCode: 200,
        body: undefined,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(data) {
            this.body = data;
            return this;
        }
    };

    const next = t.mock.fn();

    return { req, res, next };
}

// Create a mock message
function createMockMessage() {
    return {
        _id: messageId,
        senderId,
        content: 'Can you describe the missing item?'
    };
}

// Test successful ownership verification
test('middleware allows the sender to access their own message', async (t) => {
    const { req, res, next } = createMocks(t);
    const message = createMockMessage();

    const findById = t.mock.method(
        Message,
        'findById',
        async () => message
    );

    await ensureMessageOwner(req, res, next);

    assert.equal(res.statusCode, 200);
    assert.equal(req.message, message);
    assert.equal(next.mock.callCount(), 1);
    assert.equal(findById.mock.calls[0].arguments[0], messageId);
});

// Test unauthorized ownership
test('middleware prevents other users from accessing the message', async (t) => {
    const { req, res, next } = createMocks(t, {
        userId: otherUserId
    });

    t.mock.method(Message, 'findById', async () => createMockMessage());

    await ensureMessageOwner(req, res, next);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Forbidden: this is not your message.');
    assert.equal(req.message, undefined);
    assert.equal(next.mock.callCount(), 0);
});

// Test invalid message ID
test('middleware rejects invalid message IDs', async (t) => {
    const { req, res, next } = createMocks(t, {
        id: 'invalid-id'
    });

    const findById = t.mock.method(Message, 'findById', async () => null);

    await ensureMessageOwner(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Invalid message ID');
    assert.equal(findById.mock.callCount(), 0);
    assert.equal(next.mock.callCount(), 0);
});

// Test missing message
test('middleware returns 404 when the message does not exist', async (t) => {
    const { req, res, next } = createMocks(t);

    t.mock.method(Message, 'findById', async () => null);

    await ensureMessageOwner(req, res, next);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Message not found');
    assert.equal(next.mock.callCount(), 0);
});

// Test missing authentication
test('middleware rejects unauthenticated users', async (t) => {
    const { req, res, next } = createMocks(t, {
        authenticated: false
    });

    t.mock.method(Message, 'findById', async () => createMockMessage());

    await ensureMessageOwner(req, res, next);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Authentication required');
    assert.equal(next.mock.callCount(), 0);
});

// Test database error handling
test('middleware returns 500 when a database error occurs', async (t) => {
    const { req, res, next } = createMocks(t);

    t.mock.method(console, 'error', () => {});

    t.mock.method(Message, 'findById', async () => {
        throw new Error('Database error');
    });

    await ensureMessageOwner(req, res, next);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Server error');
    assert.equal(next.mock.callCount(), 0);
});