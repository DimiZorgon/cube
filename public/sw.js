// public/sw.js - Cube Studio Service Worker for offline support & PWA
const CACHE_NAME = 'cube-studio-v3';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/rubik.svg',
  '/rubik.png',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignore cross-origin requests and Vite dev/HMR requests
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/node_modules/') || url.pathname.startsWith('/@')) {
    return;
  }

  // Navigation requests: Network-first, fallback to cached route or index.html (never cache 404s)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (!res || !res.ok) {
            throw new Error(`Navigation status ${res ? res.status : 'unknown'}`);
          }
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached && cached.ok) return cached;
          const isEn = url.pathname === '/en' || url.pathname.startsWith('/en/');
          const fallback = await caches.match(isEn ? '/en/index.html' : '/index.html');
          return fallback || caches.match('/index.html');
        })
    );
    return;
  }

  // Hashed static assets in /assets/ and static icons: Cache-first
  if (url.pathname.startsWith('/assets/') || url.pathname.match(/\.(png|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(networkRes => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          }
          return networkRes;
        });
      })
    );
    return;
  }
});

