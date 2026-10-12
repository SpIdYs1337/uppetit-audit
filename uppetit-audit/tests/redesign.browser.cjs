// Browser checks use actual UI components with isolated fixture APIs; production code uses real APIs.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const local = createRequire(path.join(root, 'package.json'));
const tools = createRequire(path.join(process.env.FRONTEND_TEST_TOOLS || path.join(os.tmpdir(), 'uppetit-frontend-tools'), 'package.json'));
const { chromium } = tools('playwright');
const preview = path.join(root, '.preview', 'redesign');
fs.mkdirSync(preview, { recursive: true });

async function main() {
  const app = `import React from 'react'; import {createRoot} from 'react-dom/client';
    import {Providers} from '@/components/providers';
    import Users from '@/app/admin/users/page'; import Locations from '@/app/admin/locations/page';
    import AdminLayout from '@/app/admin/layout'; import AuditLayout from '@/app/audit/layout';
    import Home from '@/app/audit/page'; import NewAudit from '@/app/audit/new/page'; import Login from '@/app/page';
    const p=location.pathname; const content=p==='/login'?<Login/>:p==='/admin/users'?<AdminLayout><Users/></AdminLayout>:p==='/admin/locations'?<AdminLayout><Locations/></AdminLayout>:<AuditLayout>{p==='/audit/new'?<NewAudit/>:<Home/>}</AuditLayout>;
    createRoot(document.getElementById('root')).render(<Providers>{content}</Providers>);`;
  const bundle = await tools('esbuild').build({ stdin: { contents: app, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, absWorkingDir: root,
    tsconfig: path.join(root, 'tsconfig.json'), jsx: 'automatic', nodePaths: [path.join(root, 'node_modules')], define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'fixture-framework', setup(build) {
      build.onResolve({ filter: /^(next\/image|next\/link|next\/navigation|next-auth\/react|.*\/SessionGuard|.*\/PushSubscribe)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: root, loader: 'jsx', contents:
        args.path.includes('SessionGuard') ? `export function SessionGuard({children}){return children;}`
        : args.path.includes('PushSubscribe') ? `export default function Push(){return null;}`
        : args.path === 'next/navigation' ? `export const usePathname=()=>location.pathname; export const useSearchParams=()=>new URLSearchParams(location.search); export const useRouter=()=>({push:p=>window.__navigation=p,replace:p=>window.__navigation=p});`
        : args.path === 'next-auth/react' ? `export const SessionProvider=({children})=>children; export function useSession(){const q=new URLSearchParams(location.search);return {status:location.pathname==='/login'?'unauthenticated':'authenticated',data:location.pathname==='/login'?null:{user:{id:q.get('uid')||'tester',name:'Анна Проверяющая',role:q.get('role')||'ADMIN'}}}}; export async function signIn(_,data){const r=await fetch('/api/auth/callback/credentials',{method:'POST',body:JSON.stringify(data)});return r.json()};export async function getSession(){return {user:{id:'tester',role:'ADMIN',mfaVerified:true}}};export async function signOut(){}`
        : args.path === 'next/link' ? `import React from 'react';export default function Link(p){return <a {...p}/>}`
        : `import React from 'react';export default function Image({src,alt,width,height,className,style}){return <img src={src} alt={alt} width={width} height={height} className={className} style={style}/>} ` }));
    } }],
  });
  const css = await local('postcss')([local('@tailwindcss/postcss')({ base: root })]).process(fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8'), { from: path.join(root, 'src/app/globals.css') });
  let users = Array.from({ length: 68 }, (_, i) => ({ id: 'user-' + i, name: 'Сотрудник ' + (i + 1), login: 'employee' + i, email: i === 40 ? 'unique-search@example.test' : 'staff' + i + '@example.test', phone: '+700000' + i, role: i === 0 ? 'TU' : i === 1 ? 'ADMIN' : 'AUDITOR', isActive: i !== 5, hasPassword: i !== 67, totpEnabled: i === 1, locations: [] }));
  let locations = Array.from({ length: 125 }, (_, i) => ({ id: 'loc-' + i, name: 'Точка ' + (i + 1), address: i === 100 ? 'Уникальный адрес, 100' : 'ул. Торговая, ' + (i + 1), isActive: true, activeFrom: null, activeTo: null, tuId: null, tus: [users[0]], audits: [] }));
  const requests = []; let failSwitch = false;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    if (url.pathname === '/bundle.js') return res.end(bundle.outputFiles[0].contents);
    if (url.pathname === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css.css); }
    if (url.pathname === '/logo.jpg' || url.pathname === '/logo3.png') { res.setHeader('Content-Type', 'image/' + (url.pathname.endsWith('png') ? 'png' : 'jpeg')); return res.end(fs.readFileSync(path.join(root, 'public', url.pathname.slice(1)))); }
    if (url.pathname.startsWith('/api/')) {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = raw ? JSON.parse(raw) : null;
      requests.push({ path: url.pathname, method: req.method, body });
      if (url.pathname === '/api/users') {
        if (req.method === 'PUT') { users = users.map(u => u.id === body.id ? { ...u, ...body } : u); return json(users.find(u => u.id === body.id)); }
        return json(users);
      }
      if (url.pathname === '/api/locations/bulk') { locations = locations.map(l => body.ids.includes(l.id) ? { ...l, ...(body.isActive !== undefined ? { isActive: body.isActive } : {}) } : l); return json({ count: body.ids.length }); }
      if (url.pathname.startsWith('/api/locations/')) {
        if (failSwitch && body.isActive !== undefined) return json({ error: 'Тестовый отказ сохранения' }, 500);
        locations = locations.map(l => l.id === url.pathname.split('/').at(-1) ? { ...l, ...body } : l);
        return json(locations.find(l => l.id === url.pathname.split('/').at(-1)));
      }
      if (url.pathname === '/api/locations') return json(locations);
      if (url.pathname === '/api/checklists') return json([{ id: 'checklist', title: 'Качество обслуживания', isArchived: false, allowedRoles: ['AUDITOR', 'TU'], activeVersionId: 'version', items: [{ id: 'question' }] }]);
      if (url.pathname === '/api/auditor/overview') return json({ total: 917, periodCount: 25, remarks: 4, avgPct: 88, measured: 25, recent: [{ id: 'recent-audit', date: new Date().toISOString(), score: 88, maxScore: 100, locationName: 'Точка 1', checklistVersion: { checklist: { title: 'Качество обслуживания' } }, _count: { answers: 1 } }], plans: [] });
      if (url.pathname === '/api/auth/login-challenge') return body.password === 'correct-password' ? json({ challenge: 'fixture-opaque-proof', mfaRequired: true, expiresAt: Date.now() + 300000 }) : json({ error: 'Проверьте логин и пароль.' }, 401);
      if (url.pathname === '/api/auth/callback/credentials') return json(body.code === '123456' || body.code === 'a'.repeat(20) ? { ok: true } : { ok: false, error: 'CredentialsSignin' });
      return json({});
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.FRONTEND_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', timezoneId: 'Europe/Moscow' });
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/admin/users'); await page.getByRole('table').waitFor();
    await page.getByRole('searchbox').fill('unique-search'); await page.getByRole('button', { name: 'Сотрудник 41', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Редактировать Сотрудник 41', exact: true }).click();
    await page.getByLabel('Имя и фамилия').fill('Обновлённое имя');
    await page.getByRole('button', { name: 'Сохранить профиль' }).click();
    await page.getByRole('button', { name: 'Обновлённое имя', exact: true }).waitFor();
    await page.getByRole('searchbox').fill('');
    await page.getByLabel('Роль сотрудника').selectOption('TU');
    await page.getByRole('button', { name: 'Действия для employee0' }).click();
    await page.getByRole('button', { name: 'Редактировать профиль', exact: true }).click();
    await page.getByLabel('Имя и фамилия').fill('Несохранённое имя');
    page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'Закрыть окно' }).click();
    assert.equal(await page.getByLabel('Имя и фамилия').inputValue(), 'Несохранённое имя');
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Закрыть окно' }).click();
    await page.getByLabel('Роль сотрудника').selectOption('');
    await page.getByRole('button', { name: 'Последняя страница' }).click();
    await page.getByRole('button', { name: 'Сотрудник 67', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Свернуть меню' }).click();
    await page.reload(); await page.getByRole('button', { name: 'Развернуть меню' }).waitFor();
    await page.getByRole('button', { name: 'Развернуть меню' }).click();
    await page.getByRole('switch', { name: 'Тёмная тема' }).click();
    await page.reload(); await page.getByRole('table').waitFor();
    assert.equal(await page.getByRole('switch', { name: 'Тёмная тема' }).getAttribute('aria-checked'), 'false');
    await page.waitForTimeout(500); await page.screenshot({ path: path.join(preview, 'employees-light.png'), fullPage: true });
    await page.goto(base + '/admin/users?uid=second-user'); await page.getByRole('table').waitFor();
    assert.equal(await page.getByRole('switch', { name: 'Тёмная тема' }).getAttribute('aria-checked'), 'true');
    await page.goto(base + '/admin/locations'); await page.getByRole('table').waitFor();
    await page.getByRole('searchbox').fill('Уникальный адрес'); await page.getByRole('button', { name: 'Точка 101', exact: true }).waitFor();
    await page.getByRole('searchbox').fill('');
    failSwitch = true;
    const toggle = page.getByRole('switch', { name: 'Точка Точка 1 активна', exact: true });
    await toggle.click(); await page.getByRole('alert').filter({ hasText: 'Тестовый отказ' }).waitFor();
    assert.equal(await toggle.getAttribute('aria-checked'), 'true'); failSwitch = false;
    await page.getByRole('checkbox', { name: 'Выбрать точку Точка 1', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Выбрать точку Точка 2', exact: true }).check();
    await page.getByRole('button', { name: 'Изменить активность', exact: true }).click();
    await page.getByLabel('Новая активность').selectOption('off'); await page.getByRole('button', { name: 'Применить к 2 точкам' }).click();
    await page.getByText('Изменено точек: 2', { exact: true }).waitFor();
    assert.equal(await toggle.getAttribute('aria-checked'), 'false');
    assert.equal(requests.findLast(r => r.path === '/api/locations/bulk').body.ids.length, 2);
    await page.getByRole('button', { name: 'Редактировать точку Точка 1', exact: true }).click();
    await page.getByLabel('Адрес', { exact: true }).fill('Изменённый адрес');
    await page.getByRole('button', { name: 'Сохранить точку' }).click();
    await page.getByText('Изменённый адрес', { exact: true }).first().waitFor();
    await page.waitForTimeout(500); await page.screenshot({ path: path.join(preview, 'locations-light.png'), fullPage: true });
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/admin/users', '/admin/locations', '/audit?role=AUDITOR', '/audit/new?role=AUDITOR&location=loc-2']) {
        await page.goto(base + route); await page.locator('h1').waitFor();
        await page.waitForTimeout(150);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), route + ' overflows at ' + width);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + '/audit?role=AUDITOR'); await page.getByText('917', { exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Аналитика территории' }).count(), 0);
    await page.waitForTimeout(500); await page.screenshot({ path: path.join(preview, 'auditor-mobile-light.png'), fullPage: true });
    await page.getByRole('switch', { name: 'Тёмная тема' }).click();
    await page.waitForTimeout(500); await page.screenshot({ path: path.join(preview, 'auditor-mobile-dark.png'), fullPage: true });
    await page.goto(base + '/audit/new?role=AUDITOR&location=loc-2');
    await page.getByRole('button', { name: 'Точка 3 ул. Торговая, 3', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Точка 3 ул. Торговая, 3', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Качество обслуживания 1 вопросов' }).click();
    await page.getByRole('button', { name: 'Начать заполнение' }).click();
    assert.ok((await page.evaluate(() => window.__navigation)).includes('location=loc-2'));
    for (const theme of ['dark', 'light']) {
      await page.goto(base + '/login');
      await page.evaluate(value => { localStorage.setItem('uppetit:theme:guest', value); window.dispatchEvent(new Event('uppetit-theme-preference')); }, theme);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
        await page.waitForTimeout(200);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Login overflow ' + width + '/' + theme);
      }
      await page.screenshot({ path: path.join(preview, 'login-' + theme + '.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(preview, 'login-mobile-' + theme + '.png'), fullPage: true });
      await page.getByRole('button', { name: 'Политикой обработки персональных данных', exact: true }).click();
      const policy = page.getByRole('dialog');
      await policy.waitFor();
      assert.equal(await policy.getByRole('heading', { name: /^\d\./ }).count(), 5);
      await policy.getByText('Последнее обновление: 5 мая 2026 г.', { exact: true }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Policy must fit mobile');
      await page.screenshot({ path: path.join(preview, 'privacy-mobile-' + theme + '.png'), fullPage: true });
      await page.keyboard.press('Escape');
      await policy.waitFor({ state: 'detached' });
      assert.equal(await page.getByRole('button', { name: 'Политикой обработки персональных данных', exact: true }).evaluate(node => node === document.activeElement), true);
    }
    await page.getByLabel('Логин или телефон').fill('test');
    assert.equal(await page.getByLabel('Код аутентификатора', { exact: true }).count(), 0);
    await page.getByLabel('Пароль', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Показать пароль', exact: true }).click();
    assert.equal(await page.getByLabel('Пароль', { exact: true }).getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Скрыть пароль', exact: true }).click();
    await page.getByRole('button', { name: 'Войти в систему' }).click();
    await page.getByRole('alert').getByText('Проверьте логин и пароль.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Код аутентификатора', { exact: true }).count(), 0, 'Wrong password cannot open MFA');
    await page.getByLabel('Пароль', { exact: true }).fill('correct-password'); await page.getByRole('button', { name: 'Войти в систему' }).click();
    await page.getByRole('heading', { name: 'Подтверждение входа' }).waitFor();
    await page.getByLabel('Код аутентификатора', { exact: true }).fill('000000');
    await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.evaluate(() => window.__navigation), undefined, 'Wrong code cannot navigate');
    await page.getByRole('button', { name: 'Использовать резервный код', exact: true }).click();
    await page.getByLabel('Резервный код', { exact: true }).fill('a'.repeat(20));
    assert.equal(await page.getByLabel('Резервный код', { exact: true }).inputValue(), 'a'.repeat(20));
    await page.getByRole('button', { name: 'Использовать аутентификатор', exact: true }).click();
    await page.getByLabel('Код аутентификатора', { exact: true }).fill('123 456');
    assert.equal(await page.getByLabel('Код аутентификатора', { exact: true }).inputValue(), '123456');
    await page.waitForTimeout(500); await page.screenshot({ path: path.join(preview, 'mfa-mobile-light.png'), fullPage: true });
    await page.getByRole('switch', { name: 'Тёмная тема' }).click();
    await page.waitForTimeout(500); await page.screenshot({ path: path.join(preview, 'mfa-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
    await page.waitForFunction(() => window.__navigation === '/admin');
    assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => value.includes('correct-password') || value.includes('123456'))), false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('OK: redesign Chrome — employee search/edit/unsaved changes, menus, paging, per-user themes/sidebar, point address search/edit, failed-toggle rollback, bulk selection, mobile auditor, preselected point, MFA paste, no secret storage, 320–1920px, no JS errors.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
