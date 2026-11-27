const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const { Passport } = require('passport');
const User = require('../src/models/User');
const Post = require('../src/models/Post');
const Item = require('../src/models/Item');
const Claim = require('../src/models/Claim');
const Message = require('../src/models/Message');
const { getMyProfile, updateMyProfile, deleteMyAccount } = require('../src/controllers/userControllers');
const { validateProfileUpdate } = require('../src/middleware/validateUser');
const userRoutes = require('../src/routes/userRoutes');
const authRoutes = require('../src/routes/authRoutes');

const selfId = '507f1f77bcf86cd799439012';
const otherId = '507f1f77bcf86cd799439013';
const profile = { _id: selfId, name: 'Alex Rivera', email: 'alex@example.com', role: 'user' };
const relatedModels = [Post, Item, Claim, Message];

function query(document, error) {
    return {
        select(fields) {
            assert.equal(fields, 'name email role createdAt');
            return {
                async lean() {
                    if (error) throw error;
                    if (!document) return null;
                    return Object.fromEntries(['_id', ...fields.split(' ')]
                        .filter(key => document[key] !== undefined)
                        .map(key => [key, document[key]]));
                },
            };
        },
    };
}

function mocks() {
    const events = [];
    const req = {
        user: { _id: selfId, role: 'user' },
        params: { id: otherId },
        profileUpdates: { name: 'Alex Morgan' },
        logout(callback) { events.push('logout'); callback(); },
        session: { destroy(callback) { events.push('destroy'); callback(); } },
    };
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        clearCookie(name) { events.push('clear:' + name); return this; },
    };
    return { req, res, events };
}

function mockDeletion(t, record = profile) {
    t.mock.method(User, 'findById', () => query(record));
    relatedModels.forEach(Model => t.mock.method(Model, 'exists', async () => null));
    return t.mock.method(User, 'findByIdAndDelete', async () => record);
}

test('GET profile uses the session identity and excludes provider identifiers', async t => {
    const { req, res } = mocks();
    const find = t.mock.method(User, 'findById', () => query({ ...profile, googleId: 'private', githubId: 'private' }));
    await getMyProfile(req, res);
    assert.equal(find.mock.calls[0].arguments[0], selfId);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, profile);
});

test('GET profile returns 404 for a missing account', async t => {
    const { req, res } = mocks();
    t.mock.method(User, 'findById', () => query(null));
    await getMyProfile(req, res);
    assert.equal(res.statusCode, 404);
});

test('GET profile handles database errors', async t => {
    const { req, res } = mocks();
    t.mock.method(console, 'error', () => {});
    t.mock.method(User, 'findById', () => query(null, new Error('Database unavailable')));
    await getMyProfile(req, res);
    assert.equal(res.statusCode, 500);
});

test('PUT profile atomically updates the session user with validated fields', async t => {
    const { req, res } = mocks();
    const update = t.mock.method(User, 'findByIdAndUpdate', () => query({ ...profile, name: 'Alex Morgan' }));
    await updateMyProfile(req, res);
    assert.deepEqual(update.mock.calls[0].arguments, [
        selfId, { $set: { name: 'Alex Morgan' } }, { new: true, runValidators: true },
    ]);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.name, 'Alex Morgan');
});

for (const [label, error, status] of [
    ['duplicate email', { code: 11000 }, 409],
    ['model validation', { name: 'ValidationError' }, 400],
    ['database failure', new Error('Database unavailable'), 500],
]) {
    test('PUT profile handles ' + label, async t => {
        const { req, res } = mocks();
        t.mock.method(console, 'error', () => {});
        t.mock.method(User, 'findByIdAndUpdate', () => query(null, error));
        await updateMyProfile(req, res);
        assert.equal(res.statusCode, status);
    });
}

test('PUT profile returns 404 when the user disappears before updating', async t => {
    const { req, res } = mocks();
    t.mock.method(User, 'findByIdAndUpdate', () => query(null));
    await updateMyProfile(req, res);
    assert.equal(res.statusCode, 404);
});

