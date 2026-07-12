/* global self, clients */
// Handlers de Web Push del Service Worker de BatchFit. Workbox los incorpora
// al SW generado vía workbox.importScripts (ver vite.config.ts). JS plano:
// este fichero no pasa por el build.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'BatchFit', {
      body: data.body || '',
      icon: self.registration.scope + 'icon-192x192.png',
      badge: self.registration.scope + 'icon-192x192.png',
      tag: 'batchfit-reminder',
      data: { url: self.registration.scope + '?tab=3' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((w) => w.url.startsWith(self.registration.scope));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
