# 🚀 Guía de Deployment - Dithering Converter

Esta guía cubre todas las opciones para desplegar tu aplicación en producción.

---

## 📋 Índice

1. [Preparación](#-preparación)
2. [Deploy Web (Hosting)](#-deploy-web-hosting)
   - Vercel
   - Netlify
   - GitHub Pages
   - Firebase Hosting
3. [Deploy de Apps Nativas](#-deploy-de-apps-nativas)
   - Electron (Desktop)
   - Ionic/Capacitor (Mobile)
4. [Optimizaciones](#-optimizaciones)
5. [CI/CD Automation](#-cicd-automation)

---

## ✅ Preparación

### 1. Verificar que todo funciona

```bash
# Instalar dependencias
bun install

# Probar en desarrollo
bun start

# Build de producción
bun run build:prod
```

### 2. Decidir modo de IA

#### Opción A: Online (CDN) - Recomendado para web

✅ **Sin configuración adicional**
- Los modelos se descargan desde HuggingFace CDN
- Tamaño del bundle: ~5MB
- Primera carga: +25MB de descarga de modelo (se cachea)

#### Opción B: Offline (Modelos locales) - Para apps nativas

```bash
# Descargar modelos
bun run download:models

# O modelo ligero
bun run download:models:light
```

- Tamaño del bundle: ~45-70MB
- Sin dependencia de internet después de instalación

---

## 🌐 Deploy Web (Hosting)

### 🟢 Vercel (Recomendado)

**Ventajas:**
- Gratis para proyectos personales
- Deploy automático desde Git
- CDN global ultrarrápido
- HTTPS automático

**Pasos:**

1. **Instalar Vercel CLI**

```bash
bun add -D vercel
```

2. **Login**

```bash
bunx vercel login
```

3. **Configurar** `vercel.json` (crear en raíz):

```json
{
  "version": 2,
  "name": "dithering-converter",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/dithering-converter/browser"
      }
    }
  ],
  "routes": [
    {
      "src": "/models/(.*)",
      "dest": "/models/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "buildCommand": "bun run build:prod",
  "outputDirectory": "dist/dithering-converter/browser"
}
```

4. **Deploy**

```bash
# Deploy de prueba
bunx vercel

# Deploy a producción
bunx vercel --prod
```

5. **Deploy automático desde GitHub**

- Ve a [vercel.com](https://vercel.com)
- Import Git Repository
- Selecciona tu repo
- Configura:
  - **Build Command:** `bun run build:prod`
  - **Output Directory:** `dist/dithering-converter/browser`
  - **Install Command:** `bun install`

✅ Cada push a `main` desplegará automáticamente

---

### 🔵 Netlify

**Ventajas:**
- Gratis para proyectos pequeños
- Drag & drop deployment
- Forms y Functions incluidas

**Pasos:**

1. **Configurar** `netlify.toml` (crear en raíz):

```toml
[build]
  command = "bun run build:prod"
  publish = "dist/dithering-converter/browser"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

2. **Deploy via CLI**

```bash
# Instalar Netlify CLI
bun add -D netlify-cli

# Login
bunx netlify login

# Deploy
bunx netlify deploy --prod
```

3. **Deploy via GitHub**

- Ve a [netlify.com](https://netlify.com)
- New site from Git
- Selecciona tu repo
- Build settings:
  - **Build command:** `bun run build:prod`
  - **Publish directory:** `dist/dithering-converter/browser`

---

### 🟣 GitHub Pages

**Ventajas:**
- 100% gratis
- Integrado con tu repo
- Bueno para demos públicos

**Pasos:**

1. **Instalar angular-cli-ghpages**

```bash
bun add -D angular-cli-ghpages
```

2. **Añadir script** en `package.json`:

```json
{
  "scripts": {
    "deploy:gh": "ng build --base-href /dithering-app/ && bunx angular-cli-ghpages --dir=dist/dithering-converter/browser"
  }
}
```

3. **Deploy**

```bash
bun run deploy:gh
```

4. **Configurar GitHub Pages**

- Ve a Settings → Pages
- Source: `gh-pages` branch
- URL: `https://tuusuario.github.io/dithering-app/`

⚠️ **Nota:** Cambia `/dithering-app/` por el nombre de tu repo.

---

### 🟠 Firebase Hosting

**Ventajas:**
- CDN global de Google
- HTTPS automático
- Rewrites para SPA

**Pasos:**

1. **Instalar Firebase CLI**

```bash
bun add -D firebase-tools
```

2. **Login e inicializar**

```bash
bunx firebase login
bunx firebase init hosting
```

Configurar:
- Public directory: `dist/dithering-converter/browser`
- Single-page app: **Yes**
- Overwrites: **No**

3. **Configurar** `firebase.json` (se crea automáticamente):

```json
{
  "hosting": {
    "public": "dist/dithering-converter/browser",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

4. **Deploy**

```bash
# Build
bun run build:prod

# Deploy
bunx firebase deploy
```

---

## 📱 Deploy de Apps Nativas

### 🖥️ Electron (Windows, Mac, Linux)

Ver guía completa en [PACKAGING.md](./PACKAGING.md#electron)

**Resumen rápido:**

```bash
# 1. Descargar modelos
bun run download:models

# 2. Instalar dependencias
bun add -D electron electron-builder

# 3. Configurar (ver PACKAGING.md)

# 4. Build
bun run electron:build

# Resultado: instaladores en dist/
```

---

### 📱 Ionic/Capacitor (Android/iOS)

Ver guía completa en [PACKAGING.md](./PACKAGING.md#ioniccapacitor)

**Resumen Android:**

```bash
# 1. Descargar modelos
bun run download:models

# 2. Añadir Capacitor
bunx cap init
bunx cap add android

# 3. Build y sync
bun run build:prod
bunx cap copy
bunx cap sync

# 4. Abrir Android Studio
bunx cap open android

# 5. Build → Generate Signed APK
```

---

## ⚡ Optimizaciones

### Bundle Size

```bash
# Analizar tamaño del bundle
bun run build:prod -- --stats-json
bunx webpack-bundle-analyzer dist/dithering-converter/browser/stats.json
```

### Performance

1. **Lazy load de modelos AI**

Ya implementado ✅ - El modelo solo se carga al usar background removal

2. **Image optimization**

```typescript
// Ya implementado en ai-background-removal.service.ts
// Max resolution: 1024px para mobile
```

3. **Angular optimizations**

```typescript
// angular.json
{
  "optimization": true,
  "outputHashing": "all",
  "sourceMap": false,
  "namedChunks": false,
  "aot": true,
  "buildOptimizer": true
}
```

---

## 🤖 CI/CD Automation

### GitHub Actions (Vercel/Netlify)

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Build
      run: bun run build:prod
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
        working-directory: ./
```

### Deploy automático con Git hooks

Crear `.husky/pre-push` (opcional):

```bash
#!/bin/sh
bun test
bun run build:prod
```

---

## 🧪 Testing Pre-Deploy

### Checklist

- [ ] Build sin errores: `bun run build:prod`
- [ ] Probar build localmente: `bun run preview`
- [ ] Verificar tamaño: `ls -lh dist/dithering-converter/browser`
- [ ] Probar en diferentes navegadores
- [ ] Probar AI background removal
- [ ] Verificar responsive design
- [ ] Verificar cambio de temas

### Testing del Build

```bash
# Build de producción
bun run build:prod

# Servir localmente
cd dist/dithering-converter/browser
python -m http.server 8080
# O con Node:
npx serve -s .
# O con Bun:
bun --bun vite preview
```

Abrir: http://localhost:8080

---

## 🌍 Variables de Entorno

Para configuraciones sensibles, crear `.env.production`:

```bash
# API Keys (si necesitas)
NG_APP_API_KEY=tu_api_key

# Analytics
NG_APP_GA_ID=G-XXXXXXXXXX

# Feature Flags
NG_APP_ENABLE_AI=true
```

⚠️ **Importante:** Añadir `.env.*` al `.gitignore`

---

## 📊 Monitoreo

### Analytics (Opcional)

1. **Google Analytics 4**

```typescript
// app.config.ts
import { provideAnalytics } from '@angular/fire/analytics';

export const appConfig = {
  providers: [
    provideAnalytics(() => getAnalytics())
  ]
};
```

2. **Sentry (Error tracking)**

```bash
bun add @sentry/angular
```

```typescript
// main.ts
import * as Sentry from "@sentry/angular";

Sentry.init({
  dsn: "tu_dsn",
  environment: "production"
});
```

---

## 🔒 Seguridad

### Content Security Policy

Añadir en `index.html`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: blob:;
               connect-src 'self' https://huggingface.co;">
```

### Headers de Seguridad (Vercel)

En `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 🆘 Troubleshooting

### Error: "Cannot find module"

```bash
rm -rf node_modules bun.lockb
bun install
```

### Error: AI models not loading

- **Web:** Verifica CORS y conexión a HuggingFace
- **Electron/Ionic:** Asegura que `public/models/` se copió al build

### Build muy lento

```bash
# Limpiar cache de Angular
rm -rf .angular/cache
bun run build:prod
```

### Error: "Out of memory"

```bash
# Aumentar memoria de Node
export NODE_OPTIONS="--max-old-space-size=4096"
bun run build:prod
```

---

## 📈 Comparación de Opciones

| Plataforma | Gratis | CI/CD | CDN | Build Time | Dificultad |
|------------|--------|-------|-----|------------|------------|
| **Vercel** | ✅ | ✅ | ✅ | ~2 min | ⭐ Fácil |
| **Netlify** | ✅ | ✅ | ✅ | ~2 min | ⭐ Fácil |
| **GitHub Pages** | ✅ | ⚠️ Manual | ⚠️ Limitado | ~3 min | ⭐⭐ Medio |
| **Firebase** | ✅ | ⚠️ Config | ✅ | ~3 min | ⭐⭐ Medio |
| **Electron** | N/A | ⚠️ Config | N/A | ~10 min | ⭐⭐⭐ Avanzado |
| **Ionic/Capacitor** | N/A | ⚠️ Config | N/A | ~15 min | ⭐⭐⭐ Avanzado |

---

## 🎯 Recomendaciones Finales

### Para Demo/Portfolio

**→ Vercel** (1 click, ultrarrápido, gratis)

```bash
bunx vercel --prod
```

### Para Producción Web

**→ Vercel o Netlify** (profesional, escalable)

### Para Desktop App

**→ Electron** (multiplataforma, fácil distribución)

### Para Mobile App

**→ Ionic/Capacitor** (Android + iOS con una base de código)

---

## 🚀 Quick Deploy (1 comando)

```bash
# Deploy a Vercel (más rápido)
bun run build:prod && bunx vercel --prod

# Deploy a Netlify
bun run build:prod && bunx netlify deploy --prod

# Deploy a GitHub Pages
bun run deploy:gh

# Deploy a Firebase
bun run build:prod && bunx firebase deploy
```

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs del build
2. Verifica versiones: `bun --version`, `ng version`
3. Limpia y reconstruye: `rm -rf node_modules && bun install`
4. Revisa [PACKAGING.md](./PACKAGING.md) para apps nativas

---

**¡Listo para desplegar! 🎉**

Elige tu plataforma favorita y sigue los pasos. La app está optimizada para funcionar en cualquier entorno.
