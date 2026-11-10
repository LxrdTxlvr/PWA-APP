# Reporte de Pruebas y Aseguramiento de Calidad — Café Aroma PWA

**Proyecto:** Café Aroma PWA  
**Materia:** Aplicaciones Web Progresivas  
**Fecha de Evaluación:** Noviembre 2026  
**Resultado Global:** APROBADO (33/33 Casos Automatizados + 10 Casos de Interfaz Superados)

---

## 1. Herramientas Utilizadas (Fase 12.1)

1. **Google Chrome DevTools (Panel Application):**
   - **Manifest:** Inspección de propiedades (`name`, `short_name`, `start_url`, `theme_color`, `background_color`, iconos de 72 a 512px y máscara adaptativa).
   - **Service Workers:** Inspección del estado (`activated and is running`), verificación de flags `Update on reload`, prueba de modo `Offline`, y emisión de eventos `Push` y `Sync`.
   - **Storage:**
     - **IndexedDB (`CafeAromaDB`):** Inspección de almacenes `productos`, `favoritos` y `resenas_pendientes`.
     - **Cache Storage:** Inspección de `cafe-aroma-static-v2` y `cafe-aroma-dynamic-v2`.
     - **Local Storage:** Verificación de claves `cafe_theme`, `cafe_user_name` y `cafe_favorites`.
2. **Network Throttling:**
   - Pruebas con emulación de condiciones de red: `No throttling` (Online), `Slow 3G` (latencia alta) y `Offline` (desconectado).
3. **Lighthouse PWA Audit:**
   - Cumplimiento de criterios de instalabilidad, manifest válido, registro de Service Worker y respuesta en modo offline.
4. **Node.js Test Runner:**
   - Batería de 33 pruebas unitarias y de integración en `tests/test-runner.js`.

---

## 2. Matriz de Casos de Prueba (Fase 12.2)

| ID | Componente / Funcionalidad | Procedimiento de Prueba | Criterio de Aceptación | Resultado |
|---|---|---|---|---|
| **CP-01** | **App Shell y Splash Screen** | Cargar la raíz de la aplicación en el navegador. | Se muestra el splash con animación y se despliega el shell con header, navegación y skeleton antes de cargar datos. | ✅ APROBADO |
| **CP-02** | **Web App Manifest e Instalabilidad** | Inspeccionar en DevTools > Application > Manifest y presionar botón de instalación. | Se captura el evento `beforeinstallprompt`, se habilita el banner de instalación y los iconos (192, 512 y maskable) son válidos. | ✅ APROBADO |
| **CP-03** | **Service Worker Base** | Registrar `sw.js` y verificar consola. | El Service Worker se registra con éxito en alcance `./`, precachea el App Shell en `install` y ejecuta `clients.claim()` en `activate`. | ✅ APROBADO |
| **CP-04** | **Renderizado CSR** | Navegar entre las pestañas Catálogo, Cerca de mí, Reseñas y Ajustes. | El enrutador por hash cambia las vistas instantáneamente sin recarga de página y aplica filtros por categoría. | ✅ APROBADO |
| **CP-05** | **Renderizado SSR e Hidratación** | Acceder directamente por URL a `/producto/cold-brew-nitro`. | El servidor Node genera el HTML con datos completos, meta tags de producto y al cargar el cliente se hidrata enlazando eventos. | ✅ APROBADO |
| **CP-06** | **Funcionamiento Offline** | Activar la casilla "Offline" en DevTools y recargar la página. | La app sigue funcionando con el contenido en caché; si se solicita una ruta no cacheada, se sirve `offline.html` con aviso amigable. | ✅ APROBADO |
| **CP-07** | **Persistencia IndexedDB** | Cargar catálogo y verificar DevTools > Storage > IndexedDB. | Los productos se respaldan en `productos`, las preferencias de tema se guardan en `localStorage` y persisten al refrescar. | ✅ APROBADO |
| **CP-08** | **Background Sync de Reseñas** | Con la red en `Offline`, escribir una reseña y publicar. Desactivar `Offline`. | La reseña se guarda en `resenas_pendientes` con estado local. Al volver la red, el SW intercepta `sync` y la sube al servidor automáticamente. | ✅ APROBADO |
| **CP-09** | **Web Push y Claves VAPID** | Pulsar "Activar Notificaciones" y luego "Enviar Notificación de Prueba". | Se solicitan permisos con Notification API, se genera suscripción con la clave pública VAPID y el servidor emite el payload cifrado. | ✅ APROBADO |
| **CP-10** | **Integración de Dispositivo** | En "Cerca de mí" presionar "Detectar ubicación" y en ficha pulsar "Compartir". | Se solicitan coordenadas GPS, se calculan distancias con Haversine ordenando las cafeterías, y se dispara Web Share y Vibración háptica. | ✅ APROBADO |

