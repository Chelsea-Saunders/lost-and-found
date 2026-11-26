const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateSearchPosts } = require('../src/middleware/validatePost');

// Create a mock request, response, and next function
function createMocks(query = {}) {
    const req = { query };

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

    let nextCalled = false;

    const next = () => {
        nextCalled = true;
    };

    return {
        req,
        res,
        next,
        wasNextCalled: () => nextCalled
    };
}

// Test an empty query
test('middleware accepts an empty query', () => {
    const { req, res, next, wasNextCalled } = createMocks();

    validateSearchPosts(req, res, next);

    assert.equal(wasNextCalled(), true);
    assert.deepEqual(req.searchFilters, {});
});

// Test valid search parameters
test('middleware accepts valid search parameters', () => {
    const { req, res, next, wasNextCalled } = createMocks({
        search: 'wallet',
        category: 'other',
        status: 'lost'
    });

    validateSearchPosts(req, res, next);

    assert.equal(wasNextCalled(), true);
    assert.deepEqual(req.searchFilters, {
        search: 'wallet',
        category: 'other',
        status: 'lost'
    });
});

// Test whitespace trimming
test('middleware stores trimmed search keywords', () => {
    const { req, res, next, wasNextCalled } = createMocks({
        search: '  wallet  '
    });

    validateSearchPosts(req, res, next);

    assert.equal(wasNextCalled(), true);
    assert.equal(req.searchFilters.search, 'wallet');
});

// Test date conversion
test('middleware stores validated dates as Date objects', () => {
    const { req, res, next, wasNextCalled } = createMocks({
        startDate: '2026-11-21',
        endDate: '2026-11-23'
    });

    validateSearchPosts(req, res, next);

    assert.equal(wasNextCalled(), true);
    assert.ok(req.searchFilters.startDate instanceof Date);
    assert.ok(req.searchFilters.endDate instanceof Date);
});

// Test invalid category
test('middleware returns 400 for an invalid category', () => {
    const { req, res, next, wasNextCalled } = createMocks({
        category: 'electronics'
    });

    validateSearchPosts(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.ok(Array.isArray(res.body.errors));
    assert.equal(wasNextCalled(), false);
});

// Test invalid status
test('middleware returns 400 for an invalid status', () => {
    const { req, res, next, wasNextCalled } = createMocks({
        status: 'missing'
    });

    validateSearchPosts(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.equal(wasNextCalled(), false);
});

// Test invalid date range
test('middleware returns 400 for an invalid date range', () => {
    const { req, res, next, wasNextCalled } = createMocks({
        startDate: '2026-11-25',
        endDate: '2026-11-01'
    });

    validateSearchPosts(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Validation error');
    assert.equal(wasNextCalled(), false);
});

// Test multiple validation errors
test('middleware returns multiple validation errors', () => {
    const { req, res, next, wasNextCalled } = createMocks({
        category: 'electronics',
        status: 'missing'
    });

    validateSearchPosts(req, res, next);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.errors.length, 2);
    assert.equal(wasNextCalled(), false);
});
