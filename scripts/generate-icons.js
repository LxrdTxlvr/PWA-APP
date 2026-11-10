const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const iconsDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Función para dibujar un icono de café estilizado
function generateIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = isMaskable ? size * 0.48 : size * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Fondo base (Gradiente circular café)
      if (isMaskable) {
        // En maskable llenamos todo el canvas con un margen seguro
        const grad = (y / size);
        const r = Math.round(74 + grad * 30);
        const g = Math.round(44 + grad * 20);
        const b = Math.round(17 + grad * 15);
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      } else if (dist <= radius) {
        // Círculo suave
        const grad = (y / size);
        const r = Math.round(92 + grad * 40);
        const g = Math.round(58 + grad * 25);
        const b = Math.round(33 + grad * 20);
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      } else {
        // Transparente fuera del círculo
        png.data[idx + 3] = 0;
        continue;
      }

      // Dibujar taza de café estilizada
      // Proporciones relativas al tamaño
      const cupWidth = size * 0.42;
      const cupHeight = size * 0.32;
      const cupTop = center - (size * 0.08);
      const cupBottom = cupTop + cupHeight;
      const cupLeft = center - cupWidth / 2;
      const cupRight = center + cupWidth / 2;

      // Cuerpo de la taza
      if (y >= cupTop && y <= cupBottom) {
        const rowT = (y - cupTop) / cupHeight;
        const currentHalfWidth = (cupWidth / 2) * (1 - rowT * 0.22); // Se estrecha hacia abajo
        if (Math.abs(x - center) <= currentHalfWidth) {
          // Borde inferior redondeado
          if (y > cupBottom - (size * 0.05)) {
            const cornerDy = y - (cupBottom - (size * 0.05));
            const cornerDx = Math.abs(x - center) - (currentHalfWidth - (size * 0.05));
            if (cornerDx > 0 && (cornerDx * cornerDx + cornerDy * cornerDy > (size * 0.05) * (size * 0.05))) {
              // fuera del radio de esquina
            } else {
              setWhite(png.data, idx);
            }
          } else {
            setWhite(png.data, idx);
          }
        }
      }

      // Asa de la taza
      const handleCenterX = center + cupWidth * 0.45;
      const handleCenterY = cupTop + cupHeight * 0.4;
      const handleOuterR = size * 0.12;
      const handleInnerR = size * 0.06;
      const hdx = x - handleCenterX;
      const hdy = y - handleCenterY;
      const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
      if (hdist <= handleOuterR && hdist >= handleInnerR && x >= center + cupWidth * 0.35) {
        setWhite(png.data, idx);
      }

      // Plato de la taza
      const saucerTop = cupBottom + (size * 0.04);
      const saucerBottom = saucerTop + (size * 0.04);
      const saucerWidth = size * 0.54;
      if (y >= saucerTop && y <= saucerBottom) {
        if (Math.abs(x - center) <= saucerWidth / 2) {
          setWhite(png.data, idx);
        }
      }

      // Vapor ondulado sobre la taza
      const steamY = cupTop - (size * 0.08);
      if (y <= steamY && y >= steamY - (size * 0.14)) {
        const wave1 = Math.sin((y - steamY) * 0.25) * (size * 0.04);
        const wave2 = Math.cos((y - steamY) * 0.25) * (size * 0.04);
        const distToSteam1 = Math.abs(x - (center - size * 0.08 + wave1));
        const distToSteam2 = Math.abs(x - (center + size * 0.08 + wave2));
        if (distToSteam1 < (size * 0.02) || distToSteam2 < (size * 0.02)) {
          setWhite(png.data, idx, 220);
        }
      }
    }
  }

  return png;
}

function setWhite(data, idx, alpha = 255) {
  data[idx] = 255;
  data[idx + 1] = 255;
  data[idx + 2] = 255;
  data[idx + 3] = alpha;
}

const sizes = [72, 96, 128, 144, 192, 256, 384, 512];

sizes.forEach(size => {
  const icon = generateIcon(size, false);
  const outPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  icon.pack().pipe(fs.createWriteStream(outPath));
  console.log(`✓ Generado icon-${size}x${size}.png`);
});

// Generar variantes maskable requeridas por PWA
[192, 512].forEach(size => {
  const maskable = generateIcon(size, true);
  const outPath = path.join(iconsDir, `icon-maskable-${size}x${size}.png`);
  maskable.pack().pipe(fs.createWriteStream(outPath));
  console.log(`✓ Generado icon-maskable-${size}x${size}.png`);
});

// Guardar favicon
const favicon = generateIcon(64, false);
favicon.pack().pipe(fs.createWriteStream(path.join(iconsDir, 'favicon.png')));
console.log('✓ Generado favicon.png');
