# Café Aroma - Progressive Web App (PWA)

Aplicación Web Progresiva completa para una cafetería de especialidad y comunidad de amantes del café, construida paso a paso aplicando todos los pilares de una PWA moderna.

## 🚀 Características
- **App Shell**: Carga instantánea de la interfaz base.
- **Web App Manifest**: Instalable como app nativa en Android, iOS, Windows y macOS con iconos adaptativos y pantalla de inicio.
- **Service Worker**: Control del ciclo de vida (`install`, `activate`, `fetch`), actualización fluida (`skipWaiting`, `clients.claim`).
- **Offline & Estrategias de Caché**: Cache-First (estáticos), Network-First (páginas/SSR con fallback a `offline.html`), Stale-While-Revalidate (catálogo).
- **Almacenamiento Local**: IndexedDB para catálogo y cola de reseñas fuera de línea; `localStorage` para preferencias y tema visual.
- **Background Sync**: Envío diferido de reseñas cuando se recupera la conexión.
- **Notificaciones Push**: Integración con Web Push y claves VAPID para alertas y promociones.
- **APIs de Hardware**: Geolocalización (sucursales más cercanas con cálculo de distancia Haversine), Web Share API y Vibración háptica.
- **Renderizado Híbrido**: CSR (enrutamiento dinámico en cliente) y SSR (fichas generadas en el servidor hidratadas en el cliente).

## 📋 Estructura de Fases
- **Fase 0**: Entorno de desarrollo y repositorio
- **Fase 1**: App shell (HTML y CSS)
- **Fase 2**: Manifiesto e íconos
- **Fase 3**: Service Worker básico
- **Fase 4**: Renderizado CSR y SSR
- **Fase 5**: Pantallas de Splash y Home con botón de instalación
- **Fase 6**: Datos locales (localStorage e IndexedDB)
- **Fase 7**: Estrategias de caché y funcionamiento offline
- **Fase 8**: Reseñas sin conexión y Background Sync
- **Fase 9**: Ciclo de vida y actualización del Service Worker
- **Fase 10**: Notificaciones locales y push con VAPID
- **Fase 11**: Elementos físicos del dispositivo e hidratación SSR
- **Fase 12**: Pruebas con herramientas de software
- **Fase 13**: Publicación y despliegue

## 💻 Ejecución local
```bash
npm install
npm start
```
Abre tu navegador en `http://localhost:3000`.
