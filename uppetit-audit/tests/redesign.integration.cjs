// Opt-in real HTTP/PostgreSQL checks, exclusively against the local development database.
// Requires a running dev server and LOCAL_TEST_ADMIN_PASSWORD; creates only uniquely named test records, then removes them.
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { randomBytes } = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd(), true);
const { PrismaClient } = require('@prisma/client');
const { loader } = require('./helpers/module-loader.cjs');
const security = loader()('src/lib/security.ts');
const challenges = loader()('src/lib/loginChallenge.ts');
const toolRequire = createRequire(path.join(process.env.FRONTEND_TEST_TOOLS || path.join(os.tmpdir(), 'uppetit-frontend-tools'), 'package.json'));
const { request, chromium } = toolRequire('playwright');
const base = process.env.LOCAL_TEST_BASE_URL || 'http://127.0.0.1:3000';
const dbURL = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(dbURL.hostname) || dbURL.pathname !== '/uppetit_db' || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Only the local uppetit_db is allowed');
if (!process.env.LOCAL_TEST_ADMIN_PASSWORD) throw new Error('LOCAL_TEST_ADMIN_PASSWORD is required');
const db = new PrismaClient();
const prefix = 'qa-redesign-' + randomBytes(6).toString('hex');
const password = 'Fixture!' + randomBytes(20).toString('base64url');
const userIds = [], locationIds = [], checklistIds = [], sessionIds = [];
const contexts = [];
let browser;

