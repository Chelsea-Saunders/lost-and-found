const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
    validateMessage
} = require('../src/middleware/validateMessage');

// Create mock request and response objects
function createMocks(t, body = {}) {
    const req = { body };

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

// Test valid message content
test('middleware accepts valid message content', (t) => {
    const { req, res, next } = createMocks(t, {
        content: 'Can you describe the missing item?'
    });

    validateMessage(req, res, next);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body, undefined);
    assert.equal(next.mock.callCount(), 1);
});

// Test missing content
test('middleware rejects missing message content', (t) => {
    const { req, res, next } = createMocks(t);

    validateMessage(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.includes('"content" is required'));
    assert.equal(next.mock.callCount(), 0);
});

// Test empty content
test('middleware rejects empty message content', (t) => {
    const { req, res, next } = createMocks(t, {
        content: ''
    });

    validateMessage(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.equal(next.mock.callCount(), 0);
});

// Test whitespace-only content
test('middleware rejects whitespace-only message content', (t) => {
    const { req, res, next } = createMocks(t, {
        content: '   '
    });

    validateMessage(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.equal(next.mock.callCount(), 0);
});

// Test non-string content
test('middleware rejects non-string message content', (t) => {
    const { req, res, next } = createMocks(t, {
        content: 123
    });

    validateMessage(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.equal(next.mock.callCount(), 0);
});

// Test excessive content length
test('middleware rejects messages longer than 5000 characters', (t) => {
    const { req, res, next } = createMocks(t, {
        content: 'a'.repeat(5001)
    });

    validateMessage(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.equal(next.mock.callCount(), 0);
});

// Test maximum length after trimming
test('middleware accepts 5000 characters after trimming', (t) => {
    const { req, res, next } = createMocks(t, {
        content: `   ${'a'.repeat(5000)}   `
    });

    validateMessage(req, res, next);

    assert.equal(res.statusCode, 200);
    assert.equal(next.mock.callCount(), 1);
});

// Test unexpected request fields
test('middleware rejects unexpected message fields', (t) => {
    const { req, res, next } = createMocks(t, {
        content: 'This is a valid message.',
        senderId: '507f1f77bcf86cd799439013'
    });

    validateMessage(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.ok(res.body.errors.includes('"senderId" is not allowed'));
    assert.equal(next.mock.callCount(), 0);
});

// Test multiple validation errors
test('middleware returns multiple validation errors', (t) => {
    const { req, res, next } = createMocks(t, {
        content: '',
        senderId: '507f1f77bcf86cd799439013',
        readAt: '2026-11-21T12:00:00.000Z'
    });

    validateMessage(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.equal(res.body.errors.length, 3);
    assert.equal(next.mock.callCount(), 0);
});