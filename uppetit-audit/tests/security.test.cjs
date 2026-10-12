const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const root = path.resolve(__dirname, '..');

// Exercise the real TS modules and route handlers without loading .env or
// connecting to any database. All Prisma imports must be explicitly stubbed.
function loader(mocks = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(root, filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} }; cache.set(filename, compiledModule);
    const realRequire = createRequire(filename);
    function requireModule(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      let target = id.startsWith('@/') ? path.join(root, 'src', id.slice(2))
        : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (target) {
        if (path.basename(target) === 'prisma') {
          if (!mocks.prisma) throw new Error('Unmocked database access');
          return mocks.prisma;
        }
        if (Object.hasOwn(mocks, target)) return mocks[target];
        target = ['.ts', '.tsx', '.js'].map(ext => target + ext).find(fs.existsSync);
        if (target) return load(target);
      }
      return realRequire(id);
    }
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    new Function('require', 'module', 'exports', '__filename', '__dirname', source)(requireModule, compiledModule, compiledModule.exports, filename, path.dirname(filename));
    return compiledModule.exports;
  }
  return load;
}
const security = loader()('src/lib/security.ts');
const policy = loader()('src/lib/sessionPolicy.ts');
const access = loader()('src/lib/accessControl.ts');
const actor = { id: 'actor', role: 'AUDITOR' };
const session = { user: { ...actor, mfaRequired: false }, sessionId: 'session' };
const authenticated = async () => ({ error: null, session });
function post(url, data) { return new Request(`http://localhost${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }

test('installed NextAuth rejects malformed Bearer headers without throwing', async () => {
  const { getToken } = await import('next-auth/jwt');
  for (const value of ['%', '%ZZ', '%E0%A4%A', '%2', 'not-a-token']) {
    const req = new Request('https://app.example/api/users', {
      headers: { Authorization: `Bearer ${value}` },
    });
    assert.equal(await getToken({ req, secret: 'security-test-secret-not-for-production' }), null);
  }
});

test('scrypt passwords round-trip, reject tampering, and preserve legacy bcrypt', async () => {
  const password = 'correct horse battery staple';
  const hash = await security.hashPassword(password);
  assert.equal(await security.verifyPassword(password, hash), true);
  assert.equal(await security.verifyPassword('incorrect password', hash), false);
  assert.equal(await security.verifyPassword(password, 'scrypt$bad$hash'), false);
  const legacy = await require('bcryptjs').hash('legacy123', 10);
  assert.equal(await security.verifyPassword('legacy123', legacy), true);
  assert.equal(await security.verifyPassword('x'.repeat(129), legacy), false);
});
test('new password length boundaries', () => {
  for (const [size, allowed] of [[14, false], [15, true], [128, true], [129, false]]) assert.equal(security.passwordIsAllowed('a'.repeat(size)), allowed);
});
test('invitations are random, hashed, and expire at 24 hours / 15 minutes', () => {
  const invitation = security.issueInvite('INVITE', 1000), reset = security.issueInvite('RESET', 1000);
  assert.match(invitation.token, /^[\w-]{43}$/);
  assert.notEqual(invitation.token, reset.token);
  assert.notEqual(invitation.inviteTokenHash, invitation.token);
  assert.equal(invitation.inviteTokenHash, security.hashToken(invitation.token));
  assert.equal(invitation.inviteExpiresAt.getTime(), 1000 + 86400000);
  assert.equal(reset.inviteExpiresAt.getTime(), 1000 + 900000);
});
test('TOTP matches RFC 6238 SHA-1 test vectors', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  for (const [time, code] of [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']]) {
    assert.equal(security.totpCode(secret, Math.floor(time / 30), 8), code);
  }
  assert.equal(security.matchTotpStep(secret, '287082', 59000), 1n);
  assert.equal(security.matchTotpStep(secret, '287082', 180000), null);
  assert.equal(security.matchTotpStep(secret, 'bad', 59000), null);
});

test('TOTP accepts formatting whitespace without dropping digits or relaxing the time window', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  for (const code of ['287082', '287 082', ' 287\u00a0082 ', '287\u202f082', '287082\n']) {
    assert.equal(security.matchTotpStep(secret, code, 59000), 1n);
    assert.equal(security.matchTotpStep(secret, code, 180000), null);
  }
  for (const code of ['28708', '2870829', '287-082', 'x287082', '287082 287082']) {
    assert.equal(security.matchTotpStep(secret, code, 59000), null);
  }
});

test('MFA setup preserves all six digits when pasting formatted authenticator codes', async () => {
  const state = []; let cursor = 0;
  const originalFetch = global.fetch;
  const page = loader({
    react: { useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }];
    } },
    'next-auth/react': { useSession: () => ({ data: { user: { role: 'ADMIN', mfaRequired: true } }, update: async () => {} }) },
    '@/lib/clientSignOut': { secureSignOut() {} },
    '@/components/MfaEnrollmentQr': { MfaEnrollmentQr() {} },
    '@/components/ThemeToggle': { ThemeToggle() {} },
  })('src/app/setup-mfa/page.tsx').default;
  function render() { cursor = 0; return page(); }
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  }
  try {
    global.fetch = async () => Response.json({ secret: 'TEST', issuer: 'UPPETIT Audit', account: 'admin' });
    let view = render();
    find(view, node => node.type === 'input' && node.props.type === 'password').props.onChange({ target: { value: 'password' } });
    view = render();
    const start = find(view, node => node.type === 'button' && !node.props.disabled && !node.props.className?.includes('underline'));
    await start.props.onClick();
    for (const pasted of ['287 082', ' 287\u00a0082 ', '287\u202f082', '028 708']) {
      view = render();
      const input = find(view, node => node.type === 'input' && node.props.autoComplete === 'one-time-code');
      assert.ok(input.props.maxLength >= pasted.length, 'browser must not truncate a formatted OTP before normalization');
      input.props.onChange({ target: { value: pasted } });
      view = render();
      assert.equal(find(view, node => node.type === 'input' && node.props.autoComplete === 'one-time-code').props.value, pasted.replace(/\s/g, ''));
      assert.equal(find(view, node => node.type === 'button' && node.props.className?.includes('bg-orange-600')).props.disabled, false);
    }
  } finally { global.fetch = originalFetch; }
});
test('authenticator enrollment URI preserves labels and prevents parameter injection', () => {
  const { buildTotpEnrollmentUri } = loader()('src/lib/totpEnrollment.ts');
  const enrollment = { issuer: 'UPPETIT Audit', account: 'admin+test@example.com / &secret=WRONG?#', secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' };
  const uri = new URL(buildTotpEnrollmentUri(enrollment));
  assert.equal(uri.protocol, 'otpauth:'); assert.equal(uri.hostname, 'totp'); assert.equal(uri.hash, '');
  assert.equal(decodeURIComponent(uri.pathname.slice(1)), `${enrollment.issuer}:${enrollment.account}`);
  assert.equal(uri.searchParams.get('secret'), enrollment.secret);
  assert.equal(uri.searchParams.get('issuer'), enrollment.issuer);
  assert.equal(uri.searchParams.get('algorithm'), 'SHA1');
  assert.equal(uri.searchParams.get('digits'), '6'); assert.equal(uri.searchParams.get('period'), '30');
  assert.equal([...uri.searchParams].length, 5);
});
test('displayed QR codes decode to the correct account, secret and server TOTP parameters', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const jsQR = require('jsqr');
  const load = loader();
  const { MfaEnrollmentQr } = load('src/components/MfaEnrollmentQr.tsx');
  const { buildTotpEnrollmentUri } = load('src/lib/totpEnrollment.ts');
  for (const account of ['local.admin', 'user+audit@example.com / A&B', '\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440', 'a'.repeat(200)]) {
    const enrollment = { account, issuer: 'UPPETIT Audit', secret: security.generateTotpSecret() };
    const svg = renderToStaticMarkup(React.createElement(MfaEnrollmentQr, enrollment));
    assert.equal(svg.includes('<image'), false); assert.equal(svg.includes('href='), false);
    const modules = Number(svg.match(/viewBox="0 0 (\d+) \d+"/)[1]);
    const foreground = svg.match(/<path fill="#000000" d="([^"]+)"/)[1];
    // Rasterize the actual rendered SVG's horizontal module runs, then decode
    // with an independent QR reader instead of trusting the encoder's input.
    const scale = 4, size = modules * scale;
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
    for (const run of foreground.matchAll(/M(\d+)[ ,](\d+) ?h(\d+)v1H\d+z/g)) {
      const x = Number(run[1]), y = Number(run[2]), length = Number(run[3]);
      for (let row = y * scale; row < (y + 1) * scale; row++) {
        for (let column = x * scale; column < (x + length) * scale; column++) {
          const offset = (row * size + column) * 4;
          pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
        }
      }
    }
    const decoded = jsQR(pixels, size, size, { inversionAttempts: 'dontInvert' });
    assert.ok(decoded, 'QR must be readable');
    assert.equal(decoded.data, buildTotpEnrollmentUri(enrollment));
    const uri = new URL(decoded.data);
    const timeStep = Math.floor(Date.now() / 30000);
    assert.equal(security.totpCode(uri.searchParams.get('secret'), timeStep), security.totpCode(enrollment.secret, timeStep));
  }
});
test('MFA secrets use authenticated encryption with a separate key', () => {
  process.env.AUTH_MFA_SECRET = 'test-only-mfa-secret';
  const secret = security.generateTotpSecret();
  const encrypted = security.encryptTotp(secret);
  assert.equal(security.decryptTotp(encrypted), secret);
  assert.notEqual(security.encryptTotp(secret), encrypted);
  assert.equal(encrypted.includes(secret), false);
  const parts = encrypted.split('.'); parts[2] = Buffer.alloc(20).toString('base64url');
  assert.throws(() => security.decryptTotp(parts.join('.')));
  delete process.env.AUTH_MFA_SECRET;
  assert.throws(() => security.encryptTotp(secret), /AUTH_MFA_SECRET/);
  process.env.AUTH_MFA_SECRET = 'test-only-mfa-secret';
});
test('a TOTP or recovery code is consumed only once, including concurrent attempts', async () => {
  const secret = security.generateTotpSecret(); let lastStep = null;
  const backup = security.generateRecoveryCodes()[0], hashes = new Set([security.hashToken(backup)]);
  const user = { id: 'actor', authVersion: 2, totpEnabled: true, totpSecret: security.encryptTotp(secret) };
  const prisma = {
    user: { updateMany: async ({ where, data }) => {
      assert.equal(where.authVersion, 2); assert.equal(where.isActive, true);
      if (lastStep !== null && lastStep >= data.totpLastUsedStep) return { count: 0 };
      lastStep = data.totpLastUsedStep; return { count: 1 };
    } },
    $executeRaw: async (strings, hash) => Number(hashes.delete(hash)),
  };
  const mfa = loader({ prisma })('src/lib/mfa.ts');
  const code = security.totpCode(secret, Math.floor(Date.now() / 30000));
  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
  assert.deepEqual((await Promise.all([mfa.consumeSecondFactor(user, formattedCode), mfa.consumeSecondFactor(user, code)])).sort(), [false, true]);
  assert.deepEqual((await Promise.all([mfa.consumeSecondFactor(user, backup), mfa.consumeSecondFactor(user, backup)])).sort(), [false, true]);
  assert.equal(await mfa.consumeSecondFactor(user, 'invalid'), false);
});
test('sessions enforce idle and absolute limits, account blocking and revocation', () => {
  for (const role of ['ADMIN', 'TU', 'AUDITOR']) {
    const user = { role, authVersion: 0, isActive: true, passwordHash: 'hash' };
    const rules = policy.sessionPolicy(role);
    const record = { createdAt: new Date(0), lastActivityAt: new Date(0), expiresAt: new Date(rules.absoluteMs), authVersion: 0 };
    assert.equal(policy.sessionIsValid(record, user, rules.idleMs - 1), true);
    assert.equal(policy.sessionIsValid(record, user, rules.idleMs), false);
    const active = { ...record, lastActivityAt: new Date(rules.absoluteMs - 1) };
    assert.equal(policy.sessionIsValid(active, user, rules.absoluteMs - 1), true);
    assert.equal(policy.sessionIsValid(active, user, rules.absoluteMs), false);
    for (const changed of [{ isActive: false }, { passwordHash: null }, { authVersion: 1 }]) assert.equal(policy.sessionIsValid(record, { ...user, ...changed }, 1), false);
  }
});
test('JWT reads current database permissions and rejects old, deleted or revoked sessions', async () => {
  let config;
  const user = { ...actor, name: 'Current name', authVersion: 0, isActive: true, passwordHash: 'hash', totpEnabled: false };
  const record = { user, userId: actor.id, createdAt: new Date(), lastActivityAt: new Date(), expiresAt: new Date(Date.now() + 3600000), authVersion: 0, mfaVerified: false };
  let exists = true;
  const prisma = { authSession: { findUnique: async () => exists ? record : null } };
  loader({ prisma, 'next-auth': value => { config = value; return {}; }, 'next-auth/providers/credentials': value => value })('src/lib/auth.ts');
  assert.equal(await config.callbacks.jwt({ token: { id: actor.id } }), null);
  let token = await config.callbacks.jwt({ token: { id: actor.id, sessionId: 'session', role: 'ADMIN' } });
  assert.equal(token.role, 'AUDITOR');
  user.role = 'ADMIN'; token = await config.callbacks.jwt({ token }); assert.equal(token.mfaRequired, true);
  user.authVersion++; assert.equal(await config.callbacks.jwt({ token }), null);
  user.authVersion--; exists = false; assert.equal(await config.callbacks.jwt({ token }), null);
});
test('unknown credentials cannot auto-create a development administrator', async () => {
  let config;
  const prisma = { user: { findMany: async () => [] }, $queryRaw: async () => [{ count: 1 }] };
  loader({ prisma, 'next-auth': value => { config = value; return {}; }, 'next-auth/providers/credentials': value => value })('src/lib/auth.ts');
  const result = await config.providers[0].authorize({ login: 'newadmin', password: 'anything' }, new Request('http://localhost'));
  assert.equal(result, null);
});
test('successful login creates a random server session with explicit UTC dates and role limits', async () => {
  let config, created;
  const user = { ...actor, isActive: true, passwordHash: 'hash', authVersion: 3, totpEnabled: false };
  const prisma = { user: { findMany: async () => [user] }, $queryRaw: async () => [{ count: 1 }], authSession: { create: async ({ data }) => { created = data; } } };
  loader({ prisma, './security': { ...security, verifyPassword: async () => true },
    'next-auth': value => { config = value; return {}; }, 'next-auth/providers/credentials': value => value,
  })('src/lib/auth.ts');
  for (const role of ['ADMIN', 'AUDITOR', 'TU']) {
    user.role = role;
    const result = await config.providers[0].authorize({ login: 'actor', password: 'password' }, new Request('http://localhost'));
    assert.match(created.id, /^[a-f0-9-]{36}$/); assert.equal(result.sessionId, created.id);
    assert.equal(created.authVersion, 3); assert.equal(created.lastActivityAt.getTime(), created.createdAt.getTime());
    assert.equal(created.expiresAt.getTime() - created.createdAt.getTime(), policy.sessionPolicy(role).absoluteMs);
  }
});
test('MFA enrollment sessions cannot access business APIs', async () => {
  const guarded = loader({ '@/lib/auth': { auth: async () => ({ ...session, user: { id: 'admin', role: 'ADMIN', mfaRequired: true } }) } })('src/lib/requireAuth.ts');
  assert.equal((await guarded.requireAuth()).error.status, 403);
  assert.equal((await guarded.requireAuth(['ADMIN'], { allowMfaEnrollment: true })).error, null);
  assert.equal((await guarded.requireAuth(['TU'], { allowMfaEnrollment: true })).error.status, 403);
});
test('trusted proxy headers are opt-in and rate limiting uses hashed identifiers', async () => {
  let captured;
  const rate = loader({ prisma: { $queryRaw: async (strings, ...values) => { captured = values; return [{ count: 11 }]; } } })('src/lib/rateLimit.ts');
  delete process.env.AUTH_TRUSTED_IP_HEADER;
  const request = new Request('http://localhost', { headers: { 'x-forwarded-for': 'spoofed', 'x-real-ip': 'trusted' } });
  assert.equal(rate.clientAddress(request), 'unknown');
  process.env.AUTH_TRUSTED_IP_HEADER = 'x-real-ip'; assert.equal(rate.clientAddress(request), 'trusted');
  delete process.env.AUTH_TRUSTED_IP_HEADER;
  assert.equal(await rate.consumeRateLimit('login', 'identifier', 10), false);
  assert.equal(captured[0], security.hashToken('login:identifier'));
});
test('object permission predicates distinguish administrators, auditors and managed locations', () => {
  assert.deepEqual(access.auditAccessWhere(actor), { userId: actor.id });
  assert.deepEqual(access.auditAccessWhere({ ...actor, role: 'ADMIN' }), {});
  assert.deepEqual(access.auditAccessWhere({ ...actor, role: 'TU' }), { OR: [{ userId: actor.id }, { location: { OR: [{ tuId: actor.id }, { tus: { some: { id: actor.id } } }] } }] });
  assert.deepEqual(access.planWriteWhere(actor), { userId: actor.id });
});
const items = [{ id: 'q1', text: 'First', zone: 'A', score: 10, photoRequirement: 'VIOLATION' }, { id: 'q2', text: 'Second', zone: 'B', score: 5, photoRequirement: 'OPTIONAL' }];
const answers = [{ itemId: 'q1', questionText: 'spoofed', isOk: false, photos: ['https://photos/audits/1.jpg'], penalty: 0 }, { itemId: 'q2', isOk: true, photos: [] }];
test('server calculates canonical questions, penalties and scores', () => {
  const result = access.calculateAudit(items, answers);
  assert.equal(result.score, 5); assert.equal(result.maxScore, 15);
  assert.equal(result.answers[0].question, 'First'); assert.equal(result.answers[0].penalty, 10);
});
test('audit calculation rejects missing, repeated, unknown and photo-less required answers', () => {
  assert.throws(() => access.calculateAudit(items, answers.slice(0, 1)));
  assert.throws(() => access.calculateAudit(items, [answers[0], answers[0]]));
  assert.throws(() => access.calculateAudit(items, [{ ...answers[0], itemId: 'unknown' }, answers[1]]));
  assert.throws(() => access.calculateAudit(items, [{ ...answers[0], photos: [] }, answers[1]]));
});
test('photo URLs are confined to the configured HTTPS audit folder', () => {
  process.env.S3_PUBLIC_URL = 'https://photos/bucket';
  const photo = loader()('src/lib/photoPolicy.ts').isAuditPhotoUrl;
  assert.equal(photo('https://photos/bucket/audits/1.jpg'), true);
  for (const url of ['http://photos/bucket/audits/1.jpg', 'https://other/bucket/audits/1.jpg', 'https://photos/bucket/private.jpg', 'https://photos/bucket/audits/../private.jpg', 'https://photos/bucket/audits/1.jpg?token=secret', 'data:image/png;base64,abc']) assert.equal(photo(url), false);
});
test('schedule responses select public fields and cannot leak credentials', async () => {
  let query;
  const route = loader({ prisma: { visitPlan: { findMany: async value => { query = value; return []; } } }, '@/lib/requireAuth': { requireAuth: authenticated } })('src/app/api/schedule/route.ts');
  assert.equal((await route.GET(new Request('http://localhost/api/schedule?userId=victim'))).status, 200);
  assert.equal(query.where.userId, actor.id);
  for (const relation of ['user', 'assigner']) assert.deepEqual(query.include[relation], { select: access.publicUserSelect });
});
test('schedule cannot assign other users or delete their plans', async () => {
  let predicate;
  const route = loader({ prisma: { visitPlan: { deleteMany: async value => { predicate = value.where; return { count: 0 }; } } }, '@/lib/requireAuth': { requireAuth: authenticated } })('src/app/api/schedule/route.ts');
  assert.equal((await route.POST(post('/api/schedule', { userId: 'victim', locationId: 'location', date: '2026-10-09' }))).status, 403);
  assert.equal((await route.DELETE(new Request('http://localhost/api/schedule?id=foreign'))).status, 404);
  assert.deepEqual(predicate, { id: 'foreign', userId: actor.id });
});
test('Excel export refuses mixed accessible and inaccessible audit IDs', async () => {
  let predicate;
  const route = loader({ prisma: { audit: { findMany: async value => { predicate = value.where; return [{ id: 'own' }]; } } }, '@/lib/requireAuth': { requireAuth: authenticated } })('src/app/api/audits/export/route.ts');
  const response = await route.POST(post('/api/audits/export', { auditIds: ['own', 'foreign'] }));
  assert.equal(response.status, 403); assert.equal(predicate.userId, actor.id);
});
test('PDF requires ownership before fetching fonts or rendering the report', async () => {
  let predicate;
  const route = loader({ prisma: { audit: { findFirst: async value => { predicate = value.where; return null; } } },
    '@/lib/requireAuth': { requireAuth: authenticated },
    '@react-pdf/renderer': { Font: { register() {} }, StyleSheet: { create: value => value } },
  })('src/app/api/pdf/[id]/route.tsx');
  assert.equal((await route.GET(new Request('http://localhost/api/pdf/foreign'), { params: Promise.resolve({ id: 'foreign' }) })).status, 404);
  assert.deepEqual(predicate, { id: 'foreign', userId: actor.id });
});
test('audit POST binds author to session, ignores spoofed totals, and enforces version/role/location', async () => {
  process.env.S3_PUBLIC_URL = 'https://photos';
  let mode = 'allowed', created;
  const prisma = {
    checklistVersion: { findFirst: async () => ({ id: 'version', items, checklist: { isArchived: false, allowedRoles: mode === 'role' ? ['ADMIN'] : ['AUDITOR'] } }) },
    user: { findUnique: async () => ({ login: 'actor' }), findMany: async () => [] },
    location: { findFirst: async () => mode === 'location' ? null : ({ name: 'Location', isActive: true, tus: [], tuId: null }) },
    audit: { create: async ({ data }) => { created = data; return { id: 'new' }; } },
    visitPlan: { updateMany: async () => ({ count: 0 }) },
  };
  const route = loader({ prisma, '@/lib/requireAuth': { requireAuth: authenticated }, '@/lib/s3': { s3Client: {} }, 'web-push': { setVapidDetails() {} } })('src/app/api/audits/route.ts');
  const body = { userId: 'victim', locationId: 'location', checklistId: 'checklist', checklistVersionId: 'version', score: 999, maxScore: 999, shiftEmployees: ['Employee'], answers: answers.map(a => ({ questionText: 'spoofed', ...a })) };
  assert.equal((await route.POST(post('/api/audits', body))).status, 200);
  assert.equal(created.userId, actor.id); assert.equal(created.score, 5); assert.equal(created.maxScore, 15);
  assert.equal(created.answers.create[0].penalty, 10);
  assert.equal((await route.POST(post('/api/audits', { ...body, checklistVersionId: 'old' }))).status, 409);
  mode = 'role'; assert.equal((await route.POST(post('/api/audits', body))).status, 403);
  mode = 'location'; assert.equal((await route.POST(post('/api/audits', body))).status, 403);
  mode = 'allowed'; assert.equal((await route.POST(post('/api/audits', { ...body, answers: [body.answers[0]] }))).status, 400);
});
test('password setup validates hashed invitation and consumes it atomically', async () => {
  let query, write, consumed = false;
  const prisma = {
    user: { findFirst: async value => { query = value.where; return { id: 'actor' }; }, updateMany: async value => { write = value; if (consumed) return { count: 0 }; consumed = true; return { count: 1 }; } },
    authSession: { deleteMany: async () => ({ count: 1 }) },
    $queryRaw: async () => [{ count: 1 }],
    $transaction: async fn => fn(prisma),
  };
  const route = loader({ prisma })('src/app/api/setup-password/route.ts');
  const body = { token: 'x'.repeat(43), password: 'a secure long phrase' };
  assert.equal((await route.POST(post('/api/setup-password', { ...body, password: 'short' }))).status, 400);
  assert.equal((await route.POST(post('/api/setup-password', body))).status, 200);
  assert.equal(query.inviteTokenHash, security.hashToken(body.token)); assert.ok(query.inviteExpiresAt.gt instanceof Date);
  assert.equal(write.data.inviteTokenHash, null); assert.equal(write.data.inviteExpiresAt, null);
  assert.deepEqual(write.data.authVersion, { increment: 1 });
  assert.equal((await route.POST(post('/api/setup-password', body))).status, 400);
});
test('MFA enrollment requires password, persists only encrypted secrets, and consumes confirmation once', async () => {
  let secretStarted, codesIssued, deleteOthers;
  const user = { id: 'admin', login: 'admin', authVersion: 0, isActive: true, passwordHash: 'hash', totpEnabled: false };
  const record = { id: 'session', authVersion: 0, pendingTotp: null, pendingTotpUntil: null };
  const prisma = {
    user: { findUnique: async () => ({ ...user }), updateMany: async ({ where, data }) => {
      assert.equal(where.authVersion, user.authVersion);
      codesIssued = data.recoveryHashes; Object.assign(user, data, { authVersion: user.authVersion + 1 }); return { count: 1 };
    } },
    authSession: {
      update: async ({ data }) => { Object.assign(record, data); if (data.pendingTotp) secretStarted = data.pendingTotp; return record; },
      findUnique: async () => ({ ...record }),
      updateMany: async ({ where, data }) => { if (record.pendingTotp !== where.pendingTotp) return { count: 0 }; Object.assign(record, data); return { count: 1 }; },
      deleteMany: async ({ where }) => { deleteOthers = where; return { count: 1 }; },
    },
    $queryRaw: async () => [{ count: 1 }],
    $transaction: async fn => fn(prisma),
  };
  const route = loader({ prisma,
    '@/lib/requireAuth': { requireAuth: async (roles, options) => { assert.deepEqual(roles, ['ADMIN']); assert.equal(options.allowMfaEnrollment, true); return { error: null, session: { ...session, user: { id: 'admin', role: 'ADMIN' } } }; } },
    '@/lib/security': { ...security, verifyPassword: async password => password === 'password' },
  })('src/app/api/mfa/route.ts');
  assert.equal((await route.POST(post('/api/mfa', { action: 'start', password: 'wrong' }))).status, 403);
  const started = await (await route.POST(post('/api/mfa', { action: 'start', password: 'password' }))).json();
  assert.equal(user.totpEnabled, false); assert.equal(security.decryptTotp(secretStarted), started.secret);
  const invalid = await route.POST(post('/api/mfa', { action: 'confirm', password: 'password', code: '123 45' }));
  assert.equal(invalid.status, 400);
  const failure = await invalid.json();
  assert.ok(Number.isFinite(Date.parse(failure.serverTime)));
  assert.equal(JSON.stringify(failure).includes(started.secret), false);
  assert.equal(user.totpEnabled, false); assert.equal(record.pendingTotp, secretStarted);
  const code = security.totpCode(started.secret, Math.floor(Date.now() / 30000));
  const confirmed = await route.POST(post('/api/mfa', { action: 'confirm', password: 'password', code: ` ${code.slice(0, 3)}\u00a0${code.slice(3)} ` }));
  assert.equal(confirmed.status, 200);
  const data = await confirmed.json(); assert.equal(data.recoveryCodes.length, 10);
  assert.deepEqual(codesIssued, data.recoveryCodes.map(security.hashToken));
  assert.equal(user.totpEnabled, true); assert.equal(user.totpSecret, secretStarted); assert.equal(user.authVersion, 1);
  assert.equal(record.authVersion, 1); assert.equal(record.mfaVerified, true);
  assert.deepEqual(deleteOthers, { userId: 'admin', id: { not: 'session' } });
  assert.equal((await route.POST(post('/api/mfa', { action: 'confirm', password: 'password', code }))).status, 400);
});
test('user management responses omit secrets, and role/block/reset changes revoke sessions', async () => {
  let current = { id: 'other', name: 'Employee', login: 'employee', role: 'AUDITOR', isActive: true, authVersion: 0, passwordHash: 'sensitive', totpSecret: 'secret', recoveryHashes: ['secret'], invitePurpose: null };
  let revoked = [], writes = [];
  const prisma = {
    user: {
      findMany: async ({ select }) => [{ ...Object.fromEntries(Object.keys(select).map(key => [key, current[key]])) }],
      findUnique: async () => current, findFirst: async () => null,
      update: async ({ data, select }) => { writes.push(data); Object.assign(current, data); return Object.fromEntries(Object.keys(select || current).map(key => [key, current[key]])); },
    },
    authSession: { deleteMany: async ({ where }) => { revoked.push(where.userId); return { count: 1 }; } },
    $transaction: async fn => fn(prisma),
  };
  const route = loader({ prisma, '@/lib/requireAuth': { requireAuth: async () => ({ error: null, session: { ...session, user: { id: 'admin', role: 'ADMIN' } } }) } })('src/app/api/users/route.ts');
  const data = await (await route.GET()).json();
  for (const name of ['passwordHash', 'totpSecret', 'recoveryHashes', 'inviteTokenHash', 'inviteToken', 'pushSubscription']) assert.equal(name in data[0], false);
  assert.equal(data[0].hasPassword, true);
  assert.equal((await route.PUT(post('/api/users', { id: 'other', role: 'TU' }))).status, 200);
  assert.deepEqual(writes.at(-1).authVersion, { increment: 1 });
  assert.equal((await route.PUT(post('/api/users', { id: 'other', isActive: false }))).status, 200);
  assert.equal((await route.PUT(post('/api/users', { id: 'other', resetPassword: true }))).status, 200);
  assert.equal(writes.at(-1).passwordHash, null); assert.ok(writes.at(-1).inviteTokenHash); assert.ok(writes.at(-1).inviteExpiresAt instanceof Date);
  assert.equal('inviteToken' in writes.at(-1), false); assert.deepEqual(revoked, ['other', 'other', 'other']);
  assert.equal((await route.PUT(post('/api/users', { id: 'admin', isActive: false }))).status, 403);
});
test('proxy protects APIs, preserves recovery access, uses secure cookies and rejects cross-site requests', async () => {
  const { NextRequest } = require('next/server');
  let token = null, options;
  const route = loader({ 'next-auth/jwt': { getToken: async value => { options = value; return token; } } })('src/proxy.ts');
  delete process.env.AUTH_URL; delete process.env.NEXTAUTH_URL;
  assert.equal((await route.proxy(new NextRequest('https://localhost/api/users'))).status, 401);
  assert.equal(options.secureCookie, true);
  assert.equal((await route.proxy(new NextRequest('https://localhost/'))).status, 200);
  assert.equal((await route.proxy(new NextRequest('https://localhost/setup-password'))).status, 200);
  assert.equal((await route.proxy(new NextRequest('https://localhost/api/cron/cleanup-security'))).status, 200);
  token = { sessionId: 'session', absoluteExpiresAt: Date.now() + 10000, role: 'ADMIN', mfaRequired: false };
  let result = await route.proxy(new NextRequest('https://localhost/api/users'));
  assert.equal(result.status, 200); assert.match(result.headers.get('cache-control'), /no-store/);
  assert.equal((await route.proxy(new NextRequest('https://localhost/api/users', { method: 'POST', headers: { origin: 'https://attacker' } }))).status, 403);
  token.mfaRequired = true;
  result = await route.proxy(new NextRequest('https://localhost/admin/users')); assert.equal(result.headers.get('location'), 'https://localhost/setup-mfa');
  token = { role: 'ADMIN' }; assert.equal((await route.proxy(new NextRequest('https://localhost/api/users'))).status, 401);
});
test('encrypted drafts cannot be read by another account or resurrected after logout', async () => {
  global.crypto = webcrypto;
  class Storage {
    getItem(key) { return this[key] ?? null; }
    setItem(key, value) { this[key] = value; }
    removeItem(key) { delete this[key]; }
  }
  global.localStorage = new Storage();
  const drafts = loader()('src/lib/draftStorage.ts'); const key = 'ab'.repeat(32);
  const privateData = { employee: 'Private Person', comment: 'private observation' };
  await drafts.writeDraft('a', 'audit', key, privateData);
  assert.equal(localStorage.getItem(drafts.draftStorageKey('a', 'audit')).includes('Private Person'), false);
  assert.deepEqual(await drafts.readDraft('a', 'audit', key), privateData);
  assert.equal(await drafts.readDraft('b', 'audit', key), null);
  localStorage.setItem(drafts.draftStorageKey('b', 'audit'), localStorage.getItem(drafts.draftStorageKey('a', 'audit')));
  await assert.rejects(drafts.readDraft('b', 'audit', key));
  await assert.rejects(drafts.readDraft('a', 'audit', 'cd'.repeat(32)));
  const writing = drafts.writeDraft('a', 'queued', key, privateData);
  localStorage.setItem('audit_draft_old', 'private'); localStorage.setItem('last_active_audit', 'private');
  drafts.clearDrafts('a'); await writing;
  assert.equal(Object.keys(localStorage).some(name => name.includes(':a:') || name.startsWith('audit_draft_') || name === 'last_active_audit'), false);
  delete global.localStorage;
});
