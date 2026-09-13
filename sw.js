const CACHE_VERSION = 'matgary-v1.8.22';
const CACHE_NAME = CACHE_VERSION;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => console.log('[SW] installed:', CACHE_VERSION))
      .catch(err => {
        console.error('[SW] install failed:', err);
        throw err;
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
      .then(() => console.log('[SW] activated:', CACHE_VERSION))
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin !== location.origin) return;

  // صفحات HTML: Network First
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(req, copy));

          return res;
        })
        .catch(() =>
          caches.match(req)
            .then(cached =>
              cached || caches.match('./index.html')
            )
        )
    );

    return;
  }

  // باقي الملفات: Cache First
  event.respondWith(
    caches.match(req)
      .then(cached => {
        if (cached) return cached;

        return fetch(req).then(res => {
          const copy = res.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(req, copy));

          return res;
        });
      })
  );
});
