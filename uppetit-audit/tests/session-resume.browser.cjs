// Real Auth.js cookies, SessionProvider and SessionGuard; isolated in-memory
// records and temporary browser profiles. Does not load .env or a real database.
// Exercises Safari's engine with the external Playwright/esbuild tools used by
// frontend.browser.cjs (Playwright WebKit must be installed).
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { webcrypto } = require('node:crypto');
const { loader } = require('./helpers/module-loader.cjs');
const root = path.resolve(__dirname, '..');
const toolRequire = createRequire(path.join(process.env.FRONTEND_TEST_TOOLS
  || path.join(os.tmpdir(), 'uppetit-frontend-tools'), 'package.json'));
const { webkit } = toolRequire('playwright');
const esbuild = toolRequire('esbuild');

async function main() {
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  const { Auth } = await import('@auth/core');
  const { default: Credentials } = await import('next-auth/providers/credentials');
  const previousEnv = Object.fromEntries(['AUTH_SECRET', 'AUTH_URL', 'NEXTAUTH_URL'].map(key => [key, process.env[key]]));
  process.env.AUTH_SECRET = 'isolated-browser-session-resume-secret-32-chars';
  // Windows WebKit also writes auxiliary caches relative to the process cwd.
  const originalDirectory = process.cwd();
  const browserDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'uppetit-resume-engine-'));
  process.chdir(browserDirectory);
  const profiles = [];
  let context, server;
  try {
    const users = ['AUDITOR', 'TU', 'ADMIN', 'ENROLL'].map(role => ({
      id: role, login: role, name: role, role: role === 'ENROLL' ? 'ADMIN' : role,
      authVersion: 0, isActive: true, passwordHash: 'fixture-hash', totpEnabled: role === 'ADMIN',
    }));
    const records = new Map();
    let created = 0;
    const prisma = {
      user: {
        findMany: async ({ where }) => users.filter(user => where.OR.some(filter => filter.login === user.login)),
        findUnique: async ({ where }) => users.find(user => user.id === where.id),
      },
      authSession: {
        create: async ({ data }) => { records.set(data.id, data); created++; return data; },
        findUnique: async ({ where }) => {
          const record = records.get(where.id);
          return record ? { ...record, user: users.find(user => user.id === record.userId) } : null;
        },
        deleteMany: async ({ where }) => ({ count: Number(records.delete(where.id)) }),
      },
    };
    const mocks = {
      prisma,
      './security': { verifyPassword: async password => password === 'fixture-password' },
      '@/lib/security': { verifyPassword: async password => password === 'fixture-password' },
      './mfa': { consumeSecondFactor: async (user, code) => user.totpEnabled && code === '123456' },
      './rateLimit': { clientAddress: () => 'fixture', consumeRateLimit: async () => true },
      '@/lib/rateLimit': { clientAddress: () => 'fixture', consumeRateLimit: async () => true },
      'next-auth/providers/credentials': Credentials,
    };
    let config;
    loader({ ...mocks, 'next-auth': value => { config = value; return {}; } })('src/lib/auth.ts');
    const challengeRoute = loader(mocks)('src/app/api/auth/login-challenge/route.ts');
    const app = `import React from 'react'; import {createRoot} from 'react-dom/client';
      import {SessionProvider} from 'next-auth/react'; import {ThemeProvider} from 'next-themes';
      import {SessionGuard} from '@/components/SessionGuard'; import LoginPage from '@/app/page';
      createRoot(document.getElementById('root')).render(<SessionProvider><ThemeProvider>
        <SessionGuard>{location.pathname === '/' ? <LoginPage/> : <main data-testid="working-screen">{location.pathname}</main>}</SessionGuard>
      </ThemeProvider></SessionProvider>);`;
    const bundle = await esbuild.build({ stdin: { contents: app, resolveDir: root, loader: 'tsx' }, bundle: true, write: false,
      absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), jsx: 'automatic', nodePaths: [path.join(root, 'node_modules')],
      define: { 'process.env': '{"NODE_ENV":"development"}' }, plugins: [{ name: 'next-fixture', setup(build) {
        build.onResolve({ filter: /^next\/(image|navigation)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
        build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ resolveDir: root, loader: 'jsx', contents:
          args.path === 'next/navigation' ? `export const usePathname=()=>location.pathname; export const useRouter=()=>({replace:p=>location.replace(p)});`
            : `import React from 'react'; export default function Image({priority,unoptimized,...props}){return <img {...props}/>}`,
        }));
      } }] });
    let origin;
    server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, origin);
        if (url.pathname === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].contents); }
        if (url.pathname.startsWith('/api/auth/')) {
          const chunks = []; for await (const chunk of req) chunks.push(chunk);
          const request = new Request(url, { method: req.method, headers: req.headers,
            ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) });
          const response = url.pathname === '/api/auth/login-challenge' ? await challengeRoute.POST(request)
            : await Auth(request, { ...config, basePath: '/api/auth', trustHost: true, useSecureCookies: false });
          res.statusCode = response.status;
          for (const [key, value] of response.headers) if (key !== 'set-cookie') res.setHeader(key, value);
          res.setHeader('Set-Cookie', response.headers.getSetCookie());
          return res.end(Buffer.from(await response.arrayBuffer()));
        }
        if (url.pathname === '/api/session/activity') { res.writeHead(204); return res.end(); }
        if (url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg')) { res.writeHead(204); return res.end(); }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end('<!doctype html><html><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
      } catch (error) { console.error(error); res.statusCode = 500; res.end(String(error)); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    process.env.AUTH_URL = origin;
    process.env.NEXTAUTH_URL = origin;
    const launch = async profile => webkit.launchPersistentContext(profile, {
      headless: true, viewport: { width: 390, height: 844 }, hasTouch: true,
    });
    for (const role of ['AUDITOR', 'TU', 'ADMIN', 'ENROLL']) {
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'uppetit-resume-')); profiles.push(profile);
      context = await launch(profile);
      context.setDefaultTimeout(10000);
      let page = await context.newPage();
      const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
      // A slow session check must not briefly present a login form.
      await page.route('**/api/auth/session', async route => { await new Promise(resolve => setTimeout(resolve, 200)); await route.continue(); });
      await page.goto(origin);
      assert.equal(await page.getByPlaceholder('Введите логин').count(), 0);
      await page.getByPlaceholder('Введите логин').fill(role);
      await page.getByPlaceholder('Введите пароль').fill('fixture-password');
      await page.getByRole('button', { name: 'Войти в систему', exact: true }).click();
      if (role === 'ADMIN') {
        await page.getByPlaceholder('000000').fill('123456');
        await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
      }
      const destination = role === 'ADMIN' ? '/admin' : role === 'ENROLL' ? '/setup-mfa' : '/audit';
      await page.waitForURL(origin + destination);
      await page.getByTestId('working-screen').waitFor();
      const cookie = (await context.cookies()).find(item => item.name === 'authjs.session-token');
      assert.ok(cookie && cookie.expires > Date.now() / 1000 + 86400 - 10, 'Persistent cookie must have an explicit future expiry');
      assert.equal(cookie.httpOnly, true);
      assert.equal(await page.evaluate(() => document.cookie.includes('authjs.session-token')), false);
      const count = created;
      const record = [...records.values()].find(item => item.userId === role);
      const activity = record.lastActivityAt.getTime(), deadline = record.expiresAt.getTime();
      // Close the browser process, then reopen the same disk profile at the
      // PWA start_url (not its previous private URL).
      await context.close(); context = await launch(profile); page = await context.newPage();
      context.setDefaultTimeout(10000);
      assert.ok((await context.cookies()).some(item => item.name === 'authjs.session-token'), 'The browser profile must retain the persistent cookie');
      page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
      await page.goto(origin);
      await page.waitForURL(origin + destination);
      await page.getByTestId('working-screen').waitFor();
      assert.equal(await page.getByPlaceholder('Введите логин').count(), 0);
      assert.equal(created, count, 'Resume must reuse the existing server session');
      assert.equal(record.lastActivityAt.getTime(), activity, 'Automatic launch must not extend inactivity');
      assert.equal(record.expiresAt.getTime(), deadline);
      // Password setup remains accessible even when already signed in.
      await page.goto(origin + '/setup-password'); await page.getByTestId('working-screen').waitFor();
      assert.equal(new URL(page.url()).pathname, '/setup-password');
      // A preserved browser cookie must not bypass revocation, a block or expiry.
      if (role === 'AUDITOR') record.expiresAt = new Date(0);
      else if (role === 'TU') users.find(user => user.id === role).isActive = false;
      else if (role === 'ADMIN') users.find(user => user.id === role).authVersion++;
      else records.delete(record.id);
      await page.goto(origin);
      await page.getByPlaceholder('Введите логин').waitFor();
      assert.equal(new URL(page.url()).pathname, '/');
      assert.equal(created, count);
      assert.equal((await context.cookies()).some(item => item.name === 'authjs.session-token'), false);
      await page.goto(origin + destination);
      await page.waitForURL(origin + '/'); await page.getByPlaceholder('Введите логин').waitFor();
      assert.deepEqual(errors, []);
      await context.close(); context = null;
      console.log(`OK WebKit: ${role} resumes after a full browser restart; invalid sessions return to login.`);
    }
  } finally {
    await context?.close();
    if (server) await new Promise(resolve => server.close(resolve));
    process.chdir(originalDirectory);
    for (const profile of [...profiles, browserDirectory]) {
      assert.equal(path.dirname(profile), path.resolve(os.tmpdir()));
      assert.ok(path.basename(profile).startsWith('uppetit-resume-'));
      fs.rmSync(profile, { recursive: true, force: true });
    }
    for (const [key, value] of Object.entries(previousEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
