const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/module-loader.cjs');
process.env.AUTH_SECRET = 'redesign-test-secret-isolated-from-real-environment';
const challenges = loader()('src/lib/loginChallenge.ts');

test('password proof is opaque, expires, rejects tampering and key changes', () => {
  const proof = challenges.issueLoginChallenge({ id: 'test-admin', authVersion: 3, totpEnabled: true }, 1000);
  assert.equal(proof.mfaRequired, true);
  assert.equal(challenges.readLoginChallenge(proof.challenge, 1001).userId, 'test-admin');
  assert.equal(challenges.readLoginChallenge(proof.challenge, 301000), null);
  const bytes = Buffer.from(proof.challenge, 'base64url'); bytes[40] ^= 1;
  assert.equal(challenges.readLoginChallenge(bytes.toString('base64url'), 1001), null);
  assert.equal(challenges.readLoginChallenge('x'.repeat(1025), 1001), null);
  assert.equal(proof.challenge.includes('test-admin'), false);
  const original = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = 'different-test-key';
  assert.equal(challenges.readLoginChallenge(proof.challenge, 1001), null);
  process.env.AUTH_SECRET = original;
});

test('password step uses the server MFA state and never creates an authenticated session', async () => {
  let rateAllowed = true;
  let active = true;
  let passwordCorrect = true;
  let enabled = true;
  const route = loader({
    prisma: { user: { findMany: async () => [{ id: 'test-user', authVersion: 0, totpEnabled: enabled, role: 'AUDITOR', isActive: active, passwordHash: 'test-hash' }] } },
    '@/lib/security': { verifyPassword: async () => passwordCorrect },
    '@/lib/rateLimit': { clientAddress: () => 'unknown', consumeRateLimit: async () => rateAllowed },
  })('src/app/api/auth/login-challenge/route.ts');
  const request = (origin = 'http://localhost') => new Request('http://localhost/api/auth/login-challenge', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'test', password: 'secret-password' }) });
  const first = await route.POST(request());
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('cache-control'), 'no-store');
  assert.equal((await first.json()).mfaRequired, true);
  enabled = false;
  assert.equal((await (await route.POST(request())).json()).mfaRequired, false);
  active = false; assert.equal((await route.POST(request())).status, 401);
  active = true; passwordCorrect = false; assert.equal((await route.POST(request())).status, 401);
  passwordCorrect = true; rateAllowed = false; assert.equal((await route.POST(request())).status, 429);
  assert.equal((await route.POST(request('https://other.example'))).status, 403);
});

test('MFA challenge cannot grant a session before verification or after replay / password change', async () => {
  let config;
  let factorValid = false;
  let consumed = false;
  let creates = 0;
  const user = { id: 'test-admin', role: 'ADMIN', login: 'test', name: 'Test', authVersion: 2, passwordHash: 'hash', totpEnabled: true, isActive: true };
  loader({
    'next-auth': value => { config = value; return {}; },
    'next-auth/providers/credentials': value => value,
    prisma: { user: { findUnique: async () => ({ ...user }) }, authSession: { create: async () => { creates++; } } },
    './mfa': { consumeSecondFactor: async () => factorValid },
    './rateLimit': { clientAddress: () => 'unknown', consumeRateLimit: async scope => { if (scope !== 'login-challenge-used') return true; if (consumed) return false; consumed = true; return true; } },
  })('src/lib/auth.ts');
  const authorize = config.providers[0].authorize;
  const proof = challenges.issueLoginChallenge(user);
  const request = new Request('http://localhost/api/auth/callback/credentials');
  assert.equal(await authorize({ challenge: proof.challenge, code: '' }, request), null);
  assert.equal(creates, 0);
  factorValid = true; user.authVersion++;
  assert.equal(await authorize({ challenge: proof.challenge, code: '123456' }, request), null);
  assert.equal(creates, 0); user.authVersion--;
  assert.equal((await authorize({ challenge: proof.challenge, code: '123456' }, request)).mfaVerified, true);
  assert.equal(creates, 1);
  assert.equal(await authorize({ challenge: proof.challenge, code: '654321' }, request), null);
  assert.equal(creates, 1);
});

test('bulk addition preserves multiple and legacy managers; replacement is explicit', async () => {
  const { locationBulkSchema, applyLocationBulk } = loader()('src/lib/locationManagement.ts');
  const changes = [];
  const tx = { user: { count: async () => 1 }, location: {
    findMany: async () => [{ id: 'a', tuId: 'legacy', tus: [{ id: 'existing' }] }, { id: 'b', tuId: null, tus: [] }],
    update: async query => { changes.push(query); },
  } };
  await applyLocationBulk(tx, locationBulkSchema.parse({ ids: ['a', 'b'], tuIds: ['new'], isActive: false }));
  assert.deepEqual(changes[0].data.tus.set.map(t => t.id), ['existing', 'legacy', 'new']);
  assert.equal(changes[0].data.tuId, null);
  assert.equal(changes[0].data.isActive, false);
  changes.length = 0;
  await applyLocationBulk(tx, locationBulkSchema.parse({ ids: ['a', 'b'], tuIds: [], assignmentMode: 'REPLACE' }));
  assert.deepEqual(changes[0].data.tus.set, []);
  assert.equal(Object.hasOwn(changes[0].data, 'isActive'), false);
});

