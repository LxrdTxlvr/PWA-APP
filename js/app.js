// ==========================================================================
// Café Aroma PWA - Enrutador y Vistas CSR (Client-Side Rendering)
// ==========================================================================

const API_BASE = window.location.origin.includes('github.io') ? './data' : '/api';

// Estado global de la aplicación en el cliente
const AppState = {
  currentView: 'catalogo',
  products: [],
  branches: [],
  reviews: [],
  favorites: new Set(),
  deferredInstallPrompt: null
};

// --------------------------------------------------------------------------
// 4.1 Obtención de Datos Remotos con fallback local
// --------------------------------------------------------------------------
async function fetchCatalogProducts() {
  try {
    const endpoint = window.location.origin.includes('github.io') 
      ? './data/products.json' 
      : '/api/productos';
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Respuesta de red no satisfactoria');
    const data = await response.json();
    AppState.products = data;
    
    // Si la capa IndexedDB está disponible, respaldar localmente (Fase 6)
    if (window.CafeDB && typeof CafeDB.saveProducts === 'function') {
      await CafeDB.saveProducts(data);
    }
    return data;
  } catch (error) {
    console.warn('[App] Error al obtener catálogo de la red, intentando respaldo local:', error);
    if (window.CafeDB && typeof CafeDB.getProducts === 'function') {
      const localData = await CafeDB.getProducts();
      if (localData && localData.length > 0) {
        AppState.products = localData;
        showToast('📦 Mostrando catálogo desde respaldo local (sin conexión)');
        return localData;
      }
    }
    return [];
  }
}

async function fetchBranchesData() {
  try {
    const endpoint = window.location.origin.includes('github.io')
      ? './data/branches.json'
      : '/api/sucursales';
    const response = await fetch(endpoint);
    const data = await response.json();
    AppState.branches = data;
    return data;
  } catch (err) {
    console.warn('[App] Error al cargar sucursales:', err);
    return [];
  }
}

// --------------------------------------------------------------------------
// 4.2 Enrutador Hash del lado del cliente (CSR)
// --------------------------------------------------------------------------
function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  // Ruta inicial
  if (!window.location.hash) {
    window.location.hash = '#/catalogo';
  } else {
    handleRoute();
  }
}