test('profile validation trims names and normalizes email addresses', t => {
    const req = { body: { name: '  Alex Morgan  ', email: '  ALEX.MORGAN@example.com  ' } };
    const { res } = mocks();
    const next = t.mock.fn();
    validateProfileUpdate(req, res, next);
    assert.equal(next.mock.callCount(), 1);
    assert.deepEqual(req.profileUpdates, { name: 'Alex Morgan', email: 'alex.morgan@example.com' });
});

for (const [label, body] of [
    ['missing body', undefined], ['empty body', {}], ['null body', null], ['array body', []],
    ['blank name', { name: '   ' }], ['long name', { name: 'a'.repeat(101) }],
    ['numeric name', { name: 42 }], ['invalid email', { email: 'invalid' }],
    ['role escalation', { name: 'Alex', role: 'admin' }],
    ['Google identifier', { googleId: 'replacement' }],
    ['GitHub identifier', { githubId: 'replacement' }],
    ['account identifier', { _id: otherId }],
    ['password', { password: 'replacement' }],
    ['MongoDB operator', { $set: { role: 'admin' } }],
]) {
    test('profile validation rejects ' + label, t => {
        const req = { body };
        const { res } = mocks();
        const next = t.mock.fn();
        validateProfileUpdate(req, res, next);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.message, 'Validation error');
        assert.equal(next.mock.callCount(), 0);
    });
}

test('profile validation permits a single field without replacing omitted fields', t => {
    const req = { body: { email: 'updated@example.com' } };
    const { res } = mocks();
    const next = t.mock.fn();
    validateProfileUpdate(req, res, next);
    assert.deepEqual(req.profileUpdates, { email: 'updated@example.com' });
    assert.equal(next.mock.callCount(), 1);
});

for (const [index, name] of ['post', 'legacy item', 'claim', 'message'].entries()) {
    test('DELETE account blocks an existing ' + name + ' reference', async t => {
        const { req, res, events } = mocks();
        const remove = mockDeletion(t);
        relatedModels[index].exists.mock.restore();
        t.mock.method(relatedModels[index], 'exists', async () => ({ _id: otherId }));
        await deleteMyAccount(req, res);
        assert.equal(res.statusCode, 409);
        assert.equal(remove.mock.callCount(), 0);
        assert.deepEqual(events, []);
    });
}

test('DELETE account checks both claimant and reviewer references', async t => {
    const { req, res } = mocks();
    mockDeletion(t);
    await deleteMyAccount(req, res);
    assert.deepEqual(Claim.exists.mock.calls[0].arguments[0], {
        $or: [{ userId: selfId }, { reviewedBy: selfId }],
    });
    assert.equal(res.statusCode, 200);
});

test('DELETE account preserves the last administrator', async t => {
    const { req, res } = mocks();
    const remove = mockDeletion(t, { ...profile, role: 'admin' });
    t.mock.method(User, 'countDocuments', async () => 1);
    await deleteMyAccount(req, res);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, 'Cannot delete the last administrator');
    assert.equal(remove.mock.callCount(), 0);
});

test('DELETE account allows an unreferenced administrator when another remains', async t => {
    const { req, res } = mocks();
    mockDeletion(t, { ...profile, role: 'admin' });
    t.mock.method(User, 'countDocuments', async () => 2);
    await deleteMyAccount(req, res);
    assert.equal(res.statusCode, 200);
});

test('DELETE account ends the session before deleting only the current user', async t => {
    const { req, res, events } = mocks();
    const remove = mockDeletion(t);
    remove.mock.restore();
    t.mock.method(User, 'findByIdAndDelete', async id => {
        assert.equal(id, selfId);
        events.push('delete');
        return profile;
    });
    await deleteMyAccount(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { message: 'Account deleted' });
    assert.deepEqual(events, ['logout', 'destroy', 'delete', 'clear:connect.sid']);
});

for (const stage of ['logout', 'destroy']) {
    test('DELETE account preserves the account if ' + stage + ' fails', async t => {
        const { req, res } = mocks();
        const remove = mockDeletion(t);
        t.mock.method(console, 'error', () => {});
        const fail = callback => callback(new Error('Session unavailable'));
        if (stage === 'logout') req.logout = fail;
        else req.session.destroy = fail;
        await deleteMyAccount(req, res);
        assert.equal(res.statusCode, 500);
        assert.equal(remove.mock.callCount(), 0);
    });
}

