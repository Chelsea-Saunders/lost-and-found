const { test } = require('node:test');
const assert = require('node:assert/strict');
const Post = require('../src/models/Post');
const { getAllPosts } = require('../src/controllers/postControllers');

// Create mock request and response objects
function createMocks(searchFilters = {}) {
    const req = { searchFilters };

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

// Mock the database query
function mockFind(t, posts = []) {
    let capturedFilter;
    let capturedSort;

    t.mock.method(Post, 'find', (filter) => {
        capturedFilter = filter;

        return {
            sort: async (sortOptions) => {
                capturedSort = sortOptions;
                return posts;
            }
        };
    });

    return {
        getFilter: () => capturedFilter,
        getSort: () => capturedSort
    };
}

// Test retrieving all posts
test('controller returns all posts without filters', async (t) => {
    const posts = [
        { title: 'Missing jacket' },
        { title: 'Lost black wallet' }
    ];

    const { req, res } = createMocks();
    const { getFilter, getSort } = mockFind(t, posts);

    await getAllPosts(req, res);

    assert.deepEqual(getFilter(), {});
    assert.deepEqual(getSort(), { createdAt: -1 });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, posts);
});

// Test keyword search
test('controller searches title and content', async (t) => {
    const { req, res } = createMocks({
        search: 'wallet'
    });

    const { getFilter } = mockFind(t);

    await getAllPosts(req, res);

    assert.deepEqual(getFilter(), {
        $or: [
            { title: { $regex: 'wallet', $options: 'i' } },
            { content: { $regex: 'wallet', $options: 'i' } }
        ]
    });
});

// Test category filtering
test('controller filters posts by category', async (t) => {
    const { req, res } = createMocks({
        category: 'jewelry'
    });

    const { getFilter } = mockFind(t);

    await getAllPosts(req, res);

    assert.deepEqual(getFilter(), {
        category: 'jewelry'
    });
});

// Test status filtering
test('controller filters posts by status', async (t) => {
    const { req, res } = createMocks({
        status: 'lost'
    });

    const { getFilter } = mockFind(t);

    await getAllPosts(req, res);

    assert.deepEqual(getFilter(), {
        status: 'lost'
    });
});

// Test combined filters
test('controller combines search, category, and status', async (t) => {
    const { req, res } = createMocks({
        search: 'ring',
        category: 'jewelry',
        status: 'lost'
    });

    const { getFilter } = mockFind(t);

    await getAllPosts(req, res);

    assert.deepEqual(getFilter(), {
        $or: [
            { title: { $regex: 'ring', $options: 'i' } },
            { content: { $regex: 'ring', $options: 'i' } }
        ],
        category: 'jewelry',
        status: 'lost'
    });
});

// Test start date filtering
test('controller filters posts by start date', async (t) => {
    const startDate = new Date('2026-11-21');

    const { req, res } = createMocks({ startDate });
    const { getFilter } = mockFind(t);

    await getAllPosts(req, res);

    assert.deepEqual(getFilter(), {
        createdAt: {
            $gte: startDate
        }
    });
});

// Test end date filtering
test('controller includes the entire end date', async (t) => {
    const { req, res } = createMocks({
        endDate: new Date('2026-11-23')
    });

    const { getFilter } = mockFind(t);

    await getAllPosts(req, res);

    assert.deepEqual(getFilter(), {
        createdAt: {
            $lte: new Date('2026-11-23T23:59:59.999Z')
        }
    });
});

// Test date range filtering
test('controller filters posts within a date range', async (t) => {
    const { req, res } = createMocks({
        startDate: new Date('2026-11-21'),
        endDate: new Date('2026-11-23')
    });

    const { getFilter } = mockFind(t);

    await getAllPosts(req, res);

    assert.deepEqual(getFilter(), {
        createdAt: {
            $gte: new Date('2026-11-21T00:00:00.000Z'),
            $lte: new Date('2026-11-23T23:59:59.999Z')
        }
    });
});

// Test escaping special regex characters
test('controller escapes special regex characters', async (t) => {
    const { req, res } = createMocks({
        search: 'wallet.*'
    });

    const { getFilter } = mockFind(t);

    await getAllPosts(req, res);

    assert.deepEqual(getFilter(), {
        $or: [
            { title: { $regex: 'wallet\\.\\*', $options: 'i' } },
            { content: { $regex: 'wallet\\.\\*', $options: 'i' } }
        ]
    });
});

// Test no matching posts
test('controller returns an empty array when no posts match', async (t) => {
    const { req, res } = createMocks({
        search: 'xyzabc123'
    });

    mockFind(t, []);

    await getAllPosts(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, []);
});

// Test database error handling
test('controller returns 500 when a database error occurs', async (t) => {
    const { req, res } = createMocks();

    t.mock.method(console, 'error', () => {});

    t.mock.method(Post, 'find', () => ({
        sort: async () => {
            throw new Error('Database error');
        }
    }));

    await getAllPosts(req, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
        message: 'Server error'
    });

});