async function handleRoute() {
  const hash = window.location.hash || '#/catalogo';
  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  // Actualizar indicador visual de menú activo
  document.querySelectorAll('.nav-item').forEach(item => {
    const route = item.getAttribute('href');
    if (route && hash.startsWith(route)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Parsear ruta
  if (hash === '#/catalogo' || hash === '#' || hash === '') {
    renderCatalogoView(appContent);
  } else if (hash.startsWith('#/producto/')) {
    const productId = hash.replace('#/producto/', '');
    renderProductoDetailView(appContent, productId);
  } else if (hash === '#/cerca') {
    renderCercaView(appContent);
  } else if (hash === '#/resenas') {
    renderResenasView(appContent);
  } else if (hash === '#/ajustes') {
    renderAjustesView(appContent);
  } else {
    appContent.innerHTML = `
      <div class="text-center" style="padding: 40px 0;">
        <h2>🔍 Página no encontrada</h2>
        <p class="text-muted mt-2">La ruta ingresada no existe.</p>
        <a href="#/catalogo" class="btn btn-primary mt-4">Ir al Catálogo</a>
      </div>
    `;
  }
}

// --------------------------------------------------------------------------
// Vistas CSR
// --------------------------------------------------------------------------

// Vista: Catálogo
async function renderCatalogoView(container, filterCategory = 'Todos') {
  container.innerHTML = `
    <div class="skeleton-container">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton-grid">
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
      </div>
    </div>
  `;

  if (AppState.products.length === 0) {
    await fetchCatalogProducts();
  }

  const categories = ['Todos', 'Calientes', 'Fríos', 'Filtrados', 'Clásicos', 'Especialidades'];
  const filtered = filterCategory === 'Todos' 
    ? AppState.products 
    : AppState.products.filter(p => p.category.toLowerCase() === filterCategory.toLowerCase());

  const categoriesHtml = categories.map(cat => `
    <button class="tag filter-btn ${cat === filterCategory ? 'active' : ''}" data-cat="${cat}" style="cursor: pointer; border: none; padding: 6px 14px;">
      ${cat}
    </button>
  `).join(' ');

  const cardsHtml = filtered.map(product => {
    const isFav = AppState.favorites.has(product.id);
    return `
      <article class="card" data-id="${product.id}">
        <div class="card-img-wrapper">
          <span>${product.icon}</span>
        </div>
        <div class="card-body">
          <div class="card-header-row">
            <h2 class="card-title">${product.name}</h2>
            <span class="card-price">$${product.price} MXN</span>
          </div>
          <p class="card-desc">${product.description}</p>
          <div class="card-meta">
            <span>⭐ ${product.rating} (${product.reviewsCount})</span>
            <span>📍 ${product.roast}</span>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 14px;">
            <a href="#/producto/${product.id}" class="btn btn-primary btn-sm" style="flex: 1;">Ver Detalle</a>
            <button class="btn-icon btn-toggle-fav" data-id="${product.id}" title="Favorito" aria-label="Favorito">
              ${isFav ? '❤️' : '🤍'}
            </button>
            <a href="/producto/${product.id}" class="btn btn-secondary btn-sm" title="Probar versión SSR generada en servidor">SSR</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Hero / Banner de Bienvenida y Botón de Instalación (Fase 5.3) -->
    <section class="card" style="background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)); color: #ffffff; padding: 20px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="max-width: 520px;">
          <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--color-accent-light);">Experiencia PWA</span>
          <h1 style="font-size: 1.5rem; font-weight: 800; margin: 4px 0;">Café de Especialidad en tus Manos</h1>
          <p style="font-size: 0.9rem; opacity: 0.9;">Descubre granos selectos, ubica tu sucursal más cercana y comparte reseñas incluso sin conexión a Internet.</p>
        </div>
        <div id="home-install-wrapper">
          <button id="btn-install-home" class="btn btn-light" style="font-weight: 700; box-shadow: var(--shadow-md);">
            📲 Instalar App en mi dispositivo
          </button>
        </div>
      </div>
    </section>

    <header class="mb-4">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 8px;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--color-primary);">Nuestro Menú de Cafés</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">Granos seleccionados y tostados artesanalmente en pequeños lotes.</p>
        </div>
        <span class="tag">⚡ Listo Offline</span>
      </div>
      <div style="display: flex; gap: 8px; overflow-x: auto; padding: 12px 0;" id="catalog-filters">
        ${categoriesHtml}
      </div>
    </header>

    <section class="catalog-grid" aria-label="Catálogo de productos">
      ${cardsHtml}
    </section>
  `;

  // Listener para el botón de instalación en Home (Fase 5.3)
  const homeInstallBtn = document.getElementById('btn-install-home');
  if (homeInstallBtn) {
    homeInstallBtn.addEventListener('click', triggerInstallPrompt);
  }

  // Eventos de filtros
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat');
      renderCatalogoView(container, cat);
    });
  });

  // Eventos de favoritos
  container.querySelectorAll('.btn-toggle-fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      toggleFavorite(id);
      renderCatalogoView(container, filterCategory);
    });
  });
}

