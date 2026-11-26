const { test } = require('node:test');
const assert = require('node:assert/strict');
const Claim = require('../src/models/Claim');
const Post = require('../src/models/Post');

const {
    createClaim,
    getAllClaims,
    getClaimById,
    getPostClaims,
    updateClaim,
    deleteClaim,
    updateClaimStatus
} = require('../src/controllers/claimControllers');

// "mock" id's
const postId = '507f1f77bcf86cd799439011';
const claimId = '507f1f77bcf86cd799439012';
const claimantId = '507f1f77bcf86cd799439013';
const ownerId = '507f1f77bcf86cd799439014';
const otherUserId = '507f1f77bcf86cd799439015';

const proof = 'The item has my initials engraved on it.';

// "mock" requrest and response objects
function createMocks({
    id = claimId,
    userId = claimantId,
    role = 'user',
    body = {}
} = {}) {
    const req = {
        params: { id },
        user: { _id: userId, role },
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

// "mock" post
function createPost(status = 'found') {
    return {
        _id: postId,
        user: ownerId,
        status
    };
}

// "mock" clai
function createMockClaim(status = 'pending') {
    return {
        _id: claimId,
        postId,
        userId: claimantId,
        proof,
        status
    };
}

// CREATE CLAIM TEST
test('controller create a claim successfully', async (t) => {
    const { req, res } = createMocks({
        id: postId,
        body: { proof }
    });

    const claim = createMockClaim();

    t.mock.method(Post, 'findById', async () => createPost());

    const create = t.mock.method(Claim, 'create', async () => claim);

    await createClaim(req, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, {
        message: 'Claim submitted successfully',
        claim
    });

    assert.deepEqual(create.mock.calls[0].arguments[0], {
        postId,
        userId: claimantId,
        proof
    });
});

test('controller rejects an invalid post ID', async () => {
    const { req, res } = createMocks({
        id: 'invalid-id',
        body: { proof }
    });

    await createClaim(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Invalid post ID');
});

test('controller returns 404 when post does not exist', async (t) => {
    const { req, res } = createMocks({
        id: postId,
        body: { proof }
    });

    t.mock.method(Post, 'findById', async () => null);

    await createClaim(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Post not found');
});

test('controller rejects claims on returned items', async (t) => {
    const { req, res } = createMocks({
        id: postId,
        body: { proof }
    });

    t.mock.method(Post, 'findById', async () => createPost('returned'));

    const create = t.mock.method(Claim, 'create', async () => {});

    await createClaim(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Cannot claim a returned item');
    assert.equal(create.mock.callCount(), 0);
});

test('controller prevents users from claiming their own posts', async (t) => {
    const { req, res } = createMocks({
        id: postId,
        userId: ownerId,
        body: { proof }
    });

    t.mock.method(Post, 'findById', async () => createPost());

    await createClaim(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, 'Cannot claim your own post');
});

test('controller rejects duplicate claims', async (t) => {
    const { req, res } = createMocks({
        id: postId,
        body: { proof }
    });

    t.mock.method(Post, 'findById', async () => createPost());

    t.mock.method(Claim, 'create', async () => {
        const error = new Error('Duplicate claim');
        error.code = 11000;
        throw error;
    });

    await createClaim(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, 'You already claimed this post');
});

// GET ALL CLAIMS TESTS

test('controller allows administrators to retrieve all claims', async (t) => {
    const { req, res } = createMocks({ role: 'admin' });
    const claims = [createMockClaim()];

    t.mock.method(Claim, 'find', () => ({
        sort: () => ({
            lean: async () => claims
        })
    }));

    await getAllClaims(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, claims);
});

test('controller prevents regular users from retrieving all claims', async () => {
    const { req, res } = createMocks();

    await getAllClaims(req, res);

    assert.equal(res.statusCode, 403);
});

// GET CLAIM BY ID TESTS

test('controller allows claimant to retrieve their claim', async (t) => {
    const { req, res } = createMocks();
    const claim = createMockClaim();

    t.mock.method(Claim, 'findById', async () => claim);
    t.mock.method(Post, 'findById', async () => createPost());

    await getClaimById(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, claim);
});

test('controller allows post owner to retrieve a claim', async (t) => {
    const { req, res } = createMocks({ userId: ownerId });
    const claim = createMockClaim();

    t.mock.method(Claim, 'findById', async () => claim);
    t.mock.method(Post, 'findById', async () => createPost());

    await getClaimById(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, claim);
});

test('controller prevents unauthorized access to private claims', async (t) => {
    const { req, res } = createMocks({ userId: otherUserId });

    t.mock.method(Claim, 'findById', async () => createMockClaim());
    t.mock.method(Post, 'findById', async () => createPost());

    await getClaimById(req, res);

    assert.equal(res.statusCode, 403);
});

test('controller returns 404 when claim does not exist', async (t) => {
    const { req, res } = createMocks();

    t.mock.method(Claim, 'findById', async () => null);

    await getClaimById(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Claim not found');
});

// GET POST CLAIMS TESTS

test('controller allows post owner to retrieve post claims', async (t) => {
    const { req, res } = createMocks({
        id: postId,
        userId: ownerId
    });

    const claims = [createMockClaim()];

    t.mock.method(Post, 'findById', async () => createPost());

    t.mock.method(Claim, 'find', () => ({
        sort: () => ({
            lean: async () => claims
        })
    }));

    await getPostClaims(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, claims);
});

test('controller prevents unauthorized users from listing post claims', async (t) => {
    const { req, res } = createMocks({
        id: postId,
        userId: otherUserId
    });

    t.mock.method(Post, 'findById', async () => createPost());

    await getPostClaims(req, res);

    assert.equal(res.statusCode, 403);
});

// UPDATE CLAIM TESTS

test('controller allows claimant to update pending proof', async (t) => {
    const newProof = 'There is a scratch on the back of the item.';

    const { req, res } = createMocks({
        body: { proof: newProof }
    });

    const claim = createMockClaim();
    claim.save = t.mock.fn(async () => claim);

    t.mock.method(Claim, 'findById', async () => claim);

    await updateClaim(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(claim.proof, newProof);
    assert.equal(claim.save.mock.callCount(), 1);
});

test('controller prevents unauthorized claim updates', async (t) => {
    const { req, res } = createMocks({
        userId: otherUserId,
        body: { proof }
    });

    t.mock.method(Claim, 'findById', async () => createMockClaim());

    await updateClaim(req, res);

    assert.equal(res.statusCode, 403);
});

test('controller prevents updates to reviewed claims', async (t) => {
    const { req, res } = createMocks({
        body: { proof }
    });

    t.mock.method(Claim, 'findById', async () => createMockClaim('approved'));

    await updateClaim(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Only pending claims can be updated');
});

// DELETE CLAIM TESTS

test('controller allows claimant to delete their claim', async (t) => {
    const { req, res } = createMocks();

    const claim = createMockClaim();
    claim.deleteOne = t.mock.fn(async () => {});

    t.mock.method(Claim, 'findById', async () => claim);

    await deleteClaim(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Claim deleted');
    assert.equal(claim.deleteOne.mock.callCount(), 1);
});

test('controller prevents unauthorized claim deletion', async (t) => {
    const { req, res } = createMocks({ userId: otherUserId });

    t.mock.method(Claim, 'findById', async () => createMockClaim());

    await deleteClaim(req, res);

    assert.equal(res.statusCode, 403);
});

// CLAIM STATUS TESTS

test('controller allows post owner to approve a pending claim', async (t) => {
    const { req, res } = createMocks({
        userId: ownerId,
        body: {
            status: 'approved',
            reviewNote: 'Ownership confirmed.'
        }
    });

    const claim = createMockClaim();
    claim.save = t.mock.fn(async () => claim);

    t.mock.method(Claim, 'findById', async () => claim);
    t.mock.method(Post, 'findById', async () => createPost());

    await updateClaimStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(claim.status, 'approved');
    assert.equal(claim.reviewNote, 'Ownership confirmed.');
    assert.equal(claim.reviewedBy, ownerId);
    assert.ok(claim.reviewedAt instanceof Date);
    assert.equal(claim.save.mock.callCount(), 1);
});

test('controller allows post owner to reject a pending claim', async (t) => {
    const { req, res } = createMocks({
        userId: ownerId,
        body: { status: 'rejected' }
    });

    const claim = createMockClaim();
    claim.save = t.mock.fn(async () => claim);

    t.mock.method(Claim, 'findById', async () => claim);
    t.mock.method(Post, 'findById', async () => createPost());

    await updateClaimStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(claim.status, 'rejected');
    assert.equal(claim.save.mock.callCount(), 1);
});

test('controller prevents claimants from approving their own claims', async (t) => {
    const { req, res } = createMocks({
        body: { status: 'approved' }
    });

    t.mock.method(Claim, 'findById', async () => createMockClaim());
    t.mock.method(Post, 'findById', async () => createPost());

    await updateClaimStatus(req, res);

    assert.equal(res.statusCode, 403);
});

test('controller rejects invalid claim status', async () => {
    const { req, res } = createMocks({
        userId: ownerId,
        body: { status: 'invalid' }
    });

    await updateClaimStatus(req, res);

    assert.equal(res.statusCode, 400);
});

test('controller prevents reviewing an already reviewed claim', async (t) => {
    const { req, res } = createMocks({
        userId: ownerId,
        body: { status: 'rejected' }
    });

    t.mock.method(Claim, 'findById', async () => createMockClaim('approved'));
    t.mock.method(Post, 'findById', async () => createPost());

    await updateClaimStatus(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Only pending claims can be reviewed');
});

// INVALID ID TESTS

const invalidIdTests = [
    ['getClaimById', getClaimById, 'Invalid claim ID'],
    ['getPostClaims', getPostClaims, 'Invalid post ID'],
    ['updateClaim', updateClaim, 'Invalid claim ID'],
    ['deleteClaim', deleteClaim, 'Invalid claim ID'],
    ['updateClaimStatus', updateClaimStatus, 'Invalid claim ID']
];

for (const [name, controller, message] of invalidIdTests) {
    test(`${name} rejects malformed IDs`, async () => {
        const { req, res } = createMocks({
            id: 'invalid-id'
        });

        await controller(req, res);

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, message);
    });
}

// SERVER ERROR TEST

test('controller returns 500 when a database error occurs', async (t) => {
    const { req, res } = createMocks({
        id: postId,
        body: { proof }
    });

    t.mock.method(console, 'error', () => {});

    t.mock.method(Post, 'findById', async () => {
        throw new Error('Database error');
    });

    await createClaim(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Server error');
});