test('bulk checks all IDs and TU roles before writing, requires ADMIN and uses an atomic transaction', async () => {
  let writes = 0;
  let options;
  let transactionCalls = 0;
  let admin = true;
  let managerCount = 1;
  const tx = { user: { count: async () => managerCount }, location: { findMany: async () => [{ id: 'a', tus: [], tuId: null }], update: async () => { writes++; } } };
  const route = loader({ prisma: { $transaction: async (callback, opts) => { options = opts; transactionCalls++; return callback(tx); } },
    '@/lib/requireAuth': { requireAuth: async allowed => { assert.deepEqual(allowed, ['ADMIN']); return { error: admin ? null : Response.json({}, { status: 403 }) }; } },
  })('src/app/api/locations/bulk/route.ts');
  const request = body => new Request('http://localhost/api/locations/bulk', { method: 'PATCH', body: JSON.stringify(body) });
  assert.equal((await route.PATCH(request({ ids: ['a', 'missing'], isActive: false }))).status, 400);
  assert.equal(writes, 0);
  managerCount = 0;
  assert.equal((await route.PATCH(request({ ids: ['a'], tuIds: ['wrong-role'] }))).status, 400);
  assert.equal(writes, 0);
  managerCount = 1;
  assert.equal((await route.PATCH(request({ ids: ['a'], isActive: false }))).status, 200);
  assert.equal(options.isolationLevel, 'Serializable');
  const prior = transactionCalls; admin = false;
  assert.equal((await route.PATCH(request({ ids: ['a'], isActive: true }))).status, 403);
  assert.equal(transactionCalls, prior);
});

test('location updates reject invalid dates, reversed periods and preserve links when not edited', () => {
  const { locationPatchSchema, validateLocationPeriod, locationUpdateData } = loader()('src/lib/locationManagement.ts');
  assert.throws(() => locationPatchSchema.parse({ activeFrom: '2026-02-30' }));
  assert.throws(() => locationPatchSchema.parse({ activeTo: 'nonsense' }));
  assert.throws(() => validateLocationPeriod('2026-10-20', '2026-10-01'));
  assert.deepEqual(locationUpdateData({ isActive: false }), { isActive: false });
  assert.deepEqual(locationUpdateData({ activeFrom: null }), { activeFrom: null });
});

test('resetting the last usable administrator is refused without clearing their password or sessions', async () => {
  let writes = 0;
  const tx = { user: { count: async () => 1, update: async () => { writes++; } }, authSession: { deleteMany: async () => { writes++; } } };
  const route = loader({ prisma: { user: { findUnique: async () => ({ id: 'admin', role: 'ADMIN', isActive: true, passwordHash: 'hash' }) }, $transaction: async callback => callback(tx) },
    '@/lib/requireAuth': { requireAuth: async () => ({ session: { user: { id: 'admin', role: 'ADMIN' } }, error: null }) },
  })('src/app/api/users/route.ts');
  const result = await route.PUT(new Request('http://localhost/api/users', { method: 'PUT', body: JSON.stringify({ id: 'admin', resetPassword: true }) }));
  assert.equal(result.status, 409);
  assert.equal(writes, 0);
});

test('personal overview never includes another author or plan owner, validates dates and has no 200-row cap', async () => {
  const whereQueries = [];
  let sql;
  const tx = { audit: { count: async query => { whereQueries.push(query.where); return 917; }, findMany: async query => { whereQueries.push(query.where); assert.equal(query.take, 5); return []; } },
    visitPlan: { findMany: async query => { assert.equal(query.where.userId, 'reviewer'); return []; } },
    $queryRaw: async query => { sql = query; return [{ avgPct: 80, measured: 917 }]; },
  };
  const route = loader({ prisma: { $transaction: async callback => callback(tx) }, '@/lib/requireAuth': { requireAuth: async () => ({ error: null, session: { user: { id: 'reviewer', role: 'TU' } } }) } })('src/app/api/auditor/overview/route.ts');
  const response = await route.GET(new Request('http://localhost/api/auditor/overview?from=2026-10-01T00:00:00Z&userId=someone-else'));
  assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.total, 917); assert.equal(result.measured, 917);
  assert.ok(whereQueries.every(where => where.userId === 'reviewer'));
  assert.ok(sql.values.includes('reviewer')); assert.equal(sql.values.includes('someone-else'), false);
  assert.equal((await route.GET(new Request('http://localhost/api/auditor/overview?from=2026-02-30'))).status, 400);
});

test('a direct audit link cannot broaden history ownership', () => {
  const { auditFiltersSchema, historyWhere } = loader()('src/lib/auditHistory.ts');
  const where = historyWhere({ id: 'reviewer', role: 'AUDITOR' }, auditFiltersSchema.parse({ auditId: 'someone-elses-audit', scope: 'mine' }));
  assert.deepEqual(where.AND[0], { AND: [{ userId: 'reviewer' }, { userId: 'reviewer' }] });
  assert.deepEqual(where.AND[1], { id: 'someone-elses-audit' });
});