// Vista: Detalle de Producto (CSR)
async function renderProductoDetailView(container, productId) {
  if (AppState.products.length === 0) {
    await fetchCatalogProducts();
  }

  const product = AppState.products.find(p => p.id === productId);
  if (!product) {
    container.innerHTML = `
      <div class="text-center" style="padding: 40px 0;">
        <h2>☕ Producto no encontrado</h2>
        <a href="#/catalogo" class="btn btn-primary mt-4">Regresar al Catálogo</a>
      </div>
    `;
    return;
  }

  const isFav = AppState.favorites.has(product.id);
  const notesHtml = product.notes.map(n => `<span class="tag">🌿 ${n}</span>`).join(' ');

  container.innerHTML = `
    <div class="mb-4">
      <a href="#/catalogo" class="btn btn-sm btn-secondary">← Volver al Catálogo</a>
    </div>

    <article class="product-detail">
      <div class="detail-hero">
        <span>${product.icon}</span>
      </div>
      <div class="detail-content">
        <div class="detail-header">
          <h1 class="card-title" style="font-size: 1.8rem;">${product.name}</h1>
          <span class="detail-price">$${product.price} MXN</span>
        </div>

        <p class="card-desc" style="font-size: 1.05rem;">${product.description}</p>

        <div class="detail-tags">
          <span class="tag">📍 Origen: ${product.origin}</span>
          <span class="tag">🔥 ${product.roast}</span>
          <span class="tag">⭐ ${product.rating} (${product.reviewsCount} reseñas)</span>
          ${notesHtml}
        </div>

        <div class="detail-actions">
          <button id="btn-share-product" class="btn btn-primary">📤 Compartir</button>
          <button id="btn-fav-detail" class="btn btn-secondary">${isFav ? '❤️ En Favoritos' : '🤍 Guardar en Favoritos'}</button>
          <a href="#/resenas" class="btn btn-secondary">✍️ Dejar Reseña</a>
        </div>
      </div>
    </article>
  `;

  // Asignar listeners
  const shareBtn = document.getElementById('btn-share-product');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      if (window.DeviceModule && typeof DeviceModule.share === 'function') {
        DeviceModule.share({
          title: product.name,
          text: `${product.name} en Café Aroma: ${product.description}`,
          url: window.location.href
        });
      } else if (navigator.share) {
        navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href
        }).catch(err => console.log('Share cancelado', err));
      } else {
        navigator.clipboard?.writeText(window.location.href);
        showToast('📋 Enlace copiado al portapapeles');
      }
    });
  }

  const favBtn = document.getElementById('btn-fav-detail');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      toggleFavorite(product.id);
      renderProductoDetailView(container, productId);
    });
  }
}

// Vista: Cerca de mí (placeholder que se enriquece en Fase 11)
async function renderCercaView(container) {
  if (AppState.branches.length === 0) {
    await fetchBranchesData();
  }

  container.innerHTML = `
    <header class="mb-4">
      <h1 style="font-size: 1.6rem; font-weight: 800; color: var(--color-primary);">Sucursales Café Aroma</h1>
      <p style="color: var(--text-secondary); font-size: 0.95rem;">Encuentra tu barra de café más cercana y consulta horarios.</p>
      <button id="btn-get-location" class="btn btn-primary mt-2">
        📍 Detectar mi ubicación más cercana
      </button>
    </header>

    <div id="branches-list" class="catalog-grid">
      ${AppState.branches.map(b => `
        <div class="card" style="padding: 16px;">
          <h2 class="card-title">${b.name}</h2>
          <p class="card-desc mt-2">📍 ${b.address}</p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px;">🕒 ${b.hours}</p>
          <p style="font-size: 0.85rem; color: var(--text-muted);">📞 ${b.phone}</p>
          <div id="distance-${b.id}" style="margin-top: 10px; font-weight: 700; color: var(--color-accent); font-size: 0.9rem;"></div>
        </div>
      `).join('')}
    </div>
  `;

  const btnLocation = document.getElementById('btn-get-location');
  if (btnLocation) {
    btnLocation.addEventListener('click', () => {
      if (window.DeviceModule && typeof DeviceModule.calculateNearestBranches === 'function') {
        DeviceModule.calculateNearestBranches();
      } else {
        showToast('📍 Obteniendo coordenadas GPS...');
      }
    });
  }
}

