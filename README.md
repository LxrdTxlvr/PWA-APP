# ☕ Café Aroma - Progressive Web App (PWA)

Aplicación Web Progresiva completa para una cafetería de especialidad y comunidad de amantes del café, construida paso a paso aplicando todos los pilares fundamentales de las PWA modernas.

🔗 **Repositorio GitHub:** [https://github.com/LxrdTxlvr/PWA-APP](https://github.com/LxrdTxlvr/PWA-APP)  
🌐 **Aplicación Publicada en GitHub Pages:** [https://lxrdtxlvr.github.io/PWA-APP/](https://lxrdtxlvr.github.io/PWA-APP/)  

---

## 🚀 Características Principales

- **App Shell Architecture:** Carga instantánea de la interfaz estructural (encabezado, navegación inferior y contenedores con skeleton screens).
- **Web App Manifest & A2HS:** Totalmente instalable en Android, iOS, Windows y macOS con iconos adaptativos (`any` y `maskable`) y accesos directos (shortcuts).
- **Splash Screens:** Splash de sistema configurado mediante el manifest y splash interno en la app con animación de bienvenida.
- **Service Worker Avanzado:**
  - Control de ciclo de vida con eventos `install`, `activate` y `fetch`.
  - Estrategias de caché:
    - **Cache-First:** Activos estáticos inmutables (CSS, JS, iconos, imágenes).
    - **Network-First con fallback:** Páginas HTML, rutas de navegación y fallback a `offline.html`.
    - **Stale-While-Revalidate:** Datos dinámicos del catálogo de productos.
  - Actualización fluida con `skipWaiting()`, `clients.claim()` y banner de aviso de nueva versión.
- **Persistencia Local:**
  - **IndexedDB (`CafeAromaDB`):** Almacenes para catálogo de cafés (`productos`), favoritos (`favoritos`) y cola de reseñas pendientes (`resenas_pendientes`).
  - **localStorage:** Preferencias de usuario (tema claro/oscuro y nombre de autor).
- **Background Sync:** Registro y sincronización diferida de reseñas en segundo plano (`sync-reviews`) con notificación al usuario al restablecer conexión.
- **Notificaciones Web Push:** Integración completa con el estándar Web Push mediante claves VAPID y soporte para notificaciones locales.
- **APIs Físicas del Dispositivo:**
  - **Geolocalización:** Cálculo de distancia esférica precisa mediante la **fórmula de Haversine** para ordenar las cafeterías más cercanas.
  - **Vibración háptica:** Feedback táctil al guardar favoritos, publicar reseñas y navegar.
  - **Web Share API:** Compartir fichas de café con el menú nativo del sistema.
- **Renderizado Híbrido:**
  - **CSR (Client-Side Rendering):** Enrutador SPA ligero por hash (`#/catalogo`, `#/producto/:id`, `#/cerca`, `#/resenas`, `#/ajustes`).
  - **SSR (Server-Side Rendering):** Ficha generada en el servidor en `/producto/:id` para SEO e indexación con hidratación en el cliente.

---

## 📁 Estructura del Proyecto

```text
PWA-APP/
├── index.html               # Shell principal de la PWA
├── offline.html             # Página de respaldo en modo sin conexión
├── manifest.json            # Web App Manifest con metadatos e iconos
├── sw.js                    # Service Worker con estrategias de caché y eventos sync/push
├── package.json             # Dependencias y scripts de ejecución
├── TESTING_REPORT.md        # Reporte de pruebas y aseguramiento de calidad
├── css/
│   └── styles.css           # Estilos responsivos con tema claro/oscuro
├── js/
│   ├── app.js               # Enrutador CSR, hidratación SSR y controlador del shell
│   ├── db.js                # Capa de almacenamiento local con IndexedDB
│   ├── device.js            # Módulo de hardware (GPS, Haversine, vibración, share)
│   └── notifications.js     # Gestor de suscripciones Web Push y notificaciones
├── data/                    # Datos estáticos para fallback en GitHub Pages
│   ├── products.json
│   └── branches.json
├── icons/                   # Iconos generados de 72px a 512px y maskable
├── server/                  # Servidor Node.js para SSR, APIs y Web Push
│   ├── index.js             # Servidor Express con endpoints y renderizado SSR
│   ├── vapid.json           # Claves pública y privada VAPID para Web Push
│   └── data/                # Almacén de productos, sucursales, reseñas y suscripciones
├── scripts/
│   └── generate-icons.js    # Generador automatizado de iconos PNG para PWA
└── tests/
    └── test-runner.js       # Batería automatizada de 33 pruebas de calidad
```

---

## 🛠️ Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor:**
   ```bash
   npm start
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

3. **Ejecutar pruebas automatizadas:**
   ```bash
   npm test
   ```

---

## 🌐 Publicación en GitHub Pages (Fase 13)

### 13.1 Activación en GitHub
1. Ingresa a tu repositorio en GitHub: [https://github.com/LxrdTxlvr/PWA-APP](https://github.com/LxrdTxlvr/PWA-APP).
2. Ve a la pestaña **Settings** > **Pages** (en el menú lateral izquierdo).
3. En **Build and deployment** > **Source**, selecciona: `Deploy from a branch`.
4. En **Branch**, selecciona `main` y en la carpeta elige `/(root)`.
5. Haz clic en **Save**.
6. En un par de minutos, GitHub Pages publicará el sitio en:  
   👉 **[https://lxrdtxlvr.github.io/PWA-APP/](https://lxrdtxlvr.github.io/PWA-APP/)**

### 13.2 Qué funciona en GitHub Pages vs Servidor Node.js

| Funcionalidad | GitHub Pages (Estático) | Servidor Node.js (`npm start`) |
|---|:---:|:---:|
| Instalación PWA (A2HS) | ✅ Soportado | ✅ Soportado |
| Funcionamiento Offline y Caché | ✅ Soportado | ✅ Soportado |
| Página `offline.html` | ✅ Soportado | ✅ Soportado |
| Catálogo y Navegación CSR | ✅ Soportado (`./data/products.json`) | ✅ Soportado (`/api/productos`) |
| Sucursales y GPS con Haversine | ✅ Soportado | ✅ Soportado |
| IndexedDB y localStorage | ✅ Soportado | ✅ Soportado |
| Vibración y Web Share API | ✅ Soportado | ✅ Soportado |
| Notificaciones locales en dispositivo | ✅ Soportado | ✅ Soportado |
| Cola de reseñas fuera de línea | ✅ Soportado (IndexedDB Outbox) | ✅ Soportado (IndexedDB Outbox) |
| Servidor SSR (`/producto/:id`) | ⚠️ Requiere backend | ✅ Generación dinámica en servidor |
| Envío de Push remoto cifrado VAPID | ⚠️ Requiere backend | ✅ Soporte total con `web-push` |

### 13.3 Publicar una Actualización (Fase 13.4)

Cuando desees publicar una nueva versión de la app:
1. Realiza los cambios necesarios en tu código.
2. Abre `sw.js` e incrementa la constante de versión:
   ```javascript
   const CACHE_VERSION = 'v3'; // Incrementar versión
   ```
3. Guarda y realiza el commit y push:
   ```bash
   git add .
   git commit -m "Publicar actualizacion v3"
   git push origin main
   ```
4. El Service Worker de los clientes detectará el cambio automáticamente, mostrará el banner flotante *"✨ Hay una nueva versión disponible. [Actualizar]"* y, al pulsar el botón, aplicará `skipWaiting()` y se actualizará instantáneamente.
