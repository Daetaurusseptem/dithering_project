# 🎨 Iconos y Branding

## 📁 Archivos de Iconos

```
public/
├── icon.svg           # ✅ Vector principal (editable)
├── icon-512.png       # Para PWA, Electron
├── icon-256.png       # Para Windows instaladores
├── icon-192.png       # Para Android, iOS, PWA
├── icon-128.png       # Para extensiones
├── icon-96.png        # Para favicons HD
├── icon-48.png        # Para toolbars
├── icon-32.png        # Para favicon estándar
├── icon-16.png        # Para favicon pequeño
└── manifest.json      # ✅ Configuración PWA
```

## 🎯 Estado Actual

✅ **SVG Master creado** → `public/icon.svg`
✅ **Manifest PWA generado** → `public/manifest.json`
✅ **HTML actualizado** con meta tags e iconos
⏳ **PNGs pendientes** (necesitas generarlos manualmente)

## 🖼️ Diseño del Icono

Tu icono tiene un estilo **retro Win98** con:

- 🟣 **Borde magenta** (#ff00ff) - Estilo ventana clásica
- ⬛ **Fondo oscuro** (#11001c) - Contraste retro
- 🎨 **Logo dithering** - Cuadro sólido + patrón dithering
- 💚 **Píxel verde** (#00ff00) - Acento neón

### Colores del Brand

```css
--primary: #ff00ff     /* Magenta neón */
--background: #11001c  /* Negro púrpura */
--accent: #00ff00      /* Verde neón */
--dither: checkerboard /* Patrón característico */
```

## 🛠️ Generar Iconos PNG

### Opción 1: Online (Más Rápido) ⚡

1. Ve a: https://svgtopng.com/
2. Sube `public/icon.svg`
3. Descarga estos tamaños:
   - 512x512 → `icon-512.png`
   - 256x256 → `icon-256.png`
   - 192x192 → `icon-192.png`
   - 128x128 → `icon-128.png`
   - 96x96 → `icon-96.png`
   - 48x48 → `icon-48.png`
   - 32x32 → `icon-32.png`
   - 16x16 → `icon-16.png`
4. Guarda todos en `public/`

### Opción 2: Inkscape (Local) 🖥️

```bash
# Instalar Inkscape: https://inkscape.org/

# Generar todos los tamaños
inkscape --export-type=png --export-width=512 --export-filename=public/icon-512.png public/icon.svg
inkscape --export-type=png --export-width=256 --export-filename=public/icon-256.png public/icon.svg
inkscape --export-type=png --export-width=192 --export-filename=public/icon-192.png public/icon.svg
inkscape --export-type=png --export-width=128 --export-filename=public/icon-128.png public/icon.svg
inkscape --export-type=png --export-width=96 --export-filename=public/icon-96.png public/icon.svg
inkscape --export-type=png --export-width=48 --export-filename=public/icon-48.png public/icon.svg
inkscape --export-type=png --export-width=32 --export-filename=public/icon-32.png public/icon.svg
inkscape --export-type=png --export-width=16 --export-filename=public/icon-16.png public/icon.svg
```

### Opción 3: ImageMagick 🪄

```bash
# Instalar ImageMagick: https://imagemagick.org/

magick public/icon.svg -resize 512x512 public/icon-512.png
magick public/icon.svg -resize 256x256 public/icon-256.png
magick public/icon.svg -resize 192x192 public/icon-192.png
magick public/icon.svg -resize 128x128 public/icon-128.png
magick public/icon.svg -resize 96x96 public/icon-96.png
magick public/icon.svg -resize 48x48 public/icon-48.png
magick public/icon.svg -resize 32x32 public/icon-32.png
magick public/icon.svg -resize 16x16 public/icon-16.png
```

### Opción 4: Script Batch Windows 🪟

Crea `scripts/generate-icons-inkscape.bat`:

```batch
@echo off
echo 🎨 Generando iconos con Inkscape...
echo.

set SVG=public\icon.svg

inkscape --export-type=png --export-width=512 --export-filename=public\icon-512.png %SVG%
inkscape --export-type=png --export-width=256 --export-filename=public\icon-256.png %SVG%
inkscape --export-type=png --export-width=192 --export-filename=public\icon-192.png %SVG%
inkscape --export-type=png --export-width=128 --export-filename=public\icon-128.png %SVG%
inkscape --export-type=png --export-width=96 --export-filename=public\icon-96.png %SVG%
inkscape --export-type=png --export-width=48 --export-filename=public\icon-48.png %SVG%
inkscape --export-type=png --export-width=32 --export-filename=public\icon-32.png %SVG%
inkscape --export-type=png --export-width=16 --export-filename=public\icon-16.png %SVG%

echo.
echo ✅ Iconos generados en public/
pause
```

## ✏️ Editar el Icono

Para cambiar el diseño, edita `public/icon.svg`:

### Cambiar Colores

```svg
<!-- Borde (actualmente magenta) -->
<path fill="#ff00ff" .../>  ← Cambiar aquí

<!-- Fondo (actualmente negro púrpura) -->
<path fill="#11001c" .../>  ← Cambiar aquí

<!-- Patrón dithering -->
<rect fill="#ff00ff"/>      ← Cambiar aquí

<!-- Píxel acento -->
<rect fill="#00ff00"/>      ← Cambiar aquí
```

### Después de Editar

1. Guarda `icon.svg`
2. Regenera los PNGs con cualquiera de las opciones arriba
3. Recarga el navegador: `Ctrl+F5`

## 📱 Uso en Plataformas

### PWA (Progressive Web App)

✅ Ya configurado en `manifest.json` y `index.html`

Para probar:
```bash
bun start
# Abre Chrome DevTools → Application → Manifest
```

### Electron

En `package.json` build config:

```json
{
  "build": {
    "win": {
      "icon": "public/icon-512.png"
    },
    "mac": {
      "icon": "public/icon-512.png"
    },
    "linux": {
      "icon": "public/icon-512.png"
    }
  }
}
```

### Android (Ionic/Capacitor)

Copiar a `android/app/src/main/res/`:

```bash
cp public/icon-192.png android/app/src/main/res/mipmap-xxxhdpi/icon.png
cp public/icon-128.png android/app/src/main/res/mipmap-xxhdpi/icon.png
cp public/icon-96.png android/app/src/main/res/mipmap-xhdpi/icon.png
cp public/icon-48.png android/app/src/main/res/mipmap-mdpi/icon.png
```

### iOS (Ionic/Capacitor)

Usar Xcode Asset Catalog o generar con:

```bash
bunx capacitor-assets generate --iconBackgroundColor '#11001c'
```

## 🎨 Variaciones del Icono

### Crear Versión Light Mode

Duplicar `icon.svg` → `icon-light.svg` y cambiar:
- `#ff00ff` → `#0066ff` (azul)
- `#11001c` → `#f5f5f5` (blanco)

### Crear Versión Animated

Para splash screens, puedes animar el patrón dithering:

```svg
<rect ...>
  <animate attributeName="opacity" 
           values="0;1;0" 
           dur="1s" 
           repeatCount="indefinite"/>
</rect>
```

## 📋 Checklist

- [x] SVG master creado
- [x] Manifest PWA configurado
- [x] Meta tags en HTML
- [ ] PNGs generados (todos los tamaños)
- [ ] Probado en navegador
- [ ] Probado en Electron (si aplica)
- [ ] Probado en móvil (si aplica)

## 🚀 Comandos Útiles

```bash
# Ver el icono actual
start public/icon.svg

# Regenerar manifest
bun run generate:icons

# Probar PWA localmente
bun start
# Abre: http://localhost:4200
```

---

**¿Necesitas cambiar el diseño?** Solo edita `public/icon.svg` y regenera los PNGs. El sistema está listo para actualizaciones rápidas.
