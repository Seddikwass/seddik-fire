// Service worker : jeu jouable hors ligne (coquille en cache), API jamais mise en cache.
const V = 'ft26-v2.8.0';
const CORE = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'js/app.js', 'js/career.js', 'js/match.js', 'js/audio.js', 'js/data.js', 'js/util.js', 'js/i18n.js', 'js/storage.js', 'icons/icon-192.png', 'icons/icon-512.png', 'privacy.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/api/') || u.origin !== location.origin) return;
  // réseau d'abord (mises à jour), cache en secours (hors ligne)
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
