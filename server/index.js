const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(path.join(__dirname, '..'), {
  // Asegurar que el Service Worker no sea cacheado agresivamente por el navegador
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Endpoint de verificación de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Café Aroma PWA',
    timestamp: new Date().toISOString()
  });
});

// En caso de que no coincida con un archivo estático, servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Iniciar servidor solo si no está en modo test
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`☕ Servidor Café Aroma PWA ejecutándose en http://localhost:${PORT}`);
  });
}

module.exports = app;
