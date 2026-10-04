// Offline support: app shell cached on install; store previews/files cached as they're used.
const SHELL = 'facehub-shell-v2', RUNTIME = 'facehub-runtime-v1';
const FILES = ['./', 'index.html', 'app.js', 'face.js', 'c29ble.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.includes('/api/')) return;
  if (url.hostname.endsWith('moyoung.com') && url.pathname.startsWith('/face-preview/')) {
    // Store previews never change: cache first.
    e.respondWith(caches.open(RUNTIME).then(async c => (await c.match(e.request)) ||
      fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })));
  } else if (url.origin === location.origin) {
    // Our own files: network first so updates arrive, cache as offline fallback.
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) caches.open(SHELL).then(c => c.put(e.request, r.clone()));
      return r;
    }).catch(() => caches.match(e.request)));
  }
});
