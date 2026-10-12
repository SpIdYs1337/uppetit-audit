const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { loader } = require('./helpers/module-loader.cjs');
const load = loader();
const { buildDashboardMetrics, dashboardAuditFacts } = load('src/lib/dashboardMetrics.ts');
const { dashboardFiltersSchema, dashboardRange, dashboardWhere } = loader({ prisma: {} })('src/lib/dashboardReport.ts');
const make = (id, overrides = {}) => ({ id, date: new Date('2026-10-10T08:00:00Z'), score: 80, maxScore: 100, locationId: 'loc', locationName: 'Точка', userId: 'auditor', auditorName: 'Аудитор', tuName: 'ТУ', shiftEmployees: ['Смена'], generalComment: 'Общий комментарий',
  location: { name: 'Точка', address: 'Адрес', tus: [{ id: 'tu', name: 'ТУ', login: 'tu' }], tu: null }, user: { id: 'auditor', name: 'Аудитор', login: 'auditor' },
  checklistVersion: { version: 1, checklistId: 'cl', checklist: { title: 'Качество', redThreshold: 70, yellowThreshold: 90 }, items: [{ id: 'item', text: 'Чистота', zone: 'Кухня', isCritical: true, score: 20, photoRequirement: 'VIOLATION' }] },
  answers: [{ id: 'ans-' + id, itemId: 'item', question: 'Чистота', zone: 'Кухня', isOk: false, penalty: 20, comment: 'Исправить', photos: ['https://storage.example.test/photo.jpg'] }], ...overrides });
test('quality is weighted by valid maxima, unknown records never become zero scores or clean audits', () => {
  const result = buildDashboardMetrics([make('a'), make('b', { score: 150, maxScore: 200 }), make('unknown', { maxScore: null, answers: [] })], [], 'Europe/Moscow', false);
  assert.equal(result.summary.qualityPct, 76.7); assert.equal(result.summary.score, 230); assert.equal(result.summary.max, 300);
  assert.equal(result.summary.scoredAudits, 2); assert.equal(result.summary.unknownScores, 1); assert.equal(result.summary.emptyAudits, 1);
  assert.equal(result.summary.cleanAudits, 0); assert.equal(result.unknownZone, 1);
  assert.equal(result.comparison.qualityDelta, null); assert.equal(result.comparison.totalChangePct, null);
  assert.equal(dashboardAuditFacts(make('b', { score: 150, maxScore: 200 })).zone, 'green', 'Checklist thresholds are absolute points, not percentages');
});
test('problem rates use checked audits, repeated questions in one audit do not create recurrence', () => {
  const repeatedAnswer = make('a'); repeatedAnswer.answers.push({ ...repeatedAnswer.answers[0], id: 'another' });
  const other = make('unrelated', { checklistVersion: { ...make('x').checklistVersion, checklistId: 'other', checklist: { ...make('x').checklistVersion.checklist, title: 'Другое' } } });
  const result = buildDashboardMetrics([repeatedAnswer, make('b'), other, make('empty', { answers: [] })], [], 'UTC', false);
  const item = result.problemStats.find(row => row.checklist === 'Качество');
  assert.equal(item.count, 2); assert.equal(item.checkedAudits, 2); assert.equal(item.incidents, 3); assert.equal(item.pct, 100); assert.equal(item.repeatedLocations, 1);
  assert.equal(result.problemStats.length, 2); assert.equal(result.summary.repeatedProblems, 1);
  assert.equal(buildDashboardMetrics([repeatedAnswer], [], 'UTC', false).summary.repeatedProblems, 0);
});
test('historic item matching requires an unambiguous text and section; photo obligations distinguish failure-only', () => {
  const audit = make('historic'); audit.answers[0].itemId = null; audit.answers[0].photos = [];
  assert.equal(dashboardAuditFacts(audit).critical.length, 1);
  let result = buildDashboardMetrics([audit], [], 'UTC', false);
  assert.equal(result.summary.missingRequiredPhotos, 1); assert.equal(result.summary.evidencePct, 0);
  audit.checklistVersion.items.push({ ...audit.checklistVersion.items[0], id: 'duplicate' });
  result = buildDashboardMetrics([audit], [], 'UTC', false);
  assert.equal(result.summary.criticalViolations, 0); assert.equal(result.summary.unmatchedAnswers, 1);
  const clean = make('clean'); clean.answers[0].isOk = true; clean.answers[0].penalty = 0; clean.answers[0].photos = [];
  result = buildDashboardMetrics([clean], [], 'UTC', false); assert.equal(result.summary.requiredPhotos, 0); assert.equal(result.summary.cleanPct, 100); assert.equal(result.summary.evidencePct, null);
});
test('comparison uses percentage points and never reports fictitious 100 percent growth from zero', () => {
  const result = buildDashboardMetrics([make('a', { score: 90 })], [make('prev')], 'UTC', true);
  assert.equal(result.comparison.qualityDelta, 10); assert.equal(result.comparison.totalChangePct, 0);
  assert.equal(buildDashboardMetrics([make('a')], [], 'UTC', true).comparison.totalChangePct, null);
  const range = dashboardRange(dashboardFiltersSchema.parse({ from: '2026-10-09T21:00:00.000Z', to: '2026-10-10T20:59:59.999Z' }));
  assert.equal(range.previous.gte.toISOString(), '2026-10-08T21:00:00.000Z'); assert.equal(range.previous.lte.toISOString(), '2026-10-09T20:59:59.999Z');
});
test('zero-check days are visible, missing quality is a gap, and granularity follows the selected period', () => {
  const result = buildDashboardMetrics([make('a')], [], 'Europe/Moscow', true, { gte: new Date('2026-10-08T21:00:00Z'), lte: new Date('2026-10-11T20:59:59Z') });
  assert.deepEqual(result.trendData.map(row => ({ date: row.date, count: row.count, pct: row.pct })), [{ date: '09.10', count: 0, pct: null }, { date: '10.10', count: 1, pct: 80 }, { date: '11.10', count: 0, pct: null }]);
  const year = buildDashboardMetrics([make('a')], [], 'UTC', false, { gte: new Date('2025-01-01'), lte: new Date('2026-12-31') });
  assert.equal(year.trendType, 'По годам'); assert.equal(year.trendData.length, 2);
});
function dbFor(audits) {
  const queries = [];
  const db = { audit: { findMany: async query => { queries.push(query); return audits; } }, location: { findMany: async () => [{ id: 'loc', name: 'Точка', address: 'Адрес', isActive: true, activeFrom: null, activeTo: null }, { id: 'unvisited', name: 'Без проверки', address: '', isActive: true, activeFrom: null, activeTo: null }] } };
  db.$transaction = async (callback, options) => { assert.equal(options.isolationLevel, 'RepeatableRead'); return callback(db); };
  return { db, queries };
}
const guard = roles => ({ requireAuth: async allowed => allowed.includes(roles.role) ? { session: { user: roles } } : { error: new Response('Forbidden', { status: 403 }) } });
test('a full dataset drives metrics; API pages details while Excel contains every audit and answer', async () => {
  const { db, queries } = dbFor(Array.from({ length: 917 }, (_, i) => make(`audit-${String(i).padStart(4, '0')}`)));
  const mocked = loader({ prisma: db, '@/lib/requireAuth': guard({ id: 'admin', role: 'ADMIN' }) });
  const response = await mocked('src/app/api/dashboard/route.ts').GET(new Request('http://localhost/api/dashboard?auditPage=37&timeZone=Europe/Moscow'));
  const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.totalAudits, 917); assert.equal(body.auditRecords.items.length, 17); assert.equal(body.auditRecords.total, 917);
  assert.equal(body.coverage.pct, 50); assert.equal(body.locationStats.length, 1); assert.equal(body.summary.criticalViolations, 917); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(queries.every(query => query.take === undefined)); assert.equal(queries[0].select.user.select.passwordHash, undefined);
  const exported = await mocked('src/app/api/dashboard/export/route.ts').POST(new Request('http://localhost/export', { method: 'POST', body: JSON.stringify({ timeZone: 'Europe/Moscow', auditPage: 37 }) }));
  assert.equal(exported.status, 200);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(await exported.arrayBuffer()));
  assert.equal(workbook.getWorksheet('Проверки').rowCount, 918); assert.equal(workbook.getWorksheet('Ответы').rowCount, 918);
  const answers = workbook.getWorksheet('Ответы'); assert.ok(answers.getRow(2).values.includes('Исправить')); assert.ok(answers.getRow(2).values.includes('https://storage.example.test/photo.jpg'));
  assert.ok(answers.getRow(2).values.includes('10.10.2026, 11:00')); assert.equal(workbook.getWorksheet('Статистика').rowCount, 2);
  assert.equal(workbook.getWorksheet('Без проверок').rowCount, 2);
});
test('all filters are ANDed with TU scope, including prior-period and export queries', async () => {
  const filters = dashboardFiltersSchema.parse({ checklistIds: ['cl'], locationIds: ['loc'], auditorIds: ['auditor'], tuIds: ['manager'], from: '2026-10-01', to: '2026-10-10' });
  const where = dashboardWhere(filters, 'tu'); assert.deepEqual(where.OR, [{ location: { tus: { some: { id: 'tu' } } } }, { location: { tuId: 'tu' } }]); assert.equal(where.AND.length, 4);
  const { db, queries } = dbFor([]), mocked = loader({ prisma: db, '@/lib/requireAuth': guard({ id: 'tu', role: 'TU' }) });
  const response = await mocked('src/app/api/tu/dashboard/export/route.ts').POST(new Request('http://localhost/export', { method: 'POST', body: JSON.stringify(filters) }));
  assert.equal(response.status, 400); assert.deepEqual(queries[0].where.AND, where.AND); assert.deepEqual(queries[1].where.AND, where.AND);
  assert.ok(queries.every(query => JSON.stringify(query.where).includes('"id":"tu"')));
  const forbidden = await loader({ prisma: db, '@/lib/requireAuth': guard({ id: 'auditor', role: 'AUDITOR' }) })('src/app/api/tu/dashboard/route.ts').GET(new Request('http://localhost/api/tu/dashboard'));
  assert.equal(forbidden.status, 403);
});
test('invalid dates, timezone, filter IDs and page numbers fail before database access', async () => {
  const routes = loader({ prisma: { $transaction() { throw Error('Must not query'); } }, '@/lib/requireAuth': guard({ id: 'admin', role: 'ADMIN' }) });
  for (const params of ['from=2026-02-30', 'from=2026-10-12&to=2026-10-01', 'timeZone=unknown', 'auditPage=-1', 'locationIds=']) assert.equal((await routes('src/app/api/dashboard/route.ts').GET(new Request('http://localhost/api/dashboard?' + params))).status, 400);
  const response = await routes('src/app/api/dashboard/export/route.ts').POST(new Request('http://localhost/export', { method: 'POST', body: '{broken' })); assert.equal(response.status, 400);
});