test('DELETE account returns 404 if the account no longer exists', async t => {
    const { req, res } = mocks();
    const remove = mockDeletion(t, null);
    await deleteMyAccount(req, res);
    assert.equal(res.statusCode, 404);
    assert.equal(remove.mock.callCount(), 0);
});

test('DELETE account reports database errors without reporting success', async t => {
    const { req, res } = mocks();
    mockDeletion(t);
    User.findByIdAndDelete.mock.restore();
    t.mock.method(User, 'findByIdAndDelete', async () => { throw new Error('Database unavailable'); });
    t.mock.method(console, 'error', () => {});
    await deleteMyAccount(req, res);
    assert.equal(res.statusCode, 500);
});

test('self-service routes enforce real browser sessions, preserve other accounts, and invalidate deleted-user sessions', async t => {
    const records = new Map([
        [selfId, { ...profile, googleId: 'private-google-id', githubId: 'private-github-id' }],
        [otherId, { ...profile, _id: otherId, email: 'other@example.com' }],
    ]);
    t.mock.method(User, 'findById', id => query(records.get(String(id))));
    const update = t.mock.method(User, 'findByIdAndUpdate', (id, changes) => {
        const record = records.get(String(id));
        if (record) Object.assign(record, changes.$set);
        return query(record);
    });
    const remove = t.mock.method(User, 'findByIdAndDelete', async id => {
        const record = records.get(String(id));
        records.delete(String(id));
        return record;
    });
    relatedModels.forEach(Model => t.mock.method(Model, 'exists', async () => null));

    const passport = new Passport();
    passport.serializeUser((user, done) => done(null, user._id));
    passport.deserializeUser((id, done) => done(null, records.get(id) || false));
    const store = new session.MemoryStore();
    const app = express();
    app.use(express.json());
    app.use(session({ secret: 'profile-route-test-secret', resave: false, saveUninitialized: false, store }));
    app.use(passport.initialize());
    app.use(passport.session());
    // This login helper exists only in the isolated test app; production still uses OAuth.
    app.post('/test/login', (req, res, next) => req.login(records.get(selfId), err => {
        if (err) return next(err);
        res.json({ message: 'Signed in' });
    }));
    app.use('/users', userRoutes);
    app.use('/auth', authRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        store.clear(() => {});
    });
    const base = 'http://127.0.0.1:' + server.address().port;
    const request = async (method, route, cookie, body) => {
        const response = await fetch(base + route, {
            method,
            headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        return { status: response.status, cookie: response.headers.get('set-cookie'), body: await response.json() };
    };

    for (const method of ['GET', 'PUT', 'DELETE']) {
        assert.equal((await request(method, '/users/me')).status, 401);
    }
    const login = await request('POST', '/test/login');
    const cookie = login.cookie.split(';')[0];
    const secondCookie = (await request('POST', '/test/login')).cookie.split(';')[0];
    const read = await request('GET', '/users/me', cookie);
    assert.equal(read.status, 200);
    assert.deepEqual(read.body, profile);
    assert.equal((await request('GET', '/users/' + otherId, cookie)).status, 403);
    assert.equal((await request('PUT', '/users/me', cookie, { role: 'admin' })).status, 400);
    assert.equal(update.mock.callCount(), 0);

    const saved = await request('PUT', '/users/me', cookie, { name: '  Alex Morgan  ', email: 'UPDATED@example.com' });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.name, 'Alex Morgan');
    assert.equal(saved.body.email, 'updated@example.com');
    assert.equal(saved.body.role, 'user');
    assert.equal(saved.body.googleId, undefined);
    assert.equal((await request('GET', '/auth/me', cookie)).body.user.displayName, 'Alex Morgan');

    const deleted = await request('DELETE', '/users/me', cookie);
    assert.equal(deleted.status, 200);
    assert.match(deleted.cookie, /connect.sid=;/);
    assert.equal(remove.mock.callCount(), 1);
    assert.equal(records.has(selfId), false);
    assert.equal(records.has(otherId), true);
    assert.equal((await request('GET', '/users/me', cookie)).status, 401);
    assert.equal((await request('GET', '/users/me', secondCookie)).status, 401);
    assert.equal((await request('GET', '/auth/me', cookie)).status, 401);
});
