// ==========================================================================
// Café Aroma PWA - Módulo de Notificaciones Push y Locales (Fase 10)
// ==========================================================================

// Utilidad para convertir la clave pública VAPID de Base64 a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationsManager = {
  // 10.4 Solicitar permiso y suscribirse al servicio Push
  async subscribeUser() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('⚠️ Las notificaciones Push no están soportadas en este navegador');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('❌ Permiso de notificaciones denegado por el usuario');
        return false;
      }

      showToast('🔔 Permiso concedido. Obteniendo suscripción...');
      const registration = await navigator.serviceWorker.ready;

      // Obtener clave pública VAPID del servidor
      let vapidPublicKey = null;
      try {
        const keyRes = await fetch('/api/push/vapid-public-key');
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          vapidPublicKey = keyData.publicKey;
        }
      } catch (e) {
        console.warn('[Push] No se pudo obtener la clave VAPID remota (posible modo estático)');
      }

      if (!vapidPublicKey) {
        // En GitHub Pages o modo puramente estático, mostramos notificación local de bienvenida
        await this.showLocalNotification('☕ Café Aroma - Notificaciones Activas', {
          body: '¡Listo! Recibirás nuestras novedades y confirmaciones de sincronización.',
          icon: './icons/icon-192x192.png'
        });
        showToast('✓ Notificaciones locales activadas');
        return true;
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
      }

      // Enviar la suscripción al servidor para su almacenamiento
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      if (res.ok) {
        showToast('🎉 ¡Suscrito exitosamente a las notificaciones Push!');
        console.log('[Push] Suscripción registrada en el servidor:', subscription);
        return true;
      } else {
        showToast('⚠️ Suscripción local lista, pero el servidor no respondió');
        return true;
      }

    } catch (error) {
      console.error('[Push] Error al suscribirse a notificaciones:', error);
      showToast('Error al configurar notificaciones');
      return false;
    }
  },

  // Enviar notificación de prueba desde el servidor hacia este y otros clientes
  async sendTestNotification() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      showToast('⚠️ Primero debes activar las notificaciones');
      return;
    }

    try {
      showToast('🚀 Solicitando envío de notificación push...');
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '☕ Café Aroma - Notificación Push',
          body: '¡Prueba exitosa! Esta notificación fue enviada mediante Web Push VAPID.',
          url: './index.html#/catalogo'
        })
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[Push] Respuesta del servidor:', data);
        showToast('✓ Notificación enviada desde el servidor');
      } else {
        // Fallback local si el endpoint no está disponible (ej. GitHub Pages estático)
        await this.showLocalNotification('☕ Café Aroma - Notificación de Prueba', {
          body: 'Notificación de prueba ejecutada en el dispositivo.',
          icon: './icons/icon-192x192.png'
        });
        showToast('✓ Notificación de prueba mostrada');
      }
    } catch (e) {
      // Fallback local en caso de error de red
      await this.showLocalNotification('☕ Café Aroma - Notificación Local', {
        body: 'Notificación generada localmente.',
        icon: './icons/icon-192x192.png'
      });
      showToast('✓ Notificación local disparada');
    }
  },

  // Disparar una notificación local a través del Service Worker
  async showLocalNotification(title, options = {}) {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      return reg.showNotification(title, {
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        ...options
      });
    }
  }
};

window.NotificationsManager = NotificationsManager;