async function context() { const value = await request.newContext({ baseURL: base, extraHTTPHeaders: { Origin: base } }); contexts.push(value); return value; }
async function json(ctx, method, url, body, expected = 200) {
  const response = await ctx.fetch(url, { method, ...(body ? { data: body } : {}) });
  const result = await response.json();
  assert.equal(response.status(), expected, method + ' ' + url + ': ' + (result?.error || response.status()));
  return result;
}
async function callback(ctx, credentials) {
  const csrf = await json(ctx, 'GET', '/api/auth/csrf');
  return ctx.post('/api/auth/callback/credentials', { form: { csrfToken: csrf.csrfToken, callbackUrl: base + '/audit', ...credentials }, headers: { 'X-Auth-Return-Redirect': '1' } });
}
async function login(ctx, name, pass, getCode) {
  const proof = await json(ctx, 'POST', '/api/auth/login-challenge', { login: name, password: pass });
  assert.equal(await json(ctx, 'GET', '/api/auth/session'), null, 'Password proof must not log the user in');
  await callback(ctx, { challenge: proof.challenge, code: getCode ? await getCode() : '' });
  const session = await json(ctx, 'GET', '/api/auth/session');
  assert.ok(session.user); sessionIds.push(session.sessionId); return { session, proof };
}
async function counts() {
  const names = ['user', 'location', 'audit', 'answer', 'checklist', 'checklistVersion', 'checklistItem', 'visitPlan'];
  return Object.fromEntries(await Promise.all(names.map(async name => [name, await db[name].count()])));
}
async function main() {
  const before = await counts();
  const adminUser = await db.user.findUniqueOrThrow({ where: { login: 'local.admin' } });
  assert.equal(adminUser.role, 'ADMIN'); assert.equal(adminUser.totpEnabled, true);
  const admin = await context();
  const { session: adminSession } = await login(admin, 'local.admin', process.env.LOCAL_TEST_ADMIN_PASSWORD, async () => {
    let user = await db.user.findUniqueOrThrow({ where: { id: adminUser.id } });
    let step = Math.floor(Date.now() / 30000);
    if (user.totpLastUsedStep !== null && user.totpLastUsedStep >= BigInt(step)) {
      await new Promise(resolve => setTimeout(resolve, Math.max(1, (Number(user.totpLastUsedStep) + 1) * 30000 - Date.now() + 50)));
      user = await db.user.findUniqueOrThrow({ where: { id: adminUser.id } }); step = Math.floor(Date.now() / 30000);
    }
    return security.totpCode(security.decryptTotp(user.totpSecret), step);
  });
  assert.equal(adminSession.user.mfaVerified, true);
  const expired = await context();
  await callback(expired, { challenge: challenges.issueLoginChallenge(adminUser, Date.now() - 301000).challenge, code: '123456' });
  assert.equal(await json(expired, 'GET', '/api/auth/session'), null);
  for (const [suffix, role] of [['auditor', 'AUDITOR'], ['tu-a', 'TU'], ['tu-b', 'TU'], ['legacy-tu', 'TU']]) {
    const user = await json(admin, 'POST', '/api/users', { login: prefix + '-' + suffix, name: 'QA ' + suffix, role });
    userIds.push(user.id);
    await json(admin, 'POST', '/api/setup-password', { token: user.inviteToken, password });
  }
  const [reviewerId, tuA, tuB, legacyTu] = userIds;
  const reviewer = await context(); const signed = await login(reviewer, prefix + '-auditor', password);
  assert.equal(signed.proof.mfaRequired, false); assert.equal(signed.session.user.role, 'AUDITOR');
  const tu = await context(); await login(tu, prefix + '-tu-a', password);
  for (const suffix of ['a', 'b']) {
    const location = await json(admin, 'POST', '/api/locations', { name: prefix + '-' + suffix, address: 'QA address', tuIds: suffix === 'a' ? [tuA] : [] });
    locationIds.push(location.id);
  }
  await db.location.update({ where: { id: locationIds[0] }, data: { tuId: legacyTu } });
  await json(admin, 'PATCH', '/api/locations/bulk', { ids: locationIds, tuIds: [tuB], assignmentMode: 'ADD', isActive: false });
  let location = await db.location.findUniqueOrThrow({ where: { id: locationIds[0] }, include: { tus: true } });
  assert.deepEqual(location.tus.map(t => t.id).sort(), [tuA, tuB, legacyTu].sort()); assert.equal(location.tuId, null); assert.equal(location.isActive, false);
  await json(admin, 'PATCH', '/api/locations/' + locationIds[0], { address: 'QA changed address' });
  location = await db.location.findUniqueOrThrow({ where: { id: locationIds[0] }, include: { tus: true } });
  assert.equal(location.tus.length, 3, 'Editing address must not remove managers');
  await json(admin, 'PATCH', '/api/locations/bulk', { ids: [locationIds[0], 'missing-' + prefix], isActive: true }, 400);
  assert.equal((await db.location.findUniqueOrThrow({ where: { id: locationIds[0] } })).isActive, false);
  await json(admin, 'PATCH', '/api/locations/' + locationIds[0], { activeFrom: '2026-12-01', activeTo: '2026-11-01' }, 400);
  await json(reviewer, 'PATCH', '/api/locations/bulk', { ids: locationIds, isActive: true }, 403);
  await json(tu, 'PATCH', '/api/locations/' + locationIds[0], { name: 'forbidden' }, 403);
  await json(admin, 'PATCH', '/api/locations/bulk', { ids: locationIds, isActive: true });
  const checklist = await json(admin, 'POST', '/api/checklists', { title: prefix, redThreshold: 20, yellowThreshold: 30, items: [{ text: 'QA clean', score: 15, photoRequirement: 'OPTIONAL' }, { text: 'QA service', score: 25, photoRequirement: 'OPTIONAL' }] });
  checklistIds.push(checklist.id);
  const versions = await db.checklistVersion.findMany({ where: { checklistId: checklist.id, isActive: true }, include: { items: { orderBy: { order: 'asc' } } } });
  const version = versions[0]; assert.ok(version);
  const submitted = await json(reviewer, 'POST', '/api/audits', { locationId: locationIds[0], checklistId: checklist.id, checklistVersionId: version.id, score: 9999, maxScore: 9999, shiftEmployees: ['QA shift'], answers: version.items.map((item, index) => ({ itemId: item.id, questionText: item.text, isOk: index !== 0, photos: [], comment: index === 0 ? 'QA remark' : '' })) });
  assert.equal(submitted.audit.userId, reviewerId); assert.equal(submitted.audit.maxScore, 40); assert.equal(submitted.audit.score, 25);
  const overview = await json(reviewer, 'GET', '/api/auditor/overview');
  assert.equal(overview.total, 1); assert.equal(overview.remarks, 1); assert.equal(overview.avgPct, 62.5);
  const ownHistory = await json(reviewer, 'GET', '/api/audits?page=1&scope=mine&auditId=' + submitted.audit.id);
  assert.equal(ownHistory.total, 1);
  const hidden = await json(tu, 'GET', '/api/audits?page=1&scope=mine&auditId=' + submitted.audit.id);
  assert.equal(hidden.total, 0);
  const staff = await json(admin, 'GET', '/api/users');
  assert.ok(staff.every(u => !('passwordHash' in u) && !('totpSecret' in u) && !('recoveryHashes' in u)));
  await json(admin, 'PUT', '/api/users', { id: reviewerId, name: 'QA edited', isActive: false });
  assert.equal(await db.authSession.count({ where: { userId: reviewerId } }), 0);
  await json(admin, 'PUT', '/api/users', { id: reviewerId, isActive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.env.FRONTEND_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const ui = await browser.newContext({ storageState: await admin.storageState(), viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/Moscow' });
  const page = await ui.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const route of ['/admin/users', '/admin/locations', '/admin/checklists', '/admin/schedule', '/admin', '/admin/audits', '/setup-mfa', '/audit', '/audit/new', '/audit/history', '/audit/schedule', '/audit/guide', '/audit/tu', '/audit/dashboard']) {
    const response = await page.goto(base + route); assert.equal(response.status(), 200, route);
    await page.waitForTimeout(300);
  }
  assert.deepEqual(errors, []);
  await ui.close();
  // Complete the real mobile flow, including encrypted draft restoration and actual HTTP save.
  const mobileReviewer = await context();
  await login(mobileReviewer, prefix + '-auditor', password);
  const mobile = await browser.newContext({ storageState: await mobileReviewer.storageState(), viewport: { width: 320, height: 640 }, timezoneId: 'Europe/Moscow' });
  const run = await mobile.newPage(); const mobileErrors = [];
  run.on('pageerror', error => mobileErrors.push(error.message));
  run.on('console', message => { if (message.type() === 'error') mobileErrors.push(message.text()); });
  const runURL = base + '/audit/run?location=' + locationIds[0] + '&checklist=' + checklist.id;
  await run.goto(runURL);
  await run.getByRole('heading', { name: 'QA clean' }).waitFor();
  await run.getByRole('button', { name: 'Всё отлично', exact: true }).click();
  await run.getByRole('textbox', { name: 'Комментарий к вопросу' }).fill('QA mobile draft');
  await run.waitForTimeout(1300);
  assert.ok(await run.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Run must fit 320px');
  await run.goto(base + '/audit');
  await run.getByRole('link', { name: /Продолжить/ }).click();
  // Existing draft logic resumes at the first unanswered question.
  await run.getByRole('heading', { name: 'QA service' }).waitFor();
  await run.getByRole('button', { name: 'Назад', exact: true }).click();
  await run.getByRole('heading', { name: 'QA clean' }).waitFor();
  assert.equal(await run.getByRole('textbox', { name: 'Комментарий к вопросу' }).inputValue(), 'QA mobile draft');
  assert.equal(await run.getByRole('button', { name: 'Всё отлично', exact: true }).getAttribute('aria-pressed'), 'true');
  await run.getByRole('button', { name: 'Далее', exact: true }).click();
  await run.getByRole('heading', { name: 'QA service' }).waitFor();
  await run.getByRole('button', { name: 'Всё отлично', exact: true }).click();
  await run.getByRole('button', { name: /К итогам/ }).click();
  await run.getByRole('textbox', { name: 'Сотрудник смены 1' }).fill('QA mobile shift');
  await run.getByRole('button', { name: '+ Добавить', exact: true }).click();
  await run.getByRole('textbox', { name: 'Сотрудник смены 2' }).fill('QA second shift');
  assert.ok(await run.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Final step must fit 320px');
  await run.getByRole('button', { name: 'Завершить аудит', exact: true }).click();
  await run.getByRole('button', { name: 'Отправить', exact: true }).click();
  await run.waitForURL(base + '/audit', { timeout: 30000 });
  const mobileSaved = await db.audit.findFirstOrThrow({ where: { userId: reviewerId, checklistVersionId: version.id }, orderBy: { date: 'desc' } });
  assert.equal(mobileSaved.score, 40); assert.equal(mobileSaved.maxScore, 40);
  assert.deepEqual(mobileSaved.shiftEmployees, ['QA mobile shift', 'QA second shift']);
  assert.equal(await db.audit.count({ where: { userId: reviewerId, checklistVersionId: version.id } }), 2, 'Mobile save must create exactly one audit');
  assert.deepEqual(mobileErrors, []);
  await mobile.close();
  await cleanup();
  assert.deepEqual(await counts(), before, 'Original business record counts must match after cleanup');
  console.log('OK: real local API/PostgreSQL — MFA/password proof/expiry, login without MFA, users and sessions, point edits, manager preservation, atomic rejected bulk, role restrictions, canonical audit save, personal overview/deep link, all 14 pages, 320px audit/draft restore/mobile save exactly once, no JS errors, original record counts restored.');
}
async function cleanup() {
  await db.$transaction(async tx => {
    await tx.audit.deleteMany({ where: { checklistVersion: { checklistId: { in: checklistIds } } } });
    await tx.checklist.deleteMany({ where: { id: { in: checklistIds } } });
    await tx.location.deleteMany({ where: { id: { in: locationIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds }, login: { startsWith: prefix } } });
    await tx.authSession.deleteMany({ where: { id: { in: sessionIds } } });
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  for (const ctx of contexts) await ctx.dispose();
  await cleanup(); await db.$disconnect();
});
