const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/module-loader.cjs');
const ExcelJS = require('exceljs');
const actor = { id: 'reviewer', role: 'AUDITOR' };
const guard = user => ({ requireAuth: async () => ({ session: { user }, error: null }) });
const request = params => new Request('http://localhost/api/audits?' + params);
const post = body => new Request('http://localhost/api/audits/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const audit = n => ({ id: `audit-${n}`, date: new Date('2026-10-09T23:00:00Z'), userId: actor.id,
  locationId: 'location', locationName: `Точка ${n}`, auditorName: 'Проверяющий', tuName: 'ТУ', score: 80, maxScore: 100,
  shiftEmployees: [], generalComment: '', user: { id: actor.id, name: 'Проверяющий', login: 'reviewer' }, location: { id: 'location', name: 'Точка', tus: [] },
  checklistVersion: { id: 'version', checklistId: 'checklist', version: 1, checklist: { id: 'checklist', title: 'Качество', redThreshold: 70, yellowThreshold: 90 }, items: [] }, answers: [] });
const historyRoute = (db, user = actor) => loader({ prisma: db, '@/lib/requireAuth': guard(user), '@/lib/s3': { s3Client: {} }, 'web-push': { setVapidDetails() {} } })('src/app/api/audits/route.ts');

test('history reaches records beyond 200 and returns the real total with stable pagination', async () => {
  let query, transactionOptions;
  const tx = { audit: { count: async () => 917, findMany: async value => { query = value; return Array.from({ length: 25 }, (_, i) => audit(value.skip + i)); } } };
  const route = historyRoute({ $transaction: async (callback, options) => { transactionOptions = options; return callback(tx); } }, { id: 'admin', role: 'ADMIN' });
  const response = await route.GET(request('page=10&pageSize=25'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.total, 917); assert.equal(body.totalPages, 37); assert.equal(body.audits[0].id, 'audit-225');
  assert.equal(query.take, 25); assert.equal(query.skip, 225);
  assert.deepEqual(query.orderBy, [{ date: 'desc' }, { id: 'desc' }]);
  assert.equal(transactionOptions.isolationLevel, 'RepeatableRead');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(query.include.user.select.passwordHash, undefined);
});

test('pagination clamps the last page after deletion instead of showing a blank page', async () => {
  let query;
  const route = historyRoute({ $transaction: async callback => callback({ audit: { count: async () => 11, findMany: async value => { query = value; return [audit(10)]; } } }) });
  const body = await (await route.GET(request('page=99&pageSize=10'))).json();
  assert.equal(body.page, 2); assert.equal(query.skip, 10); assert.equal(body.totalPages, 2);
});

test('history search, count and export predicates preserve role restrictions and exact time boundaries', () => {
  const { historyWhere, auditFiltersSchema } = loader()('src/lib/auditHistory.ts');
  const filters = auditFiltersSchema.parse({ from: '2026-10-09T21:00:00.000Z', to: '2026-10-10T20:59:59.999Z', search: 'Архив', scope: 'mine', tus: ['Анна'] });
  const where = historyWhere(actor, filters);
  assert.deepEqual(where.AND[0], { AND: [{ userId: 'reviewer' }, { userId: 'reviewer' }] });
  assert.equal(where.AND[1].date.gte.toISOString(), filters.from);
  assert.equal(where.AND[1].date.lte.toISOString(), filters.to);
  assert.equal(where.AND.at(-1).OR[0].locationName.contains, 'Архив');
  const tu = historyWhere({ id: 'tu', role: 'TU' }, auditFiltersSchema.parse({ search: 'foreign' }));
  assert.ok(tu.AND[0].AND[0].OR.some(part => part.location));
});

test('bad paging and invalid calendar ranges are rejected before querying the database', async () => {
  const route = historyRoute({ $transaction() { throw Error('Database must not be called'); } });
  for (const params of ['page=0', 'page=1&pageSize=2000', 'page=1.5', 'page=1&sort=bad', 'page=1&from=2026-10-11&to=2026-10-10', 'page=1&from=2026-02-30', 'page=1&to=2026-02-30', 'page=1&from=garbage']) {
    assert.equal((await route.GET(request(params))).status, 400, params);
  }
});

test('calendar helpers preserve explicit timezone instants and handle leap dates', () => {
  const dates = loader()('src/lib/reportDates.ts');
  assert.equal(dates.parseReportRange('2024-02-29', '2024-02-29').lte.toISOString(), '2024-02-29T23:59:59.999Z');
  assert.equal(dates.parseReportRange('2026-10-10T00:00:00+03:00').gte.toISOString(), '2026-10-09T21:00:00.000Z');
  assert.equal(dates.reportCalendarDate(new Date('2026-10-09T23:00:00Z'), 'Europe/Moscow').toISOString().slice(0, 10), '2026-10-10');
  assert.throws(() => dates.parseReportRange('2025-02-29'));
  assert.throws(() => dates.serializeReportRange('2026-10-11', '2026-10-10'));
});

test('filter options include the entire permitted history without loading answers or secrets', async () => {
  let query;
  const route = loader({ prisma: { audit: { findMany: async value => { query = value; return [audit(1), audit(900)]; } } }, '@/lib/requireAuth': guard(actor) })('src/app/api/audits/filters/route.ts');
  const body = await (await route.GET(request('scope=mine'))).json();
  assert.ok(body.locations.includes('Точка 900'));
  assert.equal(query.take, undefined); assert.equal(query.select.answers, undefined);
  assert.deepEqual(query.where.AND, [{ userId: actor.id }, { userId: actor.id }]);
  assert.deepEqual(query.select.user.select, { name: true, login: true });
});

test('filtered Excel exports all 917 matching audits, not just a page or the first 200', async () => {
  let query;
  const route = loader({ prisma: { audit: { findMany: async value => { query = value; return Array.from({ length: 917 }, (_, i) => audit(i)); } } }, '@/lib/requireAuth': guard(actor) })('src/app/api/audits/export/route.ts');
  const response = await route.POST(post({ filters: { search: 'Точка', scope: 'mine' }, timeZone: 'Europe/Moscow' }));
  assert.equal(response.status, 200); assert.deepEqual(query.where.AND[0].AND, [{ userId: actor.id }, { userId: actor.id }]);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
  const sheet = workbook.worksheets[0]; assert.equal(sheet.rowCount, 918);
  assert.equal(sheet.getRow(2).getCell(1).value, '10.10.2026'); assert.equal(sheet.getRow(2).getCell(2).value, '02:00');
});

test('legacy array responses still work for previously installed clients', async () => {
  const route = historyRoute({ audit: { findMany: async () => [audit(1)] } });
  const body = await (await route.GET(request(''))).json();
  assert.equal(Array.isArray(body), true); assert.equal(body[0].checklist.title, 'Качество');
});

test('dashboard uses all audits and groups late UTC events by the viewer calendar day', async () => {
  let query;
  const db = { audit: { findMany: async value => { query = value; return Array.from({ length: 917 }, (_, i) => audit(i)); } }, location: { findMany: async () => [] } };
  db.$transaction = async callback => callback(db);
  const route = loader({ prisma: db, '@/lib/requireAuth': guard({ id: 'admin', role: 'ADMIN' }) })('src/app/api/dashboard/route.ts');
  const response = await route.GET(new Request('http://localhost/api/dashboard?timeZone=Europe/Moscow'));
  const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.totalAudits, 917); assert.equal(query.take, undefined);
  assert.deepEqual(body.trendData.map(({ date, count }) => ({ date, count })), [{ date: '10.10', count: 917 }]); assert.equal(body.avgPct, 80);
  assert.equal(body.zones.reduce((sum, zone) => sum + zone.value, 0), 917);
});

test('dashboard rejects invalid periods and preserves TU territory permissions', async () => {
  let query;
  const db = { audit: { findMany: async value => { query = value; return []; } }, location: { findMany: async () => [] } };
  db.$transaction = async callback => callback(db);
  const route = loader({ prisma: db, '@/lib/requireAuth': guard({ id: 'tu', role: 'TU' }) })('src/app/api/tu/dashboard/route.ts');
  assert.equal((await route.GET(new Request('http://localhost/api/tu/dashboard?from=wrong'))).status, 400);
  assert.equal((await route.GET(new Request('http://localhost/api/tu/dashboard?timeZone=invalid'))).status, 400);
  assert.equal((await route.GET(new Request('http://localhost/api/tu/dashboard'))).status, 200);
  assert.deepEqual(query.where.OR, [{ location: { tus: { some: { id: 'tu' } } } }, { location: { tuId: 'tu' } }]);
});
