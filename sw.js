// Offline support and fast start.
// App files: served from the cache of ONE release (instant start, never a mix of old and new files).
// Releasing: change SHELL below. The phone then downloads the new release in the background and
// the page offers to reload into it.
const SHELL = 'facehub-shell-v10', RUNTIME = 'facehub-runtime-v1', DATA = 'facehub-data-v1';
const FILES = ['./', 'index.html', 'app.js', 'face.js', 'c29ble.js', 'colorpick.js', 'i18n.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
// Served by PC FaceHub while developing: always take the newest files from disk.
const DEV = ['localhost', '127.0.0.1'].includes(location.hostname);

self.addEventListener('install', e => e.waitUntil(caches.open(SHELL)
  .then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))) // straight from the server, not the HTTP cache
  .then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => ![SHELL, RUNTIME, DATA].includes(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));

const fresh = req => fetch(req, {cache: 'no-cache'});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.includes('/api/')) return;
  if (url.hostname.endsWith('moyoung.com') && /\.(png|jpe?g)$/i.test(url.pathname)) {
    // Store previews never change: cache first, keep them for good.
    // Fetch in CORS mode (the CDN allows it) so we can see the status and only keep good images;
    // a plain <img> request would give an opaque response that can't be checked.
    e.respondWith(caches.open(RUNTIME).then(async c => (await c.match(url.href)) ||
      fetch(url.href, {mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(10000)}) // a hung request blocks the queue; give up so the page retries
        .then(r => { if (r.ok) c.put(url.href, r.clone()); return r; })));
  } else if (url.origin === location.origin) {
    if (DEV) {
      e.respondWith(fresh(e.request).catch(() => caches.match(e.request, {ignoreSearch: true})));
    } else if (url.pathname.endsWith('/catalog.json')) {
      // Store list: show the saved copy at once, refresh it in the background for next time.
      e.respondWith(caches.open(DATA).then(async c => {
        const update = fresh(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
        const saved = await c.match(e.request);
        if (saved) { e.waitUntil(update.catch(() => {})); return saved; }
        return update;
      }));
    } else {
      // App files: this release's saved copy; the network only for anything not saved.
      e.respondWith(caches.open(SHELL).then(async c =>
        (await c.match(e.request, {ignoreSearch: true})) || fetch(e.request)));
    }
  }
});
