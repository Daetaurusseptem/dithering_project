# 🎨 Dithering Converter - Retro Image Editor

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-SITE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE/deploys)

> Advanced creative error diffusion editor with AI-powered background removal, GIF animation studio, and multi-layer composition.

🌐 **Live Demo:** [Coming Soon]  
📂 **GitHub:** [Daetaurusseptem/dithering_project](https://github.com/Daetaurusseptem/dithering_project)

Built with Angular 20 + Bun

## ✨ Features

- 🖼️ **Advanced Dithering:** Multiple dithering algorithms for image conversion
- 🤖 **AI Background Removal:** Powered by Transformers.js (offline-ready)
- 🎨 **5 Retro Themes:** Scanline, CRT, Windows 98, Vapor Wave, and more
- 📦 **Offline-Ready:** Supports Electron and Ionic/Capacitor packaging
- 🎭 **Layer Composition:** Multi-layer editing with effects
- 📱 **Mobile Optimized:** Works on desktop and mobile browsers

## 🚀 Quick Start

### Development Server

> **Note:** Este proyecto usa **Bun** como package manager (más rápido que npm/yarn).

To start a local development server, run:

```bash
bun start
# or
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### AI Background Removal (Optional)

For development, the AI models download automatically from CDN (~25MB, one-time).

For **offline production builds** (Electron/Ionic), download models locally:

```bash
# Download RMBG-1.4 (recommended, ~40MB)
bun run download:models

# Or download ModNet (lighter, ~25MB)
bun run download:models:light
```

See [PACKAGING.md](./PACKAGING.md) for complete offline setup instructions.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## 📦 Packaging for Desktop/Mobile

This app is ready to be packaged as:
- 🖥️ **Electron** (Windows, Mac, Linux)
- 📱 **Ionic/Capacitor** (Android, iOS)

**Complete guide:** See [PACKAGING.md](./PACKAGING.md) for step-by-step instructions.

**Quick command to prepare for offline:**

```bash
bun run prepare:offline
```

## 🧠 AI Model Information

The AI background removal feature uses Transformers.js with quantized ONNX models:

- **Online Mode (Development):** Downloads models from HuggingFace CDN automatically
- **Offline Mode (Production):** Uses local models from `public/models/`

**Model Options:**
- `rmbg-1.4`: Best quality (~40MB) - Recommended
- `modnet`: Lightweight (~25MB) - Good for mobile

The app automatically detects if it's running in a packaged environment (Electron/Ionic) and switches to offline mode.

## 📂 Project Structure

```
dithering-converter/
├── src/app/
│   ├── components/       # UI components
│   ├── services/         # Business logic
│   │   └── ai-background-removal.service.ts  # AI integration
│   └── models/           # TypeScript interfaces
├── public/
│   ├── models/           # AI models (download separately)
│   └── assets/           # Static resources
├── scripts/
│   └── download-models.* # Model download utilities
└── PACKAGING.md          # Electron/Ionic guide
```

## 🛠️ Available Scripts

```bash
# Development
bun start                    # Start dev server
bun run watch                # Build with watch mode

# Building
bun run build                # Production build
bun run electron:build       # Build Electron app
bun run ionic:android        # Build Android app

# AI Models
bun run download:models      # Download RMBG-1.4 (~40MB)
bun run download:models:light # Download ModNet (~25MB)
bun run prepare:offline      # Full offline preparation
```

## 🐛 Troubleshooting

### AI Background Removal not working

1. Check browser console for errors
2. Verify internet connection (for first-time model download)
3. Clear browser cache and reload
4. For offline builds, ensure models are downloaded: `bun run download:models`

### Build errors with `.onnx` files

If using Vite, add to `vite.config.ts`:

```typescript
assetsInclude: ['**/*.onnx', '**/*.bin']
```

---

## 📦 Deploy to Netlify

See [DEPLOY.md](./DEPLOY.md) for complete deployment guide including:
- Netlify setup (CLI & Dashboard)
- Google AdSense integration
- CI/CD configuration
- Revenue optimization tips

**Quick deploy:**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
# Then connect repo on netlify.com
```

---

## 💰 Monetization

This app is ready for Google AdSense:
- ✅ Legal pages (Privacy Policy & Terms)
- ✅ Ad service & components included
- ✅ CSP headers configured
- ⏳ Needs your AdSense approval

Expected revenue: **$10-50/month** with 10k visits

---

## 👤 Author

**Jaime Aburto**
- GitHub: [@Daetaurusseptem](https://github.com/Daetaurusseptem)
- Email: jaimeaburcalv@gmail.com
- Location: México 🇲🇽

---

## 📞 Support

- 🐛 **Bug Reports:** [Open an Issue](https://github.com/Daetaurusseptem/dithering_project/issues)
- 💡 **Feature Requests:** [Discussions](https://github.com/Daetaurusseptem/dithering_project/discussions)
- 📧 **Email:** jaimeaburcalv@gmail.com

---

## 📝 Additional Resources

- [Angular CLI Documentation](https://angular.dev/tools/cli)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [Electron Packaging Guide](./PACKAGING.md#electron)
- [Ionic/Capacitor Guide](./PACKAGING.md#ioniccapacitor)