// Vista: Reseñas Comunitarias
async function renderResenasView(container) {
  container.innerHTML = `
    <header class="mb-4">
      <h1 style="font-size: 1.6rem; font-weight: 800; color: var(--color-primary);">Reseñas de la Comunidad</h1>
      <p style="color: var(--text-secondary); font-size: 0.95rem;">
        Comparte tu opinión. Si estás fuera de línea, la reseña se guardará y se enviará en segundo plano (Background Sync).
      </p>
    </header>

    <!-- Formulario de Reseña -->
    <section class="card" style="padding: 20px; margin-bottom: 24px;">
      <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 12px;">Escribir una reseña</h2>
      <form id="form-review">
        <div class="form-group">
          <label class="form-label" for="review-coffee">Café:</label>
          <select id="review-coffee" class="form-control" required>
            ${AppState.products.map(p => `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="review-author">Tu Nombre:</label>
          <input type="text" id="review-author" class="form-control" placeholder="Ej. Ana Gómez" required maxlength="50">
        </div>

        <div class="form-group">
          <label class="form-label" for="review-rating">Calificación:</label>
          <select id="review-rating" class="form-control">
            <option value="5">⭐⭐⭐⭐⭐ (Excelente)</option>
            <option value="4">⭐⭐⭐⭐ (Muy bueno)</option>
            <option value="3">⭐⭐⭐ (Bueno)</option>
            <option value="2">⭐⭐ (Regular)</option>
            <option value="1">⭐ (Malo)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="review-comment">Tu experiencia:</label>
          <textarea id="review-comment" class="form-control" rows="3" placeholder="Describe el aroma, notas y sensación en boca..." required maxlength="300"></textarea>
        </div>

        <button type="submit" id="btn-submit-review" class="btn btn-primary btn-block">
          Publicar Reseña
        </button>
      </form>
    </section>

    <!-- Lista de Reseñas -->
    <section>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 1.2rem; font-weight: 700;">Últimas Reseñas</h2>
        <button id="btn-refresh-reviews" class="btn btn-sm btn-secondary">🔄 Actualizar</button>
      </div>
      <div id="reviews-container" class="reviews-list">
        <p class="text-muted">Cargando reseñas...</p>
      </div>
    </section>
  `;

  // Cargar reseñas en la vista
  loadReviewsList();

  // Evento submit de reseña
  const form = document.getElementById('form-review');
  if (form) {
    form.addEventListener('submit', handleReviewSubmit);
  }

  const refreshBtn = document.getElementById('btn-refresh-reviews');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadReviewsList);
  }
}

// Vista: Ajustes y Preferencias
function renderAjustesView(container) {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const storedUser = localStorage.getItem('cafe_user_name') || '';

  container.innerHTML = `
    <header class="mb-4">
      <h1 style="font-size: 1.6rem; font-weight: 800; color: var(--color-primary);">Ajustes de la PWA</h1>
      <p style="color: var(--text-secondary); font-size: 0.95rem;">Personaliza tu experiencia y gestiona las capacidades del dispositivo.</p>
    </header>

    <div style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Perfil / Nombre -->
      <section class="card" style="padding: 16px;">
        <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">👤 Perfil de Usuario</h2>
        <div class="form-group">
          <label class="form-label" for="settings-username">Nombre por defecto para reseñas:</label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="settings-username" class="form-control" value="${storedUser}" placeholder="Tu nombre">
            <button id="btn-save-username" class="btn btn-secondary">Guardar</button>
          </div>
        </div>
      </section>

      <!-- Apariencia -->
      <section class="card" style="padding: 16px;">
        <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">🎨 Apariencia</h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px;">Elige entre tema claro y tema oscuro (se guarda en localStorage).</p>
        <button id="btn-toggle-theme-settings" class="btn btn-secondary">
          ${currentTheme === 'dark' ? '☀️ Cambiar a Tema Claro' : '🌙 Cambiar a Tema Oscuro'}
        </button>
      </section>

      <!-- Notificaciones Push -->
      <section class="card" style="padding: 16px;">
        <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">🔔 Notificaciones Push</h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px;">
          Recibe avisos de promociones y confirmación de sincronización de reseñas en segundo plano.
        </p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-enable-push" class="btn btn-primary">Activar Notificaciones</button>
          <button id="btn-test-push" class="btn btn-secondary">Enviar Notificación de Prueba</button>
        </div>
      </section>

      <!-- Estado de Instalación -->
      <section class="card" style="padding: 16px;">
        <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">📲 Instalación en Dispositivo</h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px;">
          Instala Café Aroma como app de escritorio o móvil independiente.
        </p>
        <button id="btn-install-settings" class="btn btn-primary">Instalar Aplicación</button>
      </section>

      <!-- Datos Locales y Caché -->
      <section class="card" style="padding: 16px;">
        <h2 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">💾 Almacenamiento Local</h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 12px;">
          Gestiona los datos almacenados en IndexedDB y Caché Storage.
        </p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-clear-cache" class="btn btn-secondary">Limpiar Caché Temporal</button>
          <button id="btn-sync-now" class="btn btn-secondary">Sincronizar Reseñas Ahora</button>
        </div>
      </section>
    </div>
  `;

  // Asignar listeners de ajustes
  document.getElementById('btn-save-username')?.addEventListener('click', () => {
    const val = document.getElementById('settings-username')?.value.trim();
    if (val) {
      localStorage.setItem('cafe_user_name', val);
      showToast('✓ Nombre guardado en preferencias');
    }
  });

  document.getElementById('btn-toggle-theme-settings')?.addEventListener('click', toggleTheme);

  document.getElementById('btn-enable-push')?.addEventListener('click', () => {
    if (window.NotificationsManager) {
      NotificationsManager.subscribeUser();
    }
  });

  document.getElementById('btn-test-push')?.addEventListener('click', () => {
    if (window.NotificationsManager) {
      NotificationsManager.sendTestNotification();
    }
  });

  document.getElementById('btn-install-settings')?.addEventListener('click', triggerInstallPrompt);

  document.getElementById('btn-clear-cache')?.addEventListener('click', async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
      showToast('🗑️ Caché eliminada correctamente');
    }
  });

  document.getElementById('btn-sync-now')?.addEventListener('click', () => {
    if (window.syncPendingReviews) {
      syncPendingReviews();
    }
  });
}

// --------------------------------------------------------------------------
// Funciones de Reseñas y Sincronización (preparadas para Fase 8)
// --------------------------------------------------------------------------
async function loadReviewsList() {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  try {
    let serverReviews = [];
    try {
      const res = await fetch('/api/resenas');
      if (res.ok) {
        serverReviews = await res.json();
      }
    } catch (e) {
      console.log('[Reviews] Red no disponible para reseñas remotas');
    }

    // Obtener reseñas locales de IndexedDB si está disponible
    let localPending = [];
    if (window.CafeDB && typeof CafeDB.getPendingReviews === 'function') {
      localPending = await CafeDB.getPendingReviews();
    }

    // Combinar pendientes (arriba con badge) y confirmadas
    const allReviews = [
      ...localPending.map(r => ({ ...r, isLocalPending: true })),
      ...serverReviews
    ];

    if (allReviews.length === 0) {
      container.innerHTML = `<p class="text-muted">Aún no hay reseñas registradas. ¡Sé el primero!</p>`;
      return;
    }

    container.innerHTML = allReviews.map(r => `
      <div class="review-item">
        <div class="review-header">
          <span class="review-author">${r.author} <small class="text-muted">(${r.productName || 'Café'})</small></span>
          <span class="review-stars">${'⭐'.repeat(r.rating || 5)}</span>
        </div>
        <p class="review-comment">${r.comment}</p>
        ${r.isLocalPending ? `
          <div class="review-status">
            ⏳ Guardada localmente — Se sincronizará automáticamente al volver la conexión.
          </div>
        ` : `
          <div style="margin-top: 6px; font-size: 0.72rem; color: var(--text-muted);">
            ✓ Sincronizada con el servidor • ${new Date(r.date).toLocaleDateString()}
          </div>
        `}
      </div>
    `).join('');

    // Actualizar badge en la navegación
    const badge = document.getElementById('badge-pending-reviews');
    if (badge) {
      if (localPending.length > 0) {
        badge.textContent = localPending.length;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Error al listar reseñas:', err);
    container.innerHTML = `<p class="text-muted">No fue posible cargar las reseñas.</p>`;
  }
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  const coffeeSelect = document.getElementById('review-coffee');
  const authorInput = document.getElementById('review-author');
  const ratingSelect = document.getElementById('review-rating');
  const commentInput = document.getElementById('review-comment');

  const selectedOption = coffeeSelect.options[coffeeSelect.selectedIndex];
  const newReview = {
    id: `local-${Date.now()}`,
    productId: coffeeSelect.value,
    productName: selectedOption.getAttribute('data-name') || selectedOption.text,
    author: authorInput.value.trim(),
    rating: parseInt(ratingSelect.value, 10),
    comment: commentInput.value.trim(),
    date: new Date().toISOString()
  };

  // Feedback háptico de dispositivo si está disponible (Fase 11)
  if (window.DeviceModule && typeof DeviceModule.vibrate === 'function') {
    DeviceModule.vibrate(50);
  }

  // Guardar nombre de usuario en preferencias
  localStorage.setItem('cafe_user_name', newReview.author);

  // Intentar enviar directo a la red si estamos online
  if (navigator.onLine) {
    try {
      const res = await fetch('/api/resenas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview)
      });
      if (res.ok) {
        showToast('✓ Reseña publicada exitosamente');
        formReset(commentInput);
        loadReviewsList();
        return;
      }
    } catch (err) {
      console.warn('[Review] Falló envío online, guardando en cola offline:', err);
    }
  }

  // Guardar en cola IndexedDB para Background Sync (Fase 8)
  if (window.CafeDB && typeof CafeDB.savePendingReview === 'function') {
    await CafeDB.savePendingReview(newReview);
    showToast('💾 Reseña guardada localmente (se enviará en segundo plano)');

    // Solicitar sincronización en segundo plano al Service Worker si soporta SyncManager
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-reviews');
        console.log('[Sync] Tarea Background Sync "sync-reviews" registrada');
      } catch (syncErr) {
        console.warn('[Sync] No se pudo registrar Background Sync:', syncErr);
      }
    }
  } else {
    showToast('Reseña en cola local');
  }

  formReset(commentInput);
  loadReviewsList();
}

function formReset(commentInput) {
  if (commentInput) commentInput.value = '';
}

// --------------------------------------------------------------------------
// Favoritos y Preferencias
// --------------------------------------------------------------------------
function loadFavoritesFromStorage() {
  try {
    const raw = localStorage.getItem('cafe_favorites');
    if (raw) {
      AppState.favorites = new Set(JSON.parse(raw));
    }
  } catch (e) {
    AppState.favorites = new Set();
  }
}

function toggleFavorite(productId) {
  if (AppState.favorites.has(productId)) {
    AppState.favorites.delete(productId);
    showToast('🤍 Removido de favoritos');
  } else {
    AppState.favorites.add(productId);
    showToast('❤️ Añadido a favoritos');
    if (window.DeviceModule && typeof DeviceModule.vibrate === 'function') {
      DeviceModule.vibrate([30, 50, 30]);
    }
  }
  localStorage.setItem('cafe_favorites', JSON.stringify([...AppState.favorites]));
}

// --------------------------------------------------------------------------
// Tema Claro / Oscuro
// --------------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem('cafe_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  document.getElementById('btn-theme-toggle')?.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  if (next === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('cafe_theme', next);
  showToast(next === 'dark' ? '🌙 Modo Oscuro activado' : '☀️ Modo Claro activado');
}

// --------------------------------------------------------------------------
// Notificaciones Toast en Pantalla
// --------------------------------------------------------------------------
function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --------------------------------------------------------------------------
// Inicialización del Service Worker (Fase 3 & 9)
// --------------------------------------------------------------------------
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('[App] Service Worker registrado con éxito. Scope:', registration.scope);

        // Detectar si hay una actualización en espera (Fase 9)
        if (registration.waiting) {
          showUpdateBanner(registration.waiting);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner(newWorker);
            }
          });
        });

        // Recargar automáticamente cuando el nuevo SW tome el control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

      } catch (err) {
        console.error('[App] Fallo al registrar Service Worker:', err);
      }
    });
  }
}

function showUpdateBanner(worker) {
  const banner = document.getElementById('update-banner');
  const btn = document.getElementById('btn-update-app');
  if (banner && btn) {
    banner.classList.remove('hidden');
    btn.onclick = () => {
      worker.postMessage({ action: 'skipWaiting' });
    };
  }
}

// --------------------------------------------------------------------------
// Instalación PWA (A2HS) - Fase 5
// --------------------------------------------------------------------------
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    AppState.deferredInstallPrompt = e;
    console.log('[A2HS] Evento beforeinstallprompt capturado');

    const installBanner = document.getElementById('install-banner');
    if (installBanner) {
      installBanner.classList.remove('hidden');
    }
  });

  document.getElementById('btn-install-app')?.addEventListener('click', triggerInstallPrompt);
  document.getElementById('btn-dismiss-install')?.addEventListener('click', () => {
    document.getElementById('install-banner')?.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    console.log('[A2HS] Café Aroma PWA instalada satisfactoriamente');
    AppState.deferredInstallPrompt = null;
    document.getElementById('install-banner')?.classList.add('hidden');
    showToast('🎉 ¡Gracias por instalar Café Aroma!');
  });
}

function triggerInstallPrompt() {
  if (!AppState.deferredInstallPrompt) {
    showToast('ℹ️ La app ya está instalada o tu navegador no soporta instalación directa');
    return;
  }
  AppState.deferredInstallPrompt.prompt();
  AppState.deferredInstallPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('[A2HS] El usuario aceptó la instalación');
    } else {
      console.log('[A2HS] El usuario rechazó la instalación');
    }
    AppState.deferredInstallPrompt = null;
    document.getElementById('install-banner')?.classList.add('hidden');
  });
}

// --------------------------------------------------------------------------
// Monitor de Conexión Online / Offline (Fase 7)
// --------------------------------------------------------------------------
function setupNetworkMonitor() {
  function updateNetworkStatus() {
    const isOnline = navigator.onLine;
    const banner = document.getElementById('connection-status');
    const headerBadge = document.getElementById('header-network-indicator');
    const statusText = document.getElementById('status-text');

    if (headerBadge) {
      headerBadge.className = `network-badge ${isOnline ? 'online' : 'offline'}`;
      headerBadge.textContent = isOnline ? '● Online' : '○ Offline';
    }

    if (banner) {
      if (!isOnline) {
        banner.classList.remove('hidden');
        banner.classList.remove('online-recovered');
        if (statusText) statusText.textContent = 'Sin conexión a Internet - Modo offline activo';
      } else {
        // Mostrar mensaje verde de recuperación brevemente
        banner.classList.add('online-recovered');
        if (statusText) statusText.textContent = '¡Conexión restablecida! Sincronizando datos...';
        setTimeout(() => {
          banner.classList.add('hidden');
        }, 3500);

        // Sincronizar reseñas pendientes si volvimos a estar online
        if (typeof syncPendingReviews === 'function') {
          syncPendingReviews();
        }
      }
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
}

// --------------------------------------------------------------------------
// Hidratación de Ficha SSR (Fase 11.3)
// --------------------------------------------------------------------------
function checkAndHydrateSSR() {
  const ssrContainer = document.querySelector('[data-ssr-product]');
  if (!ssrContainer) return false;

  const ssrDataScript = document.getElementById('__SSR_PRODUCT_DATA__');
  if (ssrDataScript) {
    try {
      const product = JSON.parse(ssrDataScript.textContent);
      console.log('[SSR Hydration] Ficha detectada en el cliente para:', product.name);

      // Hidratar botón de compartir
      const shareBtn = document.getElementById('btn-share-ssr');
      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          if (window.DeviceModule && typeof DeviceModule.share === 'function') {
            DeviceModule.share({
              title: product.name,
              text: product.description,
              url: window.location.href
            });
          } else {
            showToast('📤 Enlace copiado');
          }
        });
      }

      // Hidratar botón de favoritos
      const favBtn = document.getElementById('btn-fav-ssr');
      if (favBtn) {
        const isFav = AppState.favorites.has(product.id);
        if (isFav) favBtn.textContent = '❤️ En Favoritos';

        favBtn.addEventListener('click', () => {
          toggleFavorite(product.id);
          const nowFav = AppState.favorites.has(product.id);
          favBtn.textContent = nowFav ? '❤️ En Favoritos' : '🤍 Guardar en Favoritos';
        });
      }

      return true; // Se hidrató SSR exitosamente
    } catch (err) {
      console.warn('[SSR Hydration] Error al hidratar:', err);
    }
  }
  return false;
}

// --------------------------------------------------------------------------
// Ciclo de Inicialización
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  console.log('☕ Inicializando Café Aroma App Shell...');

  loadFavoritesFromStorage();
  initTheme();
  setupNetworkMonitor();
  setupInstallPrompt();
  registerServiceWorker();

  // Si estamos en una página SSR pre-renderizada, hidratar
  const isSSR = checkAndHydrateSSR();
  if (!isSSR) {
    // Si es CSR normal, inicializar enrutador
    initRouter();
  }

  // Ocultar splash screen
  setTimeout(() => {
    const splash = document.getElementById('app-splash');
    if (splash) splash.classList.add('hidden');
  }, 500);
});
