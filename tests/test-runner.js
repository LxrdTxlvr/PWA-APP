// ==========================================================================
// Café Aroma PWA - Batería Automatizada de Pruebas (Fase 12)
// ==========================================================================

const fs = require('fs');
const path = require('path');
const http = require('http');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 INICIANDO PRUEBAS DE CALIDAD CAFÉ AROMA PWA');
  console.log('====================================================\n');

  // ------------------------------------------------------------------------
  // GRUPO 1: Manifiesto Web e Iconos
  // ------------------------------------------------------------------------
  console.log('📦 1. Verificación del Web App Manifest e Iconos:');
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json existe en la raíz');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert(manifest.name && manifest.short_name, 'Manifest define name y short_name');
  assert(manifest.start_url, 'Manifest define start_url');
  assert(manifest.display === 'standalone', 'Manifest define display standalone');
  assert(manifest.background_color && manifest.theme_color, 'Manifest define colores de sistema y splash');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 8, `Manifest contiene al menos 8 iconos (${manifest.icons.length} encontrados)`);

  const has192 = manifest.icons.some(i => i.sizes === '192x192' && i.purpose === 'any');
  const has512 = manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'any');
  const hasMaskable = manifest.icons.some(i => i.purpose === 'maskable');
  assert(has192, 'Icono estándar 192x192 presente');
  assert(has512, 'Icono estándar 512x512 presente');
  assert(hasMaskable, 'Iconos adaptativos con purpose: maskable presentes');

  // ------------------------------------------------------------------------
  // GRUPO 2: Service Worker y Estrategias
  // ------------------------------------------------------------------------
  console.log('\n⚙️ 2. Verificación de Service Worker y Funcionamiento Offline:');
  const swPath = path.join(__dirname, '..', 'sw.js');
  assert(fs.existsSync(swPath), 'sw.js existe en el alcance raíz');

  const swContent = fs.readFileSync(swPath, 'utf-8');
  assert(swContent.includes("addEventListener('install'"), 'SW implementa evento install (App Shell precache)');
  assert(swContent.includes("addEventListener('activate'"), 'SW implementa evento activate y limpieza de caches');
  assert(swContent.includes("addEventListener('fetch'"), 'SW implementa evento fetch con estrategias');
  assert(swContent.includes("clients.claim()"), 'SW implementa clients.claim()');
  assert(swContent.includes("skipWaiting"), 'SW soporta skipWaiting para actualizaciones inmediatas');
  assert(swContent.includes("addEventListener('sync'"), 'SW implementa evento sync para Background Sync de reseñas');
  assert(swContent.includes("addEventListener('push'"), 'SW implementa evento push para notificaciones Web Push');
  assert(swContent.includes("addEventListener('notificationclick'"), 'SW implementa evento notificationclick');

  const offlineHtmlPath = path.join(__dirname, '..', 'offline.html');
  assert(fs.existsSync(offlineHtmlPath), 'offline.html de respaldo existe');

  // ------------------------------------------------------------------------
  // GRUPO 3: Módulos Cliente y Almacenamiento
  // ------------------------------------------------------------------------
  console.log('\n💾 3. Verificación de Módulos de Cliente (IndexedDB, Push, Hardware):');
  const dbPath = path.join(__dirname, '..', 'js', 'db.js');
  assert(fs.existsSync(dbPath), 'js/db.js (capa IndexedDB) existe');
  const dbContent = fs.readFileSync(dbPath, 'utf-8');
  assert(dbContent.includes('productos') && dbContent.includes('resenas_pendientes'), 'IndexedDB define almacenes para productos y outbox de reseñas');

  const devPath = path.join(__dirname, '..', 'js', 'device.js');
  assert(fs.existsSync(devPath), 'js/device.js existe');
  const DeviceModule = require(devPath);
  assert(typeof DeviceModule.haversineDistance === 'function', 'DeviceModule implementa cálculo de distancia Haversine');
  const dist = DeviceModule.haversineDistance(19.4326, -99.1332, 19.4184, -99.1601);
  assert(dist > 3.0 && dist < 3.5, `Haversine calcula correctamente la distancia en km (${dist} km)`);

  const notifPath = path.join(__dirname, '..', 'js', 'notifications.js');
  assert(fs.existsSync(notifPath), 'js/notifications.js existe');

  // ------------------------------------------------------------------------
  // GRUPO 4: Servidor Express, APIs REST y SSR
  // ------------------------------------------------------------------------
  console.log('\n🌐 4. Verificación de Servidor, APIs REST y SSR:');
  const app = require('../server/index.js');
  const TEST_PORT = 3847;

  await new Promise((resolveServer) => {
    const server = app.listen(TEST_PORT, async () => {
      // 4.1 Health API
      const health = await makeRequest(`http://localhost:${TEST_PORT}/api/health`);
      assert(health.status === 'ok', 'Endpoint /api/health responde status ok');

      // 4.2 Catálogo API
      const prods = await makeRequest(`http://localhost:${TEST_PORT}/api/productos`);
      assert(Array.isArray(prods) && prods.length >= 6, `Endpoint /api/productos retorna lista (${prods.length} productos)`);

      // 4.3 Sucursales API
      const branches = await makeRequest(`http://localhost:${TEST_PORT}/api/sucursales`);
      assert(Array.isArray(branches) && branches.length >= 4, `Endpoint /api/sucursales retorna lista (${branches.length} sucursales)`);

      // 4.4 VAPID Public Key API
      const vapidRes = await makeRequest(`http://localhost:${TEST_PORT}/api/push/vapid-public-key`);
      assert(vapidRes.publicKey && vapidRes.publicKey.length > 30, 'Endpoint /api/push/vapid-public-key retorna clave VAPID válida');

      // 4.5 Reseñas API (POST y GET)
      const testReview = {
        productId: 'cold-brew-nitro',
        productName: 'Cold Brew Nitro',
        author: 'Tester Automatizado',
        rating: 5,
        comment: 'Prueba unitaria de inserción de reseña'
      };
      const postReview = await makePostRequest(`http://localhost:${TEST_PORT}/api/resenas`, testReview);
      assert(postReview.id && postReview.author === 'Tester Automatizado', 'POST /api/resenas registra nueva reseña exitosamente');

      // 4.6 SSR Endpoint
      const ssrHtml = await makeRawRequest(`http://localhost:${TEST_PORT}/producto/cold-brew-nitro`);
      assert(ssrHtml.includes('Cold Brew Nitro'), 'SSR /producto/:id genera HTML con nombre de producto');
      assert(ssrHtml.includes('__SSR_PRODUCT_DATA__'), 'SSR /producto/:id incrusta script con datos de hidratación');
      assert(ssrHtml.includes('schema.org/Product'), 'SSR /producto/:id contiene marcado semántico estructurado');

      server.close(() => {
        resolveServer();
      });
    });
  });

  // ------------------------------------------------------------------------
  // RESUMEN FINAL
  // ------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`📊 RESUMEN: ${passedTests}/${totalTests} pruebas superadas (${failedTests} fallidas)`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ¡TODAS LAS PRUEBAS DE LA PWA FUERON SATISFACTORIAS!\n');
    process.exit(0);
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function makeRawRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function makePostRequest(url, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const parsedUrl = new URL(url);
    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

runTests();
