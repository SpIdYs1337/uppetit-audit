const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const publicDir = path.resolve(__dirname, '../public');

test('generated service worker caches public assets and uses the network for private data', async () => {
  const routes = [], imported = []; let manifest;
  class NetworkOnly {}
  class CacheFirst { constructor(options) { this.options = options; } }
  const workbox = {
    NetworkOnly, CacheFirst, ExpirationPlugin: class {}, clientsClaim() {}, cleanupOutdatedCaches() {},
    precacheAndRoute(entries) { manifest = entries; },
    registerRoute(match, handler) { routes.push({ match, handler }); },
  };
  const self = { define: (_, factory) => factory(workbox), skipWaiting() {} };
  vm.runInNewContext(fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8'), {
    self, define: self.define, importScripts: value => imported.push(value),
  });
  assert.ok(manifest?.length, 'Run npm run build before this test');
  assert.equal(manifest.some(entry => /^\/(api|admin|audit|setup-password|setup-mfa)(\/|\?|$)/.test(entry.url) || entry.url === '/'), false);
  assert.equal(routes.length, 2);
  const request = (pathname, mode = 'cors', rsc = '') => ({
    url: new URL(`https://app.example${pathname}`), sameOrigin: true, request: { mode, headers: { get: name => name === 'RSC' ? rsc : null } },
  });
  for (const data of [request('/api/users'), request('/api/auth/session'), request('/api/pdf/123'), request('/audit/run', 'navigate'), request('/admin/users', 'cors', '1')]) {
    const matched = routes.find(route => route.match(data));
    assert.ok(matched.handler instanceof NetworkOnly);
  }
  const assets = routes.find(route => route.match(request('/_next/static/chunks/app.js')));
  assert.ok(assets.handler instanceof CacheFirst);
  assert.equal(assets.handler.options.cacheName, 'uppetit-public-v2');
  assert.equal(routes.some(route => route.match({ ...request('/audits/photo.jpg'), sameOrigin: false })), false);

  assert.equal(imported.length, 1, 'Push handlers and cache cleanup must be imported');
  const listeners = {}, deleted = [];
  vm.runInNewContext(fs.readFileSync(path.join(publicDir, path.basename(imported[0])), 'utf8'), {
    self: { addEventListener: (name, fn) => { listeners[name] = fn; } },
    caches: { keys: async () => ['apis', 'start-url', 'others', 'uppetit-public-v2', 'workbox-precache-v2-app'], delete: async name => deleted.push(name) },
    URL, Promise,
  });
  let activation;
  listeners.activate({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted.sort(), ['apis', 'others', 'start-url']);
  assert.equal(typeof listeners.push, 'function'); assert.equal(typeof listeners.notificationclick, 'function');
});
