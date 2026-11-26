const { test } = require('node:test');
const assert = require('node:assert/strict');
const { messageSchema } = require('../src/validators/messageSchemas');

const content = 'Can you describe the missing item?';

// Test valid message content
test('schema accepts valid message content', () => {
    const { error, value } = messageSchema.validate({ content });

    assert.equal(error, undefined);
    assert.equal(value.content, content);
});

// Test missing content
test('schema rejects missing message content', () => {
    const { error } = messageSchema.validate({});

    assert.ok(error);
});

// Test empty content
test('schema rejects empty message content', () => {
    const { error } = messageSchema.validate({
        content: ''
    });

    assert.ok(error);
});

// Test whitespace-only content
test('schema rejects whitespace-only message content', () => {
    const { error } = messageSchema.validate({
        content: '   '
    });

    assert.ok(error);
});

// Test non-string content
test('schema rejects non-string message content', () => {
    const { error } = messageSchema.validate({
        content: 123
    });

    assert.ok(error);
});

// Test minimum content length
test('schema accepts a message with exactly one character', () => {
    const { error } = messageSchema.validate({
        content: 'a'
    });

    assert.equal(error, undefined);
});

// Test maximum content length
test('schema accepts messages with exactly 5000 characters', () => {
    const { error } = messageSchema.validate({
        content: 'a'.repeat(5000)
    });

    assert.equal(error, undefined);
});

// Test excessive content length
test('schema rejects messages longer than 5000 characters', () => {
    const { error } = messageSchema.validate({
        content: 'a'.repeat(5001)
    });

    assert.ok(error);
});

// Test whitespace trimming
test('schema trims whitespace from message content', () => {
    const { error, value } = messageSchema.validate({
        content: `   ${content}   `
    });

    assert.equal(error, undefined);
    assert.equal(value.content, content);
});

// Test maximum length after trimming
test('schema accepts 5000 characters after trimming', () => {
    const { error, value } = messageSchema.validate({
        content: `   ${'a'.repeat(5000)}   `
    });

    assert.equal(error, undefined);
    assert.equal(value.content.length, 5000);
});

// Test unexpected sender ID
test('schema rejects senderId in the request body', () => {
    const { error } = messageSchema.validate({
        content,
        senderId: '507f1f77bcf86cd799439013'
    });

    assert.ok(error);
});

// Test unexpected claim ID
test('schema rejects claimId in the request body', () => {
    const { error } = messageSchema.validate({
        content,
        claimId: '507f1f77bcf86cd799439012'
    });

    assert.ok(error);
});

// Test unexpected read timestamp
test('schema rejects readAt in the request body', () => {
    const { error } = messageSchema.validate({
        content,
        readAt: '2026-11-21T12:00:00.000Z'
    });

    assert.ok(error);
});
