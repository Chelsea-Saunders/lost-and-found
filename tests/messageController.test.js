const { test } = require('node:test');
const assert = require('node:assert/strict');
const Message = require('../src/models/Message');
const Claim = require('../src/models/Claim');
const Post = require('../src/models/Post');

const {
    createMessage,
    getMessagesByClaim,
    markMessageAsRead,
    deleteMessage
} = require('../src/controllers/messageControllers');

// Mock IDs
const postId = '507f1f77bcf86cd799439011';
const claimId = '507f1f77bcf86cd799439012';
const claimantId = '507f1f77bcf86cd799439013';
const ownerId = '507f1f77bcf86cd799439014';
const otherUserId = '507f1f77bcf86cd799439015';
const messageId = '507f1f77bcf86cd799439016';

const content = 'Can you describe the missing item?';

// Create mock request and response objects
function createMocks({
    userId = claimantId,
    params = { claimId, messageId },
    body = {},
    authenticated = true
} = {}) {
    const req = {
        params,
        user: authenticated ? { _id: userId } : undefined,
        body
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

    return { req, res };
}

// Create a mock claim
function createMockClaim() {
    return {
        _id: claimId,
        postId,
        userId: claimantId,
        status: 'pending'
    };
}

// Create a mock post
function createMockPost() {
    return {
        _id: postId,
        user: ownerId,
        status: 'found'
    };
}

// Create a mock message
function createMockMessage(readAt = null) {
    return {
        _id: messageId,
        claimId,
        senderId: claimantId,
        content,
        readAt
    };
}

// Mock claim and post lookups
function mockConversation(t) {
    t.mock.method(Claim, 'findById', async () => createMockClaim());
    t.mock.method(Post, 'findById', async () => createMockPost());
}

// CREATE MESSAGE TESTS

test('controller allows claimant to create a message', async (t) => {
    const { req, res } = createMocks({
        body: { content }
    });

    const message = createMockMessage();

    mockConversation(t);

    const create = t.mock.method(Message, 'create', async () => message);

    await createMessage(req, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, message);

    assert.deepEqual(create.mock.calls[0].arguments[0], {
        claimId,
        senderId: claimantId,
        content
    });
});

test('controller allows post owner to create a message', async (t) => {
    const { req, res } = createMocks({
        userId: ownerId,
        body: { content }
    });

    const message = {
        ...createMockMessage(),
        senderId: ownerId
    };

    mockConversation(t);

    const create = t.mock.method(Message, 'create', async () => message);

    await createMessage(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.senderId, ownerId);
    assert.equal(create.mock.calls[0].arguments[0].senderId, ownerId);
});

test('controller trims message content before saving', async (t) => {
    const { req, res } = createMocks({
        body: { content: `   ${content}   ` }
    });

    mockConversation(t);

    const create = t.mock.method(Message, 'create', async () => createMockMessage());

    await createMessage(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(create.mock.calls[0].arguments[0].content, content);
});

test('controller prevents unauthorized users from creating messages', async (t) => {
    const { req, res } = createMocks({
        userId: otherUserId,
        body: { content }
    });

    mockConversation(t);

    const create = t.mock.method(Message, 'create', async () => {});

    await createMessage(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(create.mock.callCount(), 0);
});

test('controller rejects unauthenticated message creation', async () => {
    const { req, res } = createMocks({
        authenticated: false,
        body: { content }
    });

    await createMessage(req, res);

    assert.equal(res.statusCode, 401);
});

test('controller rejects invalid claim IDs during message creation', async () => {
    const { req, res } = createMocks({
        params: { claimId: 'invalid-id' },
        body: { content }
    });

    await createMessage(req, res);

    assert.equal(res.statusCode, 400);
});

test('controller returns 404 when creating a message for a missing claim', async (t) => {
    const { req, res } = createMocks({
        body: { content }
    });

    t.mock.method(Claim, 'findById', async () => null);

    await createMessage(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Claim not found');
});

test('controller rejects missing message content', async () => {
    const { req, res } = createMocks();

    await createMessage(req, res);

    assert.equal(res.statusCode, 400);
});

test('controller rejects whitespace-only message content', async () => {
    const { req, res } = createMocks({
        body: { content: '   ' }
    });

    await createMessage(req, res);

    assert.equal(res.statusCode, 400);
});

test('controller rejects non-string message content', async () => {
    const { req, res } = createMocks({
        body: { content: 123 }
    });

    await createMessage(req, res);

    assert.equal(res.statusCode, 400);
});

test('controller rejects messages longer than 5000 characters', async () => {
    const { req, res } = createMocks({
        body: { content: 'a'.repeat(5001) }
    });

    await createMessage(req, res);

    assert.equal(res.statusCode, 400);
});

test('controller accepts messages with exactly 5000 characters after trimming', async (t) => {
    const longContent = 'a'.repeat(5000);

    const { req, res } = createMocks({
        body: { content: ` ${longContent} ` }
    });

    mockConversation(t);

    const create = t.mock.method(Message, 'create', async () => ({
        ...createMockMessage(),
        content: longContent
    }));

    await createMessage(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(create.mock.calls[0].arguments[0].content.length, 5000);
});

test('controller handles message model validation errors', async (t) => {
    const { req, res } = createMocks({
        body: { content }
    });

    mockConversation(t);

    t.mock.method(console, 'error', () => {});

    t.mock.method(Message, 'create', async () => {
        const error = new Error('Invalid message');
        error.name = 'ValidationError';
        throw error;
    });

    await createMessage(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Invalid message data');
});

// GET MESSAGES TESTS

test('controller retrieves claim messages in chronological order', async (t) => {
    const { req, res } = createMocks();
    const messages = [createMockMessage()];

    let capturedFilter;
    let capturedSort;
    let capturedLimit;

    mockConversation(t);

    t.mock.method(Message, 'find', (filter) => {
        capturedFilter = filter;

        return {
            sort: (sortOptions) => {
                capturedSort = sortOptions;

                return {
                    limit: async (limitValue) => {
                        capturedLimit = limitValue;
                        return messages;
                    }
                };
            }
        };
    });

    await getMessagesByClaim(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, messages);
    assert.deepEqual(capturedFilter, { claimId });
    assert.deepEqual(capturedSort, { createdAt: 1 });
    assert.equal(capturedLimit, 100);
});

test('controller allows post owner to retrieve messages', async (t) => {
    const { req, res } = createMocks({
        userId: ownerId
    });

    const messages = [createMockMessage()];

    mockConversation(t);

    t.mock.method(Message, 'find', () => ({
        sort: () => ({
            limit: async () => messages
        })
    }));

    await getMessagesByClaim(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, messages);
});

test('controller returns an empty array when no messages exist', async (t) => {
    const { req, res } = createMocks();

    mockConversation(t);

    t.mock.method(Message, 'find', () => ({
        sort: () => ({
            limit: async () => []
        })
    }));

    await getMessagesByClaim(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, []);
});

test('controller prevents unauthorized users from reading conversations', async (t) => {
    const { req, res } = createMocks({
        userId: otherUserId
    });

    mockConversation(t);

    const find = t.mock.method(Message, 'find', () => {});

    await getMessagesByClaim(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(find.mock.callCount(), 0);
});

test('controller rejects unauthenticated message retrieval', async () => {
    const { req, res } = createMocks({
        authenticated: false
    });

    await getMessagesByClaim(req, res);

    assert.equal(res.statusCode, 401);
});

test('controller rejects invalid claim IDs during message retrieval', async () => {
    const { req, res } = createMocks({
        params: { claimId: 'invalid-id' }
    });

    await getMessagesByClaim(req, res);

    assert.equal(res.statusCode, 400);
});

test('controller returns 404 when retrieving messages for a missing claim', async (t) => {
    const { req, res } = createMocks();

    t.mock.method(Claim, 'findById', async () => null);

    await getMessagesByClaim(req, res);

    assert.equal(res.statusCode, 404);
});

// MARK MESSAGE AS READ TESTS

test('controller allows recipient to mark a message as read', async (t) => {
    const { req, res } = createMocks({
        userId: ownerId
    });

    const message = createMockMessage();

    mockConversation(t);

    t.mock.method(Message, 'findById', async () => message);

    const update = t.mock.method(
        Message,
        'findOneAndUpdate',
        async (filter, changes) => ({
            ...message,
            readAt: changes.$set.readAt
        })
    );

    await markMessageAsRead(req, res);

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.readAt instanceof Date);

    assert.deepEqual(update.mock.calls[0].arguments[0], {
        _id: messageId,
        readAt: null
    });

    assert.deepEqual(update.mock.calls[0].arguments[2], {
        new: true,
        runValidators: true
    });
});

test('controller preserves an existing read timestamp', async (t) => {
    const { req, res } = createMocks({
        userId: ownerId
    });

    const originalReadAt = new Date('2026-11-21T12:00:00.000Z');
    const message = createMockMessage(originalReadAt);

    mockConversation(t);

    t.mock.method(Message, 'findById', async () => message);

    t.mock.method(Message, 'findOneAndUpdate', async () => null);

    await markMessageAsRead(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.readAt, originalReadAt);
});

test('controller prevents sender from marking their own message as read', async (t) => {
    const { req, res } = createMocks();

    mockConversation(t);

    t.mock.method(Message, 'findById', async () => createMockMessage());

    const update = t.mock.method(Message, 'findOneAndUpdate', async () => {});

    await markMessageAsRead(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Cannot mark your own message as read');
    assert.equal(update.mock.callCount(), 0);
});

test('controller prevents unauthorized users from marking messages as read', async (t) => {
    const { req, res } = createMocks({
        userId: otherUserId
    });

    mockConversation(t);

    t.mock.method(Message, 'findById', async () => createMockMessage());

    await markMessageAsRead(req, res);

    assert.equal(res.statusCode, 403);
});

test('controller rejects unauthenticated read requests', async () => {
    const { req, res } = createMocks({
        authenticated: false
    });

    await markMessageAsRead(req, res);

    assert.equal(res.statusCode, 401);
});

test('controller rejects invalid message IDs', async () => {
    const { req, res } = createMocks({
        params: { messageId: 'invalid-id' }
    });

    await markMessageAsRead(req, res);

    assert.equal(res.statusCode, 400);
});

test('controller returns 404 when message does not exist', async (t) => {
    const { req, res } = createMocks();

    t.mock.method(Message, 'findById', async () => null);

    await markMessageAsRead(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Message not found');
});

test('controller denies read access when associated claim is missing', async (t) => {
    const { req, res } = createMocks({
        userId: ownerId
    });

    t.mock.method(Message, 'findById', async () => createMockMessage());
    t.mock.method(Claim, 'findById', async () => null);

    await markMessageAsRead(req, res);

    assert.equal(res.statusCode, 403);
});

// DELETE MESSAGE TESTS

test('controller successfully deletes a message', async (t) => {
    const { req, res } = createMocks();

    req.message = createMockMessage();
    req.message.deleteOne = t.mock.fn(async () => {});

    await deleteMessage(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Message deleted');
    assert.equal(req.message.deleteOne.mock.callCount(), 1);
});

test('controller handles message deletion errors', async (t) => {
    const { req, res } = createMocks();

    t.mock.method(console, 'error', () => {});

    req.message = createMockMessage();
    req.message.deleteOne = async () => {
        throw new Error('Database error');
    };

    await deleteMessage(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Server error');
});

// SERVER ERROR TESTS

test('controller handles database errors during message creation', async (t) => {
    const { req, res } = createMocks({
        body: { content }
    });

    t.mock.method(console, 'error', () => {});

    t.mock.method(Claim, 'findById', async () => {
        throw new Error('Database error');
    });

    await createMessage(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Server error');
});

test('controller handles database errors during message retrieval', async (t) => {
    const { req, res } = createMocks();

    t.mock.method(console, 'error', () => {});

    t.mock.method(Claim, 'findById', async () => {
        throw new Error('Database error');
    });

    await getMessagesByClaim(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Server error');
});

test('controller handles database errors when marking messages as read', async (t) => {
    const { req, res } = createMocks();

    t.mock.method(console, 'error', () => {});

    t.mock.method(Message, 'findById', async () => {
        throw new Error('Database error');
    });

    await markMessageAsRead(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Server error');
});