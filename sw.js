const CACHE_NAME = 'lm-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './schedule.html',
  './belongings.html',
  './time-calc.html',
  './shift.html',
  './wishlist.html',
  './event.html',
  './style.css',
  './app.js',
  './home.js',
  './schedule.js',
  './belongings.js',
  './time-calc.js',
  './shift.js',
  './wishlist.js',
  './event.js',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ネットワーク優先、失敗したらキャッシュにフォールバック(データ自体はlocalStorageなのでオフラインでも動作)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
