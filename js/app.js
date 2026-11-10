// ==========================================================================
// Café Aroma PWA - Lógica Principal de Cliente (App Shell)
// ==========================================================================

// 3.1 Registro del Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
          console.log('[App] Service Worker registrado exitosamente con alcance:', registration.scope);
        })
        .catch((error) => {
          console.error('[App] Error al registrar el Service Worker:', error);
        });
    });
  } else {
    console.warn('[App] Service Worker no es soportado en este navegador');
  }
}

// Inicialización base
document.addEventListener('DOMContentLoaded', () => {
  console.log('☕ Aplicación Café Aroma iniciada');
  registerServiceWorker();

  // Ocultar el splash screen después de cargar la interfaz inicial
  setTimeout(() => {
    const splash = document.getElementById('app-splash');
    if (splash) {
      splash.classList.add('hidden');
    }
  }, 600);
});
