// ==========================================================================
// Service Worker Base - Café Aroma PWA
// ==========================================================================

const CACHE_NAME = 'cafe-aroma-cache-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/favicon.png'
];

// 1. EVENTO INSTALL: se dispara al registrar una nueva versión del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Evento install disparado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaché del App Shell completado');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[SW] Error en precaché durante install:', error);
      })
  );
});

// 2. EVENTO ACTIVATE: se dispara cuando el Service Worker toma el control
self.addEventListener('activate', (event) => {
  console.log('[SW] Evento activate disparado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Eliminando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. EVENTO FETCH: intercepta cada petición de red realizada por la app
self.addEventListener('fetch', (event) => {
  // Petición básica: responder desde la red o caché
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // En caso de fallo de red, intentar servir index.html para navegaciones
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
