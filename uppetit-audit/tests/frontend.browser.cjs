// Actual layouts, components and hooks in Chromium/WebKit, with fixture APIs and no .env/database access.
// Dependencies live outside the application: npm install --prefix %TEMP%/uppetit-frontend-tools playwright esbuild
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const localRequire = createRequire(path.join(root, 'package.json'));
const toolRequire = createRequire(path.join(process.env.FRONTEND_TEST_TOOLS || path.join(os.tmpdir(), 'uppetit-frontend-tools'), 'package.json'));
const { chromium, webkit } = toolRequire('playwright');
const engine = process.env.FRONTEND_TEST_ENGINE || 'chromium';
const esbuild = toolRequire('esbuild');
const preview = path.join(root, '.preview', 'frontend');
fs.mkdirSync(preview, { recursive: true });
const { buildDashboardMetrics } = require('./helpers/module-loader.cjs').loader()('src/lib/dashboardMetrics.ts');

async function main() {
  const app = `import React from 'react'; import { createRoot } from 'react-dom/client';
    import { ThemeProvider } from 'next-themes'; import { ThemeToggle } from '@/components/ThemeToggle';
    import { AuditHistoryView } from '@/components/audits/AuditHistoryView';
    import AdminDashboard from '@/app/admin/page'; import TuDashboard from '@/app/audit/dashboard/page';
    import AdminLayout from '@/app/admin/layout'; import AuditLayout from '@/app/audit/layout';
    import Guide from '@/app/audit/guide/page';
    const guide = location.pathname.includes('guide');
    const dashboard = location.pathname.includes('dashboard');
    const auditor = location.pathname.includes('auditor');
    createRoot(document.getElementById('root')).render(<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {!dashboard && !guide && <div className="mx-auto max-w-7xl px-4 pt-4 flex items-center justify-between"><span className="text-sm font-bold">UPPETIT · Локальная проверка интерфейса</span><ThemeToggle /></div>}
      {guide ? <AuditLayout><Guide /></AuditLayout> : dashboard ? location.pathname.includes('tu-') ? <AuditLayout><TuDashboard /></AuditLayout> : <AdminLayout><AdminDashboard /></AdminLayout> : <AuditHistoryView admin={!auditor} />}
    </ThemeProvider>);`;
  const result = await esbuild.build({ stdin: { contents: app, resolveDir: root, loader: 'tsx' }, bundle: true, write: false,
    absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), jsx: 'automatic', nodePaths: [path.join(root, 'node_modules')],
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'fixture-framework', setup(build) {
      build.onResolve({ filter: /^(next\/image|next\/link|next\/navigation|next-auth\/react|.*\/PushSubscribe)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: root, loader: 'jsx', contents: args.path.includes('PushSubscribe') ? `export default function Push(){return null;}`
        : args.path === 'next/navigation' ? `export const usePathname=()=>location.pathname.includes('admin-dashboard')?'/admin':location.pathname.includes('tu-dashboard')?'/audit/dashboard':location.pathname.includes('guide')?'/audit/guide':location.pathname; export const useRouter=()=>({push:p=>window.__navigation=p,replace:p=>window.__navigation=p});`
        : args.path === 'next-auth/react'
        ? `export function useSession(){return {status:'authenticated',data:{user:{id:'tester',role:new URLSearchParams(location.search).get('role')||'ADMIN'}}}}; export async function signOut(){}; export async function getSession(){return {user:{id:"tester",role:"ADMIN"}}}`
        : args.path === 'next/link' ? `import React from 'react'; export default function Link(p){return <a {...p}/>}`
          : `import React from 'react'; export default function Image({src,alt,className,width,height,onClick,style}){return <img src={src} alt={alt} className={className} width={width} height={height} onClick={onClick} style={style}/>} ` }));
    } }],
  });
  const css = await localRequire('postcss')([localRequire('@tailwindcss/postcss')({ base: root })]).process(fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8'), { from: path.join(root, 'src/app/globals.css') });
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
  const audits = Array.from({ length: 917 }, (_, i) => ({ id: `audit-${i}`, date: new Date(Date.UTC(2026, 9, 10, 9) - i * 3600000).toISOString(),
    userId: 'tester', locationId: 'loc', locationName: i === 900 ? 'Архивная точка' : `Точка ${i + 1}`, auditorName: 'Иван Проверяющий', tuName: 'Анна Управляющая',
    score: 80, maxScore: 100, shiftEmployees: ['Сотрудник смены'], generalComment: 'Комментарий проверяющего',
    location: { id: 'loc', name: 'Точка', tus: [] }, user: { id: 'tester', login: 'Иван Проверяющий' },
    checklist: { id: 'checklist', title: 'Качество обслуживания', version: 1 },
    answers: [{ id: `answer-${i}`, question: 'Чистота оборудования', zone: 'Кухня', isOk: false, penalty: 20, photos: [photo], comment: 'Нужно исправить' }],
  }));
  const requests = [];
  let failing = false;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const json = (body, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/logo.jpg' || url.pathname === '/logo3.png') { res.setHeader('Content-Type', 'image/' + (url.pathname.endsWith('png') ? 'png' : 'jpeg')); return res.end(fs.readFileSync(path.join(root, 'public', url.pathname.slice(1)))); }
    if (url.pathname === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(result.outputFiles[0].contents); }
    if (url.pathname === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css.css); }
    if (url.pathname.startsWith('/api/')) {
      let body = ''; for await (const chunk of req) body += chunk;
      requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), method: req.method, body: body ? JSON.parse(body) : null });
      if (failing) return json({ error: 'Тестовая ошибка сети' }, 500);
      if (url.pathname === '/api/audits/filters') return json({ locations: ['Точка 1', 'Архивная точка'], auditors: ['Иван Проверяющий'], tus: ['Анна Управляющая'] });
      if (url.pathname === '/api/audits/export') { res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); return res.end('fixture'); }
      if (url.pathname.endsWith('/dashboard/export')) { res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); return res.end('fixture-dashboard-export'); }
      if (url.pathname.endsWith('/answers')) {
        const audit = audits.find(a => url.pathname.includes(a.id + '/'));
        audit.answers[0].isOk = JSON.parse(body).isOk; audit.answers[0].penalty = audit.answers[0].isOk ? 0 : 20; audit.score = audit.answers[0].isOk ? 100 : 80;
        return json({ newScore: audit.score, answers: audit.answers });
      }
      if (url.pathname === '/api/audits') {
        let rows = audits.filter(a => !url.searchParams.get('search') || a.locationName.includes(url.searchParams.get('search')));
        const locations = url.searchParams.getAll('locations'); if (locations.length) rows = rows.filter(a => locations.includes(a.locationName));
        if (url.searchParams.has('auditId')) rows = rows.filter(audit => audit.id === url.searchParams.get('auditId'));
        if (url.searchParams.get('sort') === 'asc') rows = rows.toReversed();
        const size = Number(url.searchParams.get('pageSize') || 25), page = Math.min(Number(url.searchParams.get('page') || 1), Math.max(1, Math.ceil(rows.length / size)));
        return json({ audits: rows.slice((page - 1) * size, page * size), total: rows.length, page, pageSize: size, totalPages: Math.max(1, Math.ceil(rows.length / size)) });
      }
      if (url.pathname.includes('dashboard')) {
        const from = url.searchParams.get('from') || '';
        const count = from.startsWith('2025-12-31') || from.startsWith('2026-01-01') ? 111 : from.startsWith('2026-01-31') || from.startsWith('2026-02-01') ? 222 : 917;
        await new Promise(resolve => setTimeout(resolve, count === 111 ? 350 : 30));
        const input = Array.from({ length: count }, (_, i) => {
          const base = audits[i], mode = i % 3;
          const items = [{ id: 'hygiene', text: 'Чистота оборудования', zone: 'Кухня', score: 50, isCritical: true, photoRequirement: 'VIOLATION' }, { id: 'service', text: 'Приветствие гостя', zone: 'Сервис', score: 30, isCritical: false, photoRequirement: 'OPTIONAL' }, { id: 'display', text: 'Витрина и выкладка ' + 'ПодробноеОписаниеПункта'.repeat(10), zone: 'Зал', score: 20, isCritical: false, photoRequirement: 'VIOLATION' }];
          return { ...base, date: new Date(Date.UTC(2026, 9, 1 + i % 10, 9)), locationId: `loc-${i % 8}`, locationName: `Точка ${i % 8 + 1}`, score: mode === 0 ? 100 : mode === 1 ? 80 : 30,
            location: { name: `Точка ${i % 8 + 1}`, address: i % 8 === 7 ? 'Длинный адрес: ' + 'ОченьДлинноеНазваниеБезПробелов'.repeat(10) : 'ул. Торговая, ' + (i % 8 + 1), tus: [{ id: 'tu', name: 'Анна Управляющая', login: 'manager' }] },
            user: { id: 'tester', name: 'Иван Проверяющий', login: 'reviewer' },
            checklistVersion: { checklistId: 'checklist', version: 1, checklist: { title: 'Качество обслуживания', redThreshold: 70, yellowThreshold: 90 }, items },
            answers: items.map((item, n) => ({ id: `answer-${i}-${n}`, itemId: item.id, question: item.text, zone: item.zone, isOk: mode === 0 || n === 1 || (mode === 1 && n === 0), penalty: mode === 0 || n === 1 || (mode === 1 && n === 0) ? 0 : item.score, comment: 'Нужно исправить', photos: n === 0 ? [photo] : [] })) };
        }).filter(audit => !url.searchParams.getAll('locationIds').length || url.searchParams.getAll('locationIds').includes(audit.locationId));
        const metrics = buildDashboardMetrics(input, [], 'Europe/Moscow', true), page = Number(url.searchParams.get('auditPage') || 1);
        const { records, ...report } = metrics;
        return json({ ...report, availableChecklists: [{ id: 'checklist', title: 'Качество обслуживания' }], options: { checklists: [{ id: 'checklist', title: 'Качество обслуживания' }], locations: Array.from({ length: 9 }, (_, i) => ({ id: 'loc-' + i, title: 'Точка ' + (i + 1) })), auditors: [{ id: 'tester', title: 'Иван Проверяющий' }], tus: [{ id: 'tu', title: 'Анна Управляющая' }] },
          coverage: { checkedLocations: 8, activeLocations: 9, visitedActiveLocations: 8, pct: 88.9, unvisited: [{ id: 'loc-8', name: 'Точка 9', address: 'Без визитов' }] },
          auditRecords: { items: records.slice((page - 1) * 25, page * 25), total: records.length, page, pageSize: 25 }, metadata: { generatedAt: '2026-10-12T09:00:00Z', timeZone: 'Europe/Moscow', from: url.searchParams.get('from'), to: url.searchParams.get('to'), previousFrom: null, previousTo: null } });
      }
      return json({});
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="bg-[#F5F6F8] dark:bg-zinc-950 text-gray-900 dark:text-zinc-100"><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = engine === 'webkit' ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, executablePath: process.env.FRONTEND_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', timezoneId: 'Europe/Moscow', hasTouch: engine === 'webkit' });
    const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(url + '/history'); await page.getByText('917', { exact: true }).first().waitFor();
    assert.equal(await page.getByRole('switch', { name: 'Тёмная тема' }).getAttribute('aria-checked'), 'true');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
    const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.screenshot({ path: path.join(preview, 'admin-history-dark.png'), fullPage: true });
    await page.getByRole('switch').click(); assert.equal(await page.getByRole('switch').getAttribute('aria-checked'), 'false');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), false);
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), darkBackground);
    await page.reload(); await page.getByRole('switch').waitFor(); assert.equal(await page.getByRole('switch').getAttribute('aria-checked'), 'false');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), false);
    await page.screenshot({ path: path.join(preview, 'admin-history-light.png'), fullPage: true });
    await page.getByLabel('Последняя страница').first().click(); await page.getByText('Страница 37 из 37', { exact: true }).first().waitFor();
    assert.ok(requests.some(r => r.params.page === '37'));
    await page.getByLabel('Поиск по истории').fill('Архивная'); await page.getByText('Найдено аудитов:', { exact: false }).waitFor(); await page.getByRole('button', { name: 'Архивная точка', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Выгрузить все найденные' }).click(); await page.waitForTimeout(100);
    assert.equal(requests.findLast(r => r.path.endsWith('/export')).body.filters.search, 'Архивная');
    assert.equal(requests.findLast(r => r.path.endsWith('/export')).body.auditIds, undefined);
    await page.getByRole('button', { name: 'Сбросить всё' }).click(); await page.getByText('917', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'Подробнее', exact: true }).first().click(); await page.getByText('Чистота оборудования').waitFor();
    await page.getByRole('button', { name: '✓ Зачесть исправление' }).click(); await page.getByRole('button', { name: 'Зачесть', exact: true }).click();
    await page.getByText('100 / 100 б.', { exact: true }).waitFor();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole('button', { name: /Ответы и фотографии/ }).first().click();
    await page.getByRole('button', { name: 'Открыть фото 1' }).first().click(); await page.getByRole('dialog', { name: 'Фотография аудита' }).waitFor();
    await page.keyboard.press('Escape'); assert.equal(await page.getByRole('dialog', { name: 'Фотография аудита' }).count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile history must not overflow');
    await page.screenshot({ path: path.join(preview, 'mobile-history-details.png'), fullPage: true });
    await page.goto(url + '/auditor-history?role=AUDITOR'); await page.getByText('917', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: /Ответы и фотографии/ }).first().click(); await page.getByText('Чистота оборудования').waitFor();
    assert.equal(await page.getByRole('button', { name: /Зачесть исправление|Удалить аудит/ }).count(), 0);
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(url + '/admin-dashboard'); await page.getByText('917', { exact: true }).first().waitFor();
    await page.getByRole('switch').click(); await page.waitForTimeout(1600); assert.equal(await page.locator('.recharts-pie-sector').count(), 3); assert.ok(await page.locator('.recharts-line-curve').count() > 0); await page.screenshot({ path: path.join(preview, 'dashboard-dark.png'), fullPage: true });
    const dates = page.locator('input[type=date]'); await dates.first().fill('2026-01-01'); await page.waitForTimeout(50); await dates.first().fill('2026-02-01');
    await page.getByText('222', { exact: true }).first().waitFor(); await page.waitForTimeout(450); assert.equal(await page.getByText('111', { exact: true }).count(), 0);
    await page.getByRole('button', { name: '7 дней', exact: true }).click(); await page.getByText('917', { exact: true }).first().waitFor();
    const expected = await page.evaluate(() => { const from = new Date(), to = new Date(); from.setDate(from.getDate() - 6); from.setHours(0,0,0,0); to.setHours(23,59,59,999); return { from: from.toISOString(), to: to.toISOString() }; });
    const latest = requests.findLast(r => r.path === '/api/dashboard'); assert.equal(latest.params.from, expected.from); assert.equal(latest.params.to, expected.to);
    await page.getByRole('button', { name: /^Выполнение стандартов:/ }).click();
    await page.getByRole('dialog', { name: 'Составляющие результата' }).getByRole('heading', { name: 'Работа аудиторов' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Охват активных точек:/ }).click();
    await page.getByRole('dialog', { name: 'Охват торговых точек' }).getByText('Точка 9', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    const sections = page.getByRole('navigation', { name: 'Разделы аналитики' });
    await sections.getByRole('button', { name: /^Нарушения/ }).click();
    await page.getByRole('heading', { name: 'Нарушения и повторяемость' }).waitFor();
    await page.screenshot({ path: path.join(preview, 'dashboard-problems.png'), fullPage: true });
    await page.getByRole('button', { name: /^Открыть проверку:/ }).first().click();
    const auditDialog = page.getByRole('dialog', { name: 'Подробности проверки', exact: true });
    await auditDialog.getByText('Сотрудник смены', { exact: true }).waitFor();
    await auditDialog.getByRole('button', { name: 'Открыть фото 1' }).first().click();
    await page.getByRole('dialog', { name: 'Фотография проверки', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await auditDialog.isVisible(), true, 'Closing the photo should retain the parent audit');
    await page.keyboard.press('Escape');
    await sections.getByRole('button', { name: /^Проверки/ }).click();
    await page.getByRole('button', { name: 'Последняя страница', exact: true }).click();
    await page.getByText('901–917 из 917', { exact: true }).waitFor();
    assert.equal(requests.findLast(r => r.path === '/api/dashboard').params.auditPage, '37');
    await sections.getByRole('button', { name: 'Обзор', exact: true }).click();
    const points = page.locator('.dashboard-filter').filter({ has: page.locator('summary', { hasText: 'Точки' }) });
    await points.locator('summary').click(); await points.getByRole('checkbox', { name: 'Точка 1', exact: true }).check();
    await points.getByRole('button', { name: 'Готово', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.dashboard-page').getAttribute('aria-busy') === 'false');
    const downloadDashboard = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Выгрузить в Excel', exact: true }).click(); await downloadDashboard;
    const exported = requests.findLast(r => r.path === '/api/dashboard/export'); assert.deepEqual(exported.body.locationIds, ['loc-0']); assert.equal(exported.body.timeZone, 'Europe/Moscow'); assert.equal(exported.body.from, expected.from); assert.equal(exported.body.to, expected.to);
    await page.getByRole('button', { name: /Сбросить фильтры/ }).click();
    await page.getByText('917', { exact: true }).first().waitFor();
    await page.getByRole('switch').click(); await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(preview, 'dashboard-light.png'), fullPage: true });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const filter of await page.locator('.dashboard-filter').all()) {
        await filter.locator('summary').click();
        const box = await filter.locator('.dashboard-filter-menu').boundingBox();
        assert.ok(box.x >= -1 && box.x + box.width <= width + 1, 'Dashboard filter dropdown must fit the viewport at ' + width);
        await page.keyboard.press('Escape'); assert.equal(await filter.evaluate(node => node.open), false);
      }
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => localStorage.setItem('theme', theme), theme);
        if (await page.evaluate(theme => document.documentElement.classList.contains('dark') !== (theme === 'dark'), theme)) await page.getByRole('switch').click();
        for (const tab of ['Точки', 'Нарушения', 'Проверки', 'Обзор']) {
          await sections.getByRole('button', { name: new RegExp('^' + tab) }).click();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), engine + ': ' + tab + ' must fit ' + width + ' in ' + theme);
          if (tab !== 'Обзор') {
            assert.equal(await page.locator('.dashboard-mobile-list').isVisible(), width < 768);
            assert.equal(await page.locator('.dashboard-table-desktop').isVisible(), width >= 768);
          }
          for (const input of await dates.all()) {
            const box = await input.boundingBox();
            assert.ok(box.x >= 0 && box.x + box.width <= width, 'Date input must fit ' + width);
          }
          if (width === 390 && theme === 'dark') {
            if (tab !== 'Обзор') {
              const cards = page.locator('.dashboard-mobile-list');
              await cards.getByRole('button').first().click();
              await page.getByRole('dialog', { name: 'Подробности проверки', exact: true }).getByText('Сотрудник смены', { exact: true }).waitFor();
              await page.keyboard.press('Escape');
            }
            await sections.scrollIntoViewIfNeeded();
            await page.screenshot({ path: path.join(preview, engine + '-mobile-' + tab + '.png') });
          }
        }
      }
    }
    failing = true; await page.getByRole('button', { name: 'Обновить', exact: true }).click(); await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('button', { name: /Выгрузить в Excel/ }).isDisabled(), true);
    failing = false;
    await page.goto(url + '/tu-dashboard?role=TU'); await page.getByText('917', { exact: true }).first().waitFor();
    await page.setViewportSize({ width: 320, height: 760 }); await page.waitForTimeout(1600);
    if (!(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))) console.log('overflow', await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const r=e.getBoundingClientRect(); return r.right > innerWidth+1 && r.width > 0; }).slice(0,12).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,65),width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right}))));
    await page.screenshot({path:path.join(preview,'dashboard-mobile.png'),fullPage:true});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile dashboard must not overflow');
    for (const tab of ['Точки', 'Нарушения', 'Проверки']) {
      await page.getByRole('navigation', { name: 'Разделы аналитики' }).getByRole('button', { name: new RegExp('^' + tab) }).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'TU mobile ' + tab + ' must fit');
    }
    await page.getByRole('button', { name: /^Открыть аудит/ }).first().click();
    await page.getByRole('dialog', { name: 'Подробности проверки', exact: true }).getByText('Сотрудник смены', { exact: true }).waitFor();
    await page.keyboard.press('Escape');
    await page.goto(url + '/audit-guide?role=AUDITOR');
    await page.getByRole('heading', { name: 'Как пользоваться приложением' }).waitFor();
    assert.equal(await page.locator('section[id^="guide-"]').count(), 9);
    assert.equal(await page.getByRole('link', { name: 'Открыть аналитику' }).count(), 0);
    assert.equal(await page.getByText(/каждую секунду|UP PETIT/).count(), 0);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Guide must fit ' + width);
    }
    await page.goto(url + '/audit-guide?role=TU');
    assert.equal(await page.getByRole('link', { name: 'Открыть аналитику' }).getAttribute('href'), '/audit/dashboard');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(preview, engine + '-guide-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('OK: ' + engine + ' — actual layouts, mobile tabs and guide, themes, history of 917 audits, dashboard metrics, sections/coverage details, violations, nested photo/Escape, full paging, filtered Excel request, request race, API error, dropdowns at 320–1440px, TU dashboard.');
    await context.close();
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
