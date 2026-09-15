// Kill-switch service worker.
// Jamino does not use a service worker. If an old service worker from a
// previous app is still registered on this origin, it must have come from
// elsewhere — replace it with this one so it unregisters and clears its caches.
self.addEventListener('install', () => {
  self.registration.unregister();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) =>
        clients.forEach((client) => {
          try {
            client.navigate(client.url);
          } catch {
            /* ignore */
          }
        })
      )
  );
});