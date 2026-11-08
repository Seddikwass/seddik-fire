/* Seddik Fire — service worker : le jeu se lance hors ligne après la première ouverture. */
const VERSION = 'seddik-fire-v63';
const FONTS = 'seddik-fire-fonts';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './privacy.html',
  './icons/icon-192-v2.png',
  './icons/icon-512-v2.png',
  './icons/maskable-192-v2.png',
  './icons/maskable-512-v2.png',
  './icons/apple-touch-icon-v2.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Polices Google : servies depuis le cache, rafraîchies en arrière-plan.
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(caches.open(FONTS).then(async (cache) => {
      const hit = await cache.match(req);
      const net = fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      }).catch(() => hit || Response.error());
      return hit || net;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Pages : ouverture instantanée depuis le cache, mise à jour en arrière-plan
  // (le serveur gratuit peut mettre longtemps à se réveiller). Sans cache : réseau.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html'));
      const net = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      });
      if (hit) { event.waitUntil(net.catch(() => {})); return hit; }
      return net.catch(() => caches.match('./index.html'));
    })());
    return;
  }

  // Fichiers : cache d'abord.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
