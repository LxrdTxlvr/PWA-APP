const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Carga asíncrona de web-push (módulo ESM)
let webpush = null;
import('web-push').then(wp => {
  webpush = wp;
  const vapidKeys = getVapidKeys();
  if (vapidKeys) {
    webpush.setVapidDetails(
      'mailto:admin@cafearoma.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    console.log('🔔 Web Push VAPID inicializado correctamente');
  }
}).catch(err => {
  console.warn('⚠️ No se pudo inicializar web-push:', err.message);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Carga de datos en memoria
const productsFilePath = path.join(__dirname, 'data', 'products.json');
const branchesFilePath = path.join(__dirname, 'data', 'branches.json');
const reviewsFilePath = path.join(__dirname, 'data', 'reviews.json');
const subscriptionsFilePath = path.join(__dirname, 'data', 'subscriptions.json');
const vapidFilePath = path.join(__dirname, 'vapid.json');

function getVapidKeys() {
  if (fs.existsSync(vapidFilePath)) {
    return JSON.parse(fs.readFileSync(vapidFilePath, 'utf-8'));
  }
  return null;
}

function getSubscriptions() {
  if (fs.existsSync(subscriptionsFilePath)) {
    return JSON.parse(fs.readFileSync(subscriptionsFilePath, 'utf-8'));
  }
  return [];
}

function saveSubscriptions(subs) {
  fs.writeFileSync(subscriptionsFilePath, JSON.stringify(subs, null, 2), 'utf-8');
}

function getProducts() {
  return JSON.parse(fs.readFileSync(productsFilePath, 'utf-8'));
}

function getBranches() {
  return JSON.parse(fs.readFileSync(branchesFilePath, 'utf-8'));
}

function getReviews() {
  return JSON.parse(fs.readFileSync(reviewsFilePath, 'utf-8'));
}

function saveReviews(reviews) {
  fs.writeFileSync(reviewsFilePath, JSON.stringify(reviews, null, 2), 'utf-8');
}

// --------------------------------------------------------------------------
// 4.1 APIs REST del Catálogo y Sucursales
// --------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Café Aroma PWA', timestamp: new Date().toISOString() });
});

app.get('/api/productos', (req, res) => {
  res.json(getProducts());
});

app.get('/api/productos/:id', (req, res) => {
  const products = getProducts();
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.json(product);
});

app.get('/api/sucursales', (req, res) => {
  res.json(getBranches());
});

app.get('/api/resenas', (req, res) => {
  const reviews = getReviews();
  const { productId } = req.query;
  if (productId) {
    return res.json(reviews.filter(r => r.productId === productId));
  }
  res.json(reviews);
});

app.post('/api/resenas', (req, res) => {
  const { productId, productName, author, rating, comment } = req.body;
  if (!author || !comment || !rating) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const reviews = getReviews();
  const newReview = {
    id: `rev-${Date.now()}`,
    productId: productId || 'general',
    productName: productName || 'Café Aroma',
    author: author.trim(),
    rating: Number(rating),
    comment: comment.trim(),
    date: new Date().toISOString(),
    synced: true
  };

  reviews.unshift(newReview);
  saveReviews(reviews);

  console.log(`[Servidor] Nueva reseña recibida de ${newReview.author} para ${newReview.productName}`);
  res.status(201).json(newReview);
});

// --------------------------------------------------------------------------
// 10.3 Servidor: Endpoints de Web Push y Suscripciones (Fase 10)
// --------------------------------------------------------------------------
app.get('/api/push/vapid-public-key', (req, res) => {
  const keys = getVapidKeys();
  if (!keys) {
    return res.status(500).json({ error: 'Claves VAPID no configuradas en el servidor' });
  }
  res.json({ publicKey: keys.publicKey });
});

app.post('/api/push/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }

  const subs = getSubscriptions();
  const exists = subs.some(s => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    saveSubscriptions(subs);
    console.log(`[Push] Nueva suscripción registrada. Total activas: ${subs.length}`);
  }

  res.status(201).json({ status: 'subscribed', total: subs.length });
});

app.post('/api/push/send', async (req, res) => {
  const { title, body, icon, url } = req.body;
  const payload = JSON.stringify({
    title: title || '☕ Café Aroma - Promoción del Día',
    body: body || '¡Ven hoy por tu Flat White artesanal con 20% de descuento!',
    icon: icon || './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    data: {
      url: url || './index.html#/catalogo'
    }
  });

  const subs = getSubscriptions();
  if (subs.length === 0) {
    return res.status(200).json({ message: 'No hay clientes suscritos actualmente' });
  }

  if (!webpush) {
    return res.status(503).json({ error: 'Módulo web-push aún no disponible' });
  }

  const results = await Promise.allSettled(
    subs.map(sub => webpush.sendNotification(sub, payload))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected');

  console.log(`[Push] Envíos completados: ${successful} exitosos, ${failed.length} fallidos`);

  res.json({
    status: 'sent',
    totalSubscribers: subs.length,
    successful,
    failed: failed.length
  });
});