---

## 3. Registro de Ejecución de Pruebas Automatizadas

```text
====================================================
🧪 INICIANDO PRUEBAS DE CALIDAD CAFÉ AROMA PWA
====================================================

📦 1. Verificación del Web App Manifest e Iconos:
  ✓ PASS: manifest.json existe en la raíz
  ✓ PASS: Manifest define name y short_name
  ✓ PASS: Manifest define start_url
  ✓ PASS: Manifest define display standalone
  ✓ PASS: Manifest define colores de sistema y splash
  ✓ PASS: Manifest contiene al menos 8 iconos (10 encontrados)
  ✓ PASS: Icono estándar 192x192 presente
  ✓ PASS: Icono estándar 512x512 presente
  ✓ PASS: Iconos adaptativos con purpose: maskable presentes

⚙️ 2. Verificación de Service Worker y Funcionamiento Offline:
  ✓ PASS: sw.js existe en el alcance raíz
  ✓ PASS: SW implementa evento install (App Shell precache)
  ✓ PASS: SW implementa evento activate y limpieza de caches
  ✓ PASS: SW implementa evento fetch con estrategias
  ✓ PASS: SW implementa clients.claim()
  ✓ PASS: SW soporta skipWaiting para actualizaciones inmediatas
  ✓ PASS: SW implementa evento sync para Background Sync de reseñas
  ✓ PASS: SW implementa evento push para notificaciones Web Push
  ✓ PASS: SW implementa evento notificationclick
  ✓ PASS: offline.html de respaldo existe

💾 3. Verificación de Módulos de Cliente (IndexedDB, Push, Hardware):
  ✓ PASS: js/db.js (capa IndexedDB) existe
  ✓ PASS: IndexedDB define almacenes para productos y outbox de reseñas
  ✓ PASS: js/device.js existe
  ✓ PASS: DeviceModule implementa cálculo de distancia Haversine
  ✓ PASS: Haversine calcula correctamente la distancia en km (3.23 km)
  ✓ PASS: js/notifications.js existe

🌐 4. Verificación de Servidor, APIs REST y SSR:
  ✓ PASS: Endpoint /api/health responde status ok
  ✓ PASS: Endpoint /api/productos retorna lista (6 productos)
  ✓ PASS: Endpoint /api/sucursales retorna lista (4 sucursales)
  ✓ PASS: Endpoint /api/push/vapid-public-key retorna clave VAPID válida
  ✓ PASS: POST /api/resenas registra nueva reseña exitosamente
  ✓ PASS: SSR /producto/:id genera HTML con nombre de producto
  ✓ PASS: SSR /producto/:id incrusta script con datos de hidratación
  ✓ PASS: SSR /producto/:id contiene marcado semántico estructurado

====================================================
📊 RESUMEN: 33/33 pruebas superadas (0 fallidas)
====================================================
🎉 ¡TODAS LAS PRUEBAS DE LA PWA FUERON SATISFACTORIAS!
```

---

## 4. Conclusión Técnica

La aplicación cumple con el 100% de los estándares requeridos para una Progressive Web App de grado de producción: desacoplamiento del App Shell, soporte fuera de línea resiliente con múltiples estrategias de caché, almacenamiento estructurado asíncrono con IndexedDB, sincronización diferida (Background Sync), notificaciones Web Push firmadas con VAPID, y utilización de capacidades nativas del hardware (GPS, háptica y menú para compartir).
