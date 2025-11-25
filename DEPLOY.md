# 🚀 Deployment Guide - Netlify CI/CD + Google AdSense

Esta guía te ayuda a desplegar tu app en Netlify con CI/CD automático y configurar Google AdSense para generar revenue pasivo.

---

## 📋 Índice

1. [Deploy Rápido en Netlify](#-deploy-rápido-en-netlify)
2. [CI/CD Automático](#-cicd-automático)
3. [Google AdSense Setup](#-google-adsense-setup)
4. [Monetización & Revenue](#-monetización--revenue)
5. [Troubleshooting](#-troubleshooting)

---

## 🚀 Deploy Rápido en Netlify

### Opción A: Netlify CLI (Más Control)

```bash
# 1. Instalar Netlify CLI
npm install -g netlify-cli

# 2. Login en Netlify
netlify login

# 3. Inicializar proyecto
netlify init

# 4. Build y deploy
npm run build
netlify deploy --prod
```

### Opción B: Netlify Dashboard (Más Fácil) ⭐ RECOMENDADO

1. **Crear repositorio en GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TU_USUARIO/dithering-app.git
   git push -u origin main
   ```

2. **Conectar en Netlify**
   - Ve a [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Conecta tu repositorio de GitHub
   - Netlify detecta automáticamente la configuración de `netlify.toml`
   - Click "Deploy site"

3. **¡Listo!** 🎉
   - URL generada: `https://tu-sitio.netlify.app`
   - Cada push a `main` despliega automáticamente

---

## 🔄 CI/CD Automático

Ya está configurado con **GitHub Actions** (`.github/workflows/netlify-deploy.yml`):

### ¿Cómo funciona?

1. Haces `git push` a `main`
2. GitHub Actions:
   - ✅ Instala dependencias
   - ✅ Compila la aplicación
   - ✅ Despliega a Netlify
3. Recibes notificación de deploy exitoso

### Configurar Secrets (para GitHub Actions)

Si quieres usar GitHub Actions en lugar del deploy automático de Netlify:

1. Ve a tu repo → **Settings** → **Secrets and variables** → **Actions**
2. Añade estos secrets:

   - **NETLIFY_AUTH_TOKEN**
     ```bash
     netlify login
     # Copia el token de ~/.netlify/config.json
     ```
   
   - **NETLIFY_SITE_ID**
     ```bash
     netlify sites:list
     # Copia el Site ID de tu sitio
     ```

### ¿Netlify o GitHub Actions?

| Feature | Netlify Automático | GitHub Actions |
|---------|-------------------|----------------|
| Setup | ✅ Cero config | Requiere secrets |
| Velocidad | ⚡ Muy rápido | Rápido |
| Preview PRs | ✅ Automático | ✅ Manual |
| Logs | Dashboard Netlify | GitHub Actions tab |

**Recomendación:** Usa Netlify automático (más simple). GitHub Actions es opcional para workflows avanzados.

---

## 💰 Google AdSense Setup

### 1️⃣ Crear Cuenta AdSense

1. Ve a [google.com/adsense](https://www.google.com/adsense)
2. Registra tu dominio
3. Añade el código de verificación (ya incluido en `index.html`)
4. **Espera aprobación** (1-2 semanas típicamente)

### 2️⃣ Crear Unidades de Anuncios

Una vez aprobado, crea 4 tipos de anuncios:

1. **Header Banner** (728x90 o responsive)
2. **Sidebar** (300x250 o responsive)  
3. **Footer** (728x90 o responsive)
4. **In-Content** (responsive)

### 3️⃣ Configurar Credenciales

Edita `src/app/services/ads.service.ts`:

```typescript
// 🔴 REEMPLAZA CON TUS VALORES REALES
private readonly AD_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX'; // Tu Publisher ID

readonly adSlots = {
  header: '0000000000',    // Slot ID del banner header
  sidebar: '1111111111',   // Slot ID del sidebar
  footer: '2222222222',    // Slot ID del footer
  inContent: '3333333333'  // Slot ID in-content
};
```

**¿Dónde encontrar estos valores?**
- **Publisher ID**: AdSense → Cuenta → ID de editor
- **Slot IDs**: AdSense → Anuncios → Copiar código → data-ad-slot="XXXXXXXXXX"

### 4️⃣ Integrar en la App

Edita `src/app/app.ts`:

```typescript
import { AdBannerComponent } from './components/ad-banner/ad-banner.component';
import { AdsService } from './services/ads.service';

@Component({
  // ...
  imports: [
    // ... otros imports
    AdBannerComponent
  ]
})
export class App {
  constructor(
    // ... otros servicios
    private adsService: AdsService
  ) {}

  ngAfterViewInit() {
    // Inicializar ads
    this.adsService.initializeAds();
  }
}
```

### 5️⃣ Colocar Ads en el HTML

Edita `src/app/app.html` y añade donde quieras mostrar anuncios:

```html
<!-- Header (después del título) -->
<app-ad-banner position="header"></app-ad-banner>

<!-- Sidebar (en panel de controles) -->
<app-ad-banner position="sidebar"></app-ad-banner>

<!-- Footer (antes del cierre) -->
<app-ad-banner position="footer"></app-ad-banner>
```

### 6️⃣ Sugerencias de Ubicación

**Desktop:**
```
┌─────────────────────────────┐
│   HEADER AD (728x90)        │
├─────────┬───────────────────┤
│         │                   │
│ SIDEBAR │   Canvas/Content  │
│ AD      │                   │
│ (300x)  │                   │
│         │                   │
├─────────┴───────────────────┤
│   FOOTER AD (728x90)        │
└─────────────────────────────┘
```

**Mobile:**
```
┌─────────────────┐
│  HEADER AD      │
├─────────────────┤
│                 │
│  Canvas/Content │
│                 │
├─────────────────┤
│  FOOTER AD      │
└─────────────────┘
```

---

## 📊 Monetización & Revenue

### Estimaciones Realistas

| Tráfico Mensual | RPM Típico | Revenue Estimado |
|----------------|------------|------------------|
| 1,000 visitas | $1-3 | $1-3/mes |
| 10,000 visitas | $1-5 | $10-50/mes |
| 50,000 visitas | $2-6 | $100-300/mes |
| 100,000 visitas | $3-8 | $300-800/mes |

**RPM** = Revenue Per Mille (por cada 1000 impresiones)

### Factores que Afectan el Revenue

✅ **Aumentan Revenue:**
- Tráfico de USA/UK/Australia/Canadá
- Usuarios desktop (más que mobile)
- Contenido en inglés
- Nicho técnico/profesional
- CTR alto (1-3%)
- Ads above the fold

❌ **Reducen Revenue:**
- Ad blockers (~30% usuarios)
- Tráfico mobile
- Países con bajo CPC
- Demasiados ads (spam)
- Ads irrelevantes

### Optimización de Revenue

1. **No más de 3 ads por página**
2. **Usa formato responsive** (se adapta mejor)
3. **Coloca 1 ad above the fold** (visible sin scroll)
4. **Habilita auto ads** en AdSense
5. **Mobile-first design**
6. **Test A/B posiciones** durante 1-2 semanas

### Alternativas de Monetización

Además de AdSense:

- **🎁 Donaciones**: Patreon, Ko-fi, Buy Me a Coffee
- **💳 Premium sin ads**: $2-5/mes con Stripe
- **📦 Affiliate**: Recomendar herramientas de diseño
- **🛒 Templates/Assets**: Vender paletas de dithering
- **🎓 Cursos**: Pixel art tutorials

---

## 🔐 Environment Variables (Opcional)

Para configuraciones sensibles en el futuro:

```bash
# En Netlify Dashboard
Site settings → Environment variables → Add variable

# Variables disponibles:
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXX
VITE_ANALYTICS_ID=G-XXXXXXXXX
```

Acceder en código:
```typescript
const adsClient = import.meta.env.VITE_ADSENSE_CLIENT;
```

---

## 🐛 Troubleshooting

### Build Falla en Netlify

```bash
# Verificar localmente
npm install
npm run build

# Si funciona local pero falla en Netlify:
# 1. Revisa node version en netlify.toml
# 2. Verifica que todas las deps estén en package.json
# 3. Limpia cache de Netlify: Deploy settings → Clear cache
```

### Ads No Aparecen

**Checklist:**
- [ ] ✅ AdSense aprobado (no pending)
- [ ] ✅ Esperaste 24-48h después de aprobación
- [ ] ✅ Reemplazaste `ca-pub-0000000000000000` con tu ID real
- [ ] ✅ Reemplazaste los slot IDs `0000000000` con tus IDs reales
- [ ] ✅ `ads.service.ts` tiene valores correctos
- [ ] ✅ CSP en `netlify.toml` permite `googlesyndication.com`
- [ ] ✅ No tienes ad blocker activado
- [ ] ✅ Console del navegador no muestra errores

**Debug:**
```javascript
// En Console del navegador
console.log(window.adsbygoogle);
// Debe mostrar un array, no undefined
```

### Redirect 404 en Rutas

Si las rutas no funcionan después de refresh:
- ✅ Verifica que `netlify.toml` tenga el redirect `/* → /index.html`

### Camera Permissions

Si la cámara no funciona en producción:
- ✅ Netlify sirve con HTTPS automáticamente (requerido)
- ✅ Verifica `Permissions-Policy` en `index.html`
- ✅ Prueba en diferentes navegadores

---

## 📝 Checklist Pre-Launch

- [ ] ✅ Código en GitHub
- [ ] ✅ Sitio conectado en Netlify
- [ ] ✅ Build exitoso (verde en dashboard)
- [ ] ✅ DNS configurado (si dominio custom)
- [ ] ✅ HTTPS habilitado (automático)
- [ ] ✅ AdSense aprobado y configurado
- [ ] ✅ Ads visibles en preview
- [ ] ✅ Pruebas en mobile y desktop
- [ ] ✅ Camera funciona
- [ ] ✅ Drag & drop funciona
- [ ] ✅ Performance aceptable (Lighthouse)

---

## 🎯 Next Steps

Después del launch:

1. **SEO**: Añadir meta tags, sitemap, robots.txt
2. **Analytics**: Google Analytics o Plausible
3. **Performance**: Lazy loading, image optimization
4. **A/B Testing**: Probar posiciones de ads
5. **Social**: Open Graph tags para shares
6. **PWA**: Service Worker para offline
7. **Premium**: Versión sin ads ($2-5/mes)

---

## 🚀 Deploy Command

```bash
# Commit y push
git add .
git commit -m "Add CI/CD and ads integration"
git push origin main

# ¡Netlify despliega automáticamente! 🎉
```

---

## 📚 Resources

- [Netlify Docs](https://docs.netlify.com)
- [Google AdSense Help](https://support.google.com/adsense)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [Angular Deployment](https://angular.dev/tools/cli/deployment)

**¿Preguntas?** Revisa el troubleshooting o contacta support de Netlify/AdSense
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
