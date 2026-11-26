const { test } = require('node:test');
const assert = require('node:assert/strict');
const { postSearchSchema } = require('../src/validators/postSearchSchema');

// test that all search params are optional
test('accepts an empty query', () => {
    const { error } = postSearchSchema.validate({});
    assert.equal(error, undefined);
});

// test valid keyword search
test('accepts a valid search keyword', () => {
    const { error, value } = postSearchSchema.validate({
        search: 'wallet'
    });

    assert.equal(error, undefined);
    assert.equal(value.search, 'wallet');
});

// test whitespace trimming
test('trims whitespace from search keywords', () => {
    const { error, value } = postSearchSchema.validate({
        search: ' wallet '
    });

    assert.equal(error, undefined);
    assert.equal(value.search, 'wallet');
});

// test max search length
test('rejects search keywords longer than 100 characters', () => {
    const { error } = postSearchSchema.validate({
        search: 'a'.repeat(101)
    });

    assert.ok(error);
});

// test empty search keywords
test('rejects whitespace-only search keywords', () => {
    const { error } = postSearchSchema.validate({
        search: '   '
    });
    assert.ok(error);
});

// test validate category
test('accepts a valid category', () => {
    const { error } = postSearchSchema.validate({
        category: 'jewelry'
    });

    assert.equal(error, undefined);
});

// test invalid category
test('rejects an invalid category', () => {
    const { error } = postSearchSchema.validate({
        category: 'electronics'
    });

    assert.ok(error);
});

// test valid status
test('accepts a valid status', () => {
    const { error } = postSearchSchema.validate({
        status: 'lost'
    });

    assert.equal(error, undefined);
});

// test invalid status
test('rejects an invalid status', () => {
    const { error } = postSearchSchema.validate({
        status: 'missing'
    });

    assert.ok(error);
});

// test valid start date
test('accepts a valid start date', () => {
    const { error, value } =postSearchSchema.validate({
        startDate: '2026-11-21'
    });

    assert.equal(error, undefined);
    assert.ok(value.startDate instanceof Date);
});

// test valid end date
test('accesps a valid end date without a start date', () => {
    const { error, value } = postSearchSchema.validate({
        endDate: '2026-11-23'
    });

    assert.equal(error, undefined);
    assert.ok(value.endDate instanceof Date);
});

// test valid date range
test('accepts a valid date range', () => {
    const { error } = postSearchSchema.validate({
        startDate: '2026-11-21',
        endDate: '2026-11-23'
    });

    assert.equal(error, undefined);
});

// test invalid date range
test('rejects and end date earlier than the start date', () => {
    const { error } = postSearchSchema.validate({
        startDate: '2026-11-25',
        endDate: '2026-11-01'
    });

    assert.ok(error);
});

// test invalid date form
test('rejects an invalid date format', () => {
    const { error } = postSearchSchema.validate({
        startDate: 'invalid'
    });

    assert.ok(error);
});

// test combined search parameters
test('accepts multiple valid search parameters', () => {
    const { error } = postSearchSchema.validate({
        search: 'ring',
        category: 'jewelry',
        status: 'lost',
        startDate: '2026-11-21',
        endDate: '2026-11-23'
    });

    assert.equal(error, undefined);
});

// test unknown parameter
test('rejects unknown query parameters', () => {
    const { error } = postSearchSchema.validate({
        unknownFilter: 'test'
    });

    assert.ok(error);
});