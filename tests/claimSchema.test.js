const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
    claimSchema,
    claimStatusSchema
} = require('../src/validators/claimSchemas');

const proof = 'The item has my initials engraved on it.';

// CLAIM PROOF TESTS

test('schema accepts valid claim proof', () => {
    const { error, value } = claimSchema.validate({ proof });

    assert.equal(error, undefined);
    assert.equal(value.proof, proof);
});

test('schema rejects missing proof', () => {
    const { error } = claimSchema.validate({});

    assert.ok(error);
});

test('schema rejects empty proof', () => {
    const { error } = claimSchema.validate({
        proof: ''
    });

    assert.ok(error);
});

test('schema rejects whitespace-only proof', () => {
    const { error } = claimSchema.validate({
        proof: '   '
    });

    assert.ok(error);
});

test('schema rejects proof shorter than 10 characters', () => {
    const { error } = claimSchema.validate({
        proof: 'a'.repeat(9)
    });

    assert.ok(error);
});

test('schema accepts proof with exactly 10 characters', () => {
    const { error } = claimSchema.validate({
        proof: 'a'.repeat(10)
    });

    assert.equal(error, undefined);
});

test('schema accepts proof with exactly 1000 characters', () => {
    const { error } = claimSchema.validate({
        proof: 'a'.repeat(1000)
    });

    assert.equal(error, undefined);
});

test('schema rejects proof longer than 1000 characters', () => {
    const { error } = claimSchema.validate({
        proof: 'a'.repeat(1001)
    });

    assert.ok(error);
});

test('schema trims whitespace from proof', () => {
    const { error, value } = claimSchema.validate({
        proof: `   ${proof}   `
    });

    assert.equal(error, undefined);
    assert.equal(value.proof, proof);
});

test('schema rejects non-string proof', () => {
    const { error } = claimSchema.validate({
        proof: 1234567890
    });

    assert.ok(error);
});

test('schema rejects unexpected claim fields', () => {
    const { error } = claimSchema.validate({
        proof,
        status: 'approved'
    });

    assert.ok(error);
});

// CLAIM STATUS TESTS

test('schema accepts approved status', () => {
    const { error } = claimStatusSchema.validate({
        status: 'approved'
    });

    assert.equal(error, undefined);
});

test('schema accepts rejected status', () => {
    const { error } = claimStatusSchema.validate({
        status: 'rejected'
    });

    assert.equal(error, undefined);
});

test('schema rejects missing status', () => {
    const { error } = claimStatusSchema.validate({});

    assert.ok(error);
});

test('schema rejects pending as a review status', () => {
    const { error } = claimStatusSchema.validate({
        status: 'pending'
    });

    assert.ok(error);
});

test('schema rejects invalid claim status', () => {
    const { error } = claimStatusSchema.validate({
        status: 'invalid'
    });

    assert.ok(error);
});

// REVIEW NOTE TESTS

test('schema accepts an optional review note', () => {
    const { error, value } = claimStatusSchema.validate({
        status: 'approved',
        reviewNote: 'Ownership confirmed.'
    });

    assert.equal(error, undefined);
    assert.equal(value.reviewNote, 'Ownership confirmed.');
});

test('schema trims whitespace from review notes', () => {
    const { error, value } = claimStatusSchema.validate({
        status: 'approved',
        reviewNote: '   Ownership confirmed.   '
    });

    assert.equal(error, undefined);
    assert.equal(value.reviewNote, 'Ownership confirmed.');
});

test('schema accepts review notes with exactly 1000 characters', () => {
    const { error } = claimStatusSchema.validate({
        status: 'approved',
        reviewNote: 'a'.repeat(1000)
    });

    assert.equal(error, undefined);
});

test('schema rejects review notes longer than 1000 characters', () => {
    const { error } = claimStatusSchema.validate({
        status: 'approved',
        reviewNote: 'a'.repeat(1001)
    });

    assert.ok(error);
});

test('schema rejects non-string review notes', () => {
    const { error } = claimStatusSchema.validate({
        status: 'approved',
        reviewNote: 123
    });

    assert.ok(error);
});

test('schema rejects unexpected claim review fields', () => {
    const { error } = claimStatusSchema.validate({
        status: 'approved',
        reviewedBy: '507f1f77bcf86cd799439013'
    });

    assert.ok(error);
});