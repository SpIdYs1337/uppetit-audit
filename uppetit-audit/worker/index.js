/* Imported by next-pwa into the generated worker. */
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name =>
    !name.startsWith('workbox-precache') && name !== 'uppetit-public-v2'
  ).map(name => caches.delete(name)))));
});

self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: '/logo3.png', badge: '/logo3.png',
    vibrate: [100, 50, 100], data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.clients.openWindow(url.href));
});
