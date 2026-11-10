// ==========================================================================
// Café Aroma PWA - Capa de Persistencia Local (IndexedDB)
// ==========================================================================

const DB_NAME = 'CafeAromaDB';
const DB_VERSION = 1;

const STORES = {
  PRODUCTS: 'productos',
  FAVORITES: 'favoritos',
  PENDING_REVIEWS: 'resenas_pendientes'
};

class CafeDatabase {
  constructor() {
    this.db = null;
    this.initPromise = this.openDB();
  }

  // Abrir o crear la base de datos IndexedDB
  openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.warn('[IndexedDB] Este navegador no soporta IndexedDB.');
        return resolve(null);
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[IndexedDB] Inicializando almacenes de objetos (versión', DB_VERSION, ')');

        // 1. Almacén para respaldo local del catálogo
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
          productStore.createIndex('category', 'category', { unique: false });
        }

        // 2. Almacén para favoritos del usuario
        if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
          db.createObjectStore(STORES.FAVORITES, { keyPath: 'id' });
        }

        // 3. Almacén para cola de salida de reseñas offline (Outbox)
        if (!db.objectStoreNames.contains(STORES.PENDING_REVIEWS)) {
          const reviewStore = db.createObjectStore(STORES.PENDING_REVIEWS, { keyPath: 'id' });
          reviewStore.createIndex('date', 'date', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[IndexedDB] Base de datos conectada:', DB_NAME);
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Error al abrir base de datos:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async getDB() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  // ------------------------------------------------------------------------
  // 6.3 Respaldo Local del Catálogo (Productos)
  // ------------------------------------------------------------------------
  async saveProducts(products) {
    const db = await this.getDB();
    if (!db) return false;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.PRODUCTS], 'readwrite');
      const store = transaction.objectStore(STORES.PRODUCTS);

      // Limpiar y guardar productos actualizados
      store.clear();
      products.forEach((product) => {
        store.put(product);
      });

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] ${products.length} productos respaldados localmente.`);
        resolve(true);
      };

      transaction.onerror = (e) => {
        console.error('[IndexedDB] Error al respaldar productos:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async getProducts() {
    const db = await this.getDB();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.PRODUCTS], 'readonly');
      const store = transaction.objectStore(STORES.PRODUCTS);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (e) => {
        console.error('[IndexedDB] Error al leer productos:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  // ------------------------------------------------------------------------
  // Cola de Reseñas Offline (Outbox para Background Sync)
  // ------------------------------------------------------------------------
  async savePendingReview(review) {
    const db = await this.getDB();
    if (!db) return false;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.PENDING_REVIEWS], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_REVIEWS);
      const request = store.put(review);

      request.onsuccess = () => {
        console.log('[IndexedDB] Reseña encolada en Outbox:', review.id);
        resolve(true);
      };

      request.onerror = (e) => {
        console.error('[IndexedDB] Error al guardar reseña en cola:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async getPendingReviews() {
    const db = await this.getDB();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.PENDING_REVIEWS], 'readonly');
      const store = transaction.objectStore(STORES.PENDING_REVIEWS);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (e) => {
        console.error('[IndexedDB] Error al leer cola de reseñas:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async deletePendingReview(id) {
    const db = await this.getDB();
    if (!db) return false;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.PENDING_REVIEWS], 'readwrite');
      const store = transaction.objectStore(STORES.PENDING_REVIEWS);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[IndexedDB] Reseña sincronizada eliminada de la cola:', id);
        resolve(true);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }
}

// Instancia global en el cliente y en el Service Worker si se importa
const CafeDB = new CafeDatabase();
if (typeof window !== 'undefined') {
  window.CafeDB = CafeDB;
}
if (typeof self !== 'undefined') {
  self.CafeDB = CafeDB;
}
