/**
 * GTA V Web Player Service Worker
 * Manages offline shell caching and approved runtime module caching.
 */

const CACHE_NAME = 'gtav-web-player-v1.0.4';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/runtime-manifests/gtav-web-runtime.json',
  '/runtime-manifests/v86-micro-runtime.json'
];

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => {
      return (self as any).skipWaiting();
    })
  );
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return (self as any).clients.claim();
    })
  );
});

self.addEventListener('fetch', (event: any) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  // Never cache proprietary or dynamically mounted user files
  if (url.pathname.startsWith('/user-content/') || url.pathname.includes('proprietary')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and refresh in background for runtime manifests
        if (url.pathname.endsWith('.json')) {
          fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Cache shell assets and runtime manifests
        if (
          url.pathname.startsWith('/assets/') ||
          url.pathname.startsWith('/runtime-manifests/') ||
          url.pathname === '/' ||
          url.pathname === '/index.html'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return networkResponse;
      });
    })
  );
});

export {};
