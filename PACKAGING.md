# 📦 Guía de Empaquetado - Electron & Ionic

Esta guía explica cómo empaquetar la Dithering App como una aplicación de escritorio (Electron) o móvil (Ionic/Capacitor) con soporte offline completo para el Background Removal con IA.

---

## 🎯 Estado Actual: Listo para Empaquetar

✅ **Modo Híbrido Configurado:**
- **Desarrollo Web:** Descarga modelos desde CDN de HuggingFace
- **App Empaquetada:** Usa modelos locales (100% offline)

✅ **Detección Automática:** El código detecta si está en un entorno empaquetado y ajusta el comportamiento automáticamente.

---

## 📥 Paso 1: Descargar Modelos (Obligatorio)

Antes de empaquetar, debes descargar los modelos de IA:

### Opción A: Modelo Recomendado (RMBG-1.4, ~40MB)

```bash
# Windows (usando Bun)
bun run download:models

# O manualmente:
scripts\download-models.bat
```

### Opción B: Modelo Ligero (ModNet, ~25MB)

```bash
bun run download:models:light
```

### Verificar Descarga

Después de descargar, verifica que existan estos archivos:

```
public/models/rmbg-1.4/
├── model_quantized.onnx  (~40MB) ✅
├── config.json            ✅
├── preprocessor_config.json ✅
└── tokenizer*.json (opcional)
```

---

## 🖥️ Empaquetado Electron

### Instalación de Dependencias

```bash
bun add -d electron electron-builder
```

### Configuración: `electron.js` (crear en raíz)

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // En desarrollo: apunta a Angular dev server
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:4200');
  } else {
    // En producción: carga el build de Angular
    win.loadFile(path.join(__dirname, 'dist/dithering-converter/browser/index.html'));
  }
  
  // Exponer API de Electron para detección
  win.webContents.executeJavaScript(`
    window.electronAPI = { version: '1.0.0' };
  `);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### Configuración: `package.json` (añadir)

```json
{
  "main": "electron.js",
  "scripts": {
    "electron": "electron .",
    "electron:dev": "NODE_ENV=development electron .",
    "electron:build": "ng build --base-href ./ && electron-builder"
  },
  "build": {
    "appId": "com.ditheringapp.app",
    "productName": "Dithering Converter",
    "files": [
      "dist/dithering-converter/**/*",
      "public/models/**/*",
      "electron.js"
    ],
    "directories": {
      "buildResources": "public"
    },
    "extraResources": [
      {
        "from": "public/models",
        "to": "models",
        "filter": ["**/*"]
      }
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.png"
    },
    "mac": {
      "target": "dmg",
      "icon": "public/icon.png"
    },
    "linux": {
      "target": "AppImage",
      "icon": "public/icon.png"
    }
  }
}
```

### ⚠️ CRÍTICO: Configurar `angular.json`

```json
{
  "projects": {
    "dithering-converter": {
      "architect": {
        "build": {
          "options": {
            "baseHref": "./",  // ⬅️ IMPORTANTE para rutas relativas
            "assets": [
              "src/favicon.ico",
              {
                "glob": "**/*",
                "input": "public",
                "output": "/"
              }
            ]
          }
        }
      }
    }
  }
}
```

### Compilar

```bash
bun run electron:build
```

**Resultado:** Instalador en `dist/` (`.exe`, `.dmg`, `.AppImage`)

---

## 📱 Empaquetado Ionic/Capacitor

### Instalación de Capacitor

```bash
bun add @capacitor/core @capacitor/cli
bunx cap init
```

**Responder:**
- **App name:** Dithering Converter
- **App ID:** com.ditheringapp.app
- **Web dir:** dist/dithering-converter/browser

### Añadir Plataformas

```bash
# Android
bun add @capacitor/android
bunx cap add android

# iOS (solo en Mac)
bun add @capacitor/ios
bunx cap add ios
```

### Configuración: `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ditheringapp.app',
  appName: 'Dithering Converter',
  webDir: 'dist/dithering-converter/browser',
  server: {
    // Para desarrollo
    // url: 'http://localhost:4200',
    // cleartext: true
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
```

### ⚠️ CRÍTICO: Copiar Modelos a Assets Nativos

Después de build, copiar manualmente:

```bash
# Build Angular
ng build --configuration production

# Copiar modelos a Android
cp -r public/models android/app/src/main/assets/

# Copiar modelos a iOS
cp -r public/models ios/App/App/public/
```

### Scripts útiles en `package.json`

```json
{
  "scripts": {
    "ionic:prepare": "ng build && bunx cap copy && bunx cap sync",
    "ionic:android": "bun run ionic:prepare && bunx cap open android",
    "ionic:ios": "bun run ionic:prepare && bunx cap open ios"
  }
}
```

### Compilar para Android

```bash
bun run ionic:android
```

Esto abre Android Studio → Build → Generate Signed APK

---

## 🔧 Configuración Avanzada

### Vite Config (si usas Vite en lugar de Angular CLI)

```typescript
// vite.config.ts
export default defineConfig({
  assetsInclude: ['**/*.onnx', '**/*.bin'], // ⬅️ IMPORTANTE
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  }
});
```

---

## 🧪 Probar Modo Offline

### Simular Electron en el Navegador

```javascript
// Ejecutar en DevTools Console
window.electronAPI = { version: 'test' };
location.reload();
```

Debería ver en consola: `📦 Detected packaged app - using local models`

---

## 📊 Tamaño de las Apps

| Plataforma | Sin IA | Con RMBG-1.4 | Con ModNet |
|------------|---------|--------------|------------|
| Electron (Windows) | ~80MB | ~120MB | ~105MB |
| Android APK | ~15MB | ~55MB | ~40MB |
| iOS IPA | ~20MB | ~60MB | ~45MB |

---

## ❓ Troubleshooting

### Error: "Failed to load model"

**Solución:** Verificar que `public/models/` se copió al build:

```bash
# Electron
ls dist/dithering-converter/browser/models/

# Android
ls android/app/src/main/assets/models/

# iOS
ls ios/App/App/public/models/
```

### Error: "CORS policy" en Electron

**Solución:** Asegurar `webSecurity: false` en BrowserWindow (solo dev):

```javascript
new BrowserWindow({
  webPreferences: {
    webSecurity: false // ⚠️ Solo para desarrollo
  }
});
```

### App muy pesada

**Solución:** Usar ModNet (25MB) en lugar de RMBG-1.4 (40MB):

```bash
npm run download:models:light
```

---

## ✅ Checklist Pre-Empaquetado

- [ ] Modelos descargados en `public/models/`
- [ ] `.gitignore` actualizado (no subir `.onnx`)
- [ ] `angular.json` con `baseHref: "./"` (Electron)
- [ ] Assets incluyen `public/models/**/*`
- [ ] Probado en navegador con simulación offline
- [ ] Build de Angular sin errores: `ng build --configuration production`

---

## 🚀 Comandos Rápidos

```bash
# 1. Descargar modelos
bun run download:models

# 2. Build y empaquetar Electron
bun run electron:build

# 3. Build y empaquetar Android
bun run ionic:android

# 4. Limpiar todo y empezar de cero
rm -rf dist/ node_modules/
bun install
bun run download:models
```

---

**¿Preguntas?** Revisa los logs en consola. El servicio de IA imprime emojis para facilitar debugging:
- 🌐 = Modo online (CDN)
- 📦 = Modo offline (local)
- ✅ = Éxito
- ❌ = Error
