// ==========================================================================
// Café Aroma PWA - Módulo de Integración con el Dispositivo (Fase 11)
// APIs: Geolocation, Haversine, Vibration, Web Share, Network Info
// ==========================================================================

const DeviceModule = {
  // 11.1.1 Fórmula de Haversine para cálculo de distancia esférica en km
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio medio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    return parseFloat(distanceKm.toFixed(2));
  },

  // 11.1.2 Obtener la posición actual del usuario mediante GPS
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('La geolocalización no está soportada en tu navegador'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          let message = 'Error al obtener ubicación';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permiso de ubicación denegado por el usuario';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'La señal GPS o información de ubicación no está disponible';
              break;
            case error.TIMEOUT:
              message = 'Tiempo de espera agotado al consultar la ubicación';
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  },

  // 11.2 Vista «Cerca de mí»: Calcular distancias a las sucursales y ordenar
  async calculateNearestBranches() {
    const statusBtn = document.getElementById('btn-get-location');
    if (statusBtn) {
      statusBtn.textContent = '⏳ Localizando mediante GPS...';
      statusBtn.disabled = true;
    }

    try {
      showToast('📍 Solicitando permiso de GPS...');
      const userCoords = await this.getCurrentPosition();
      this.vibrate(40);
      showToast(`✓ Coordenadas obtenidas (${userCoords.latitude.toFixed(3)}, ${userCoords.longitude.toFixed(3)})`);

      if (!AppState.branches || AppState.branches.length === 0) {
        await fetchBranchesData();
      }

      // Calcular la distancia a cada cafetería
      const branchesWithDistance = AppState.branches.map((b) => {
        const dist = this.haversineDistance(
          userCoords.latitude,
          userCoords.longitude,
          b.lat,
          b.lng
        );
        return { ...b, distance: dist };
      });

      // Ordenar por distancia ascendente
      branchesWithDistance.sort((a, b) => a.distance - b.distance);

      // Renderizar la lista actualizada de sucursales ordenadas
      const container = document.getElementById('branches-list');
      if (container) {
        container.innerHTML = branchesWithDistance.map((b, idx) => {
          const isClosest = idx === 0;
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + ' ' + b.address)}`;

          return `
            <div class="card" style="padding: 18px; border: ${isClosest ? '2px solid var(--color-accent)' : '1px solid var(--border-color)'};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h2 class="card-title">${b.name}</h2>
                ${isClosest ? '<span class="tag" style="background: var(--color-accent); color: #fff;">📍 Más Cercana</span>' : ''}
              </div>
              <p class="card-desc mt-2">📍 ${b.address}</p>
              <div style="margin: 10px 0; padding: 8px 12px; background: var(--color-accent-light); border-radius: var(--radius-sm); font-weight: 700; color: var(--color-primary); font-size: 0.95rem;">
                📏 Distancia: ${b.distance} km de ti
              </div>
              <p style="font-size: 0.85rem; color: var(--text-muted);">🕒 ${b.hours}</p>
              <p style="font-size: 0.85rem; color: var(--text-muted);">📞 ${b.phone}</p>
              <div style="margin-top: 14px; display: flex; gap: 8px;">
                <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="flex: 1;">
                  🗺️ Cómo llegar en Google Maps
                </a>
              </div>
            </div>
          `;
        }).join('');
      }

    } catch (err) {
      console.warn('[Device] Error de geolocalización:', err.message);
      showToast(`⚠️ ${err.message}`);
    } finally {
      if (statusBtn) {
        statusBtn.textContent = '📍 Volver a detectar ubicación';
        statusBtn.disabled = false;
      }
    }
  },

  // 11.1.3 Vibración Háptica en el dispositivo
  vibrate(pattern = 50) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Ignorar si el navegador bloquea la vibración sin gesto previo
      }
    }
  },

  // 11.1.4 Compartir nativo con Web Share API (y fallback a portapapeles)
  async share(data) {
    this.vibrate(30);
    if (navigator.share) {
      try {
        await navigator.share(data);
        console.log('[Device] Compartido exitosamente');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('[Device] Error al compartir:', err);
        }
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${data.title}: ${data.url || window.location.href}`);
        showToast('📋 Enlace copiado al portapapeles');
      } catch (clipErr) {
        showToast('No se pudo copiar el enlace');
      }
    } else {
      showToast('⚠️ Tu dispositivo no soporta compartir nativo');
    }
  }
};

if (typeof window !== 'undefined') {
  window.DeviceModule = DeviceModule;
}
if (typeof module !== 'undefined') {
  module.exports = DeviceModule;
}