// --------------------------------------------------------------------------
// 4.3 SSR: Ficha del producto generada en el servidor (Server-Side Rendering)
// --------------------------------------------------------------------------
app.get('/producto/:id', (req, res) => {
  const products = getProducts();
  const product = products.find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Café no encontrado | Café Aroma</title>
        <link rel="stylesheet" href="/css/styles.css">
      </head>
      <body>
        <main class="app-main text-center" style="padding-top: 60px;">
          <h1>☕ Café no encontrado</h1>
          <p>El producto solicitado no existe en nuestro catálogo.</p>
          <a href="/" class="btn btn-primary mt-4">Volver al inicio</a>
        </main>
      </body>
      </html>
    `);
  }

  // Generar HTML completo en el servidor (SSR) para SEO e indexación inmediata
  const notesHtml = product.notes.map(note => `<span class="tag">🌿 ${note}</span>`).join(' ');

  const ssrHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${product.name} | Café Aroma Especialidad</title>
  <meta name="description" content="${product.description}">
  <meta name="theme-color" content="#4a2c11">

  <!-- Open Graph / SEO -->
  <meta property="og:title" content="${product.name} - Café Aroma">
  <meta property="og:description" content="${product.description}">
  <meta property="og:type" content="product">
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="MXN">

  <!-- PWA Manifest y Estilos -->
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="icon" type="image/png" href="/icons/favicon.png">
</head>
<body>
  <!-- Header App Shell -->
  <header class="app-header">
    <div class="header-container">
      <a href="/" class="brand-logo">
        <span class="brand-icon">☕</span>
        <span class="brand-name">Café Aroma</span>
      </a>
      <div class="header-actions">
        <span class="network-badge online">SSR Rendered</span>
      </div>
    </div>
  </header>

  <!-- Contenido Ficha SSR Hidratable -->
  <main id="app-content" class="app-main" data-ssr-product="${product.id}">
    <div class="mb-4">
      <a href="/#/catalogo" class="btn btn-sm btn-secondary">← Volver al Catálogo</a>
    </div>

    <article class="product-detail" itemscope itemtype="https://schema.org/Product">
      <div class="detail-hero">
        <span class="product-emoji" aria-hidden="true">${product.icon}</span>
      </div>
      <div class="detail-content">
        <div class="detail-header">
          <h1 class="card-title" style="font-size: 1.8rem;" itemprop="name">${product.name}</h1>
          <span class="detail-price" itemprop="price">$${product.price} MXN</span>
        </div>

        <p class="card-desc" style="font-size: 1.05rem;" itemprop="description">${product.description}</p>

        <div class="detail-tags">
          <span class="tag">📍 Origen: ${product.origin}</span>
          <span class="tag">🔥 ${product.roast}</span>
          <span class="tag">⭐ ${product.rating} (${product.reviewsCount} reseñas)</span>
          ${notesHtml}
        </div>

        <div class="detail-actions">
          <button id="btn-share-ssr" class="btn btn-primary" data-title="${product.name}" data-text="${product.description}">
            📤 Compartir Café
          </button>
          <button id="btn-fav-ssr" class="btn btn-secondary" data-product-id="${product.id}">
            ❤️ Guardar en Favoritos
          </button>
        </div>
      </div>
    </article>
  </main>

  <!-- Navegación Inferior -->
  <nav class="app-nav">
    <a href="/#/catalogo" class="nav-item active"><span class="nav-icon">📖</span><span class="nav-label">Catálogo</span></a>
    <a href="/#/cerca" class="nav-item"><span class="nav-icon">📍</span><span class="nav-label">Cerca de mí</span></a>
    <a href="/#/resenas" class="nav-item"><span class="nav-icon">✍️</span><span class="nav-label">Reseñas</span></a>
    <a href="/#/ajustes" class="nav-item"><span class="nav-icon">⚙️</span><span class="nav-label">Ajustes</span></a>
  </nav>

  <!-- Datos embebidos para hidratación en el cliente -->
  <script id="__SSR_PRODUCT_DATA__" type="application/json">
    ${JSON.stringify(product)}
  </script>

  <!-- Scripts de la PWA para hidratar la página -->
  <script src="/js/db.js"></script>
  <script src="/js/device.js"></script>
  <script src="/js/notifications.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>`;

  res.send(ssrHtml);
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '..'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Fallback a index.html para cualquier otra ruta
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`☕ Servidor Café Aroma PWA ejecutándose en http://localhost:${PORT}`);
  });
}

module.exports = app;
