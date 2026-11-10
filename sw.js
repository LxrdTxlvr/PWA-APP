// ==========================================================================
// Café Aroma PWA - Service Worker Completo
// Estrategias de Caché: Cache-First, Network-First, Stale-While-Revalidate
// ==========================================================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `cafe-aroma-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `cafe-aroma-dynamic-${CACHE_VERSION}`;

// Activos del App Shell para precaché en evento install
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/notifications.js',
  './js/device.js',
  './manifest.json',
  './data/products.json',
  './data/branches.json',
  './icons/favicon.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-192x192.png',
  './icons/icon-256x256.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable-192x192.png',
  './icons/icon-maskable-512x512.png'
];

// --------------------------------------------------------------------------
// 1. EVENTO INSTALL: Precaché del App Shell
// --------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Instalando y cacheando App Shell`);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => {
        console.log(`[SW ${CACHE_VERSION}] App Shell cacheado exitosamente`);
      })
      .catch((err) => {
        console.error('[SW] Error al precachear App Shell:', err);
      })
  );
});

// --------------------------------------------------------------------------
// 2. EVENTO ACTIVATE: Limpieza de cachés antiguas
// --------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  console.log(`[SW ${CACHE_VERSION}] Activado. Limpiando cachés previas...`);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            console.log('[SW] Eliminando caché obsoleta:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // Tomar el control inmediatamente de todos los clientes abiertos (Fase 9.1)
      return self.clients.claim();
    })
  );
});

// --------------------------------------------------------------------------
// 3. EVENTO FETCH: Aplicación de las 3 Estrategias de Caché
// --------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignorar peticiones que no sean GET o esquemas no soportados (ej. chrome-extension)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // ESTRATEGIA 1: NETWORK-FIRST (con fallback a caché y luego a offline.html)
  // Aplicada a navegaciones HTML (páginas principales y fichas SSR)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Si la respuesta es exitosa, guardar copia en dynamic cache
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Si falla la red, buscar en caché previa
          const cached = await caches.match(request);
          if (cached) return cached;

          // Si no está en caché, servir la página offline.html de respaldo (Fase 7.1)
          const offlineFallback = await caches.match('./offline.html');
          if (offlineFallback) return offlineFallback;

          return caches.match('./index.html');
        })
    );
    return;
  }

  // ESTRATEGIA 2: STALE-WHILE-REVALIDATE
  // Aplicada a peticiones de datos de la API (/api/productos, /api/sucursales, ./data/)
  if (url.pathname.includes('/api/productos') || 
      url.pathname.includes('/api/sucursales') || 
      url.pathname.includes('/data/')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        
        // Petición en red en segundo plano para refrescar caché
        const networkFetch = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((err) => {
          console.log('[SW] Network fetch falló en stale-while-revalidate:', err.message);
        });

        // Retornar caché inmediata si existe; si no, esperar a la red
        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // ESTRATEGIA 3: CACHE-FIRST (con fallback a Red)
  // Aplicada a recursos estáticos inmutables (CSS, JS, iconos, imágenes, fuentes)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está en caché, obtener de la red y almacenar en caché dinámico
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});

// --------------------------------------------------------------------------
// 4. CICLO DE VIDA: Escuchar mensaje skipWaiting (Fase 9.1)
// --------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[SW] Mensaje skipWaiting recibido, tomando control...');
    self.skipWaiting();
  }
});
