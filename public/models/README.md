# AI Models Directory

## Estructura de Modelos para Background Removal

Esta carpeta contiene los modelos de IA necesarios para el background removal offline.

### Modelo: RMBG-1.4 (Recomendado)

**Ubicación:** `rmbg-1.4/`

**Archivos necesarios (descargar de https://huggingface.co/briaai/RMBG-1.4/tree/main):**

1. ✅ `model_quantized.onnx` (~40MB) - El cerebro comprimido de la IA
   - **IMPORTANTE:** Si la librería falla, renombrarlo a `model.onnx`
   
2. ✅ `config.json` - Configuración general del modelo

3. ✅ `preprocessor_config.json` - Configuración de preprocesamiento de imágenes

4. ⚠️ `tokenizer.json` (opcional, por si acaso)

5. ⚠️ `tokenizer_config.json` (opcional, por si acaso)

### Instrucciones de Descarga

#### Opción 1: Manual (Recomendado para verificar archivos)

1. Ve a: https://huggingface.co/briaai/RMBG-1.4/tree/main
2. Click en pestaña "Files and versions"
3. Descarga cada archivo listado arriba
4. Colócalos en `public/models/rmbg-1.4/`

#### Opción 2: Script automatizado (Recomendado)

```bash
# Usando Bun
bun run download:models

# O directamente
bun scripts/download-models.js rmbg-1.4
```

### Modelo Alternativo: ModNet (Más ligero, ~25MB)

Si necesitas una app más ligera, usa ModNet:

**Ubicación:** `modnet/`

**Descargar de:** https://huggingface.co/Xenova/modnet/tree/main

- `model_quantized.onnx` (~25MB)
- `config.json`
- `preprocessor_config.json`

### Configuración para Electron/Ionic

Una vez descargados los modelos:

1. ✅ La app funcionará 100% offline
2. ✅ No dependerá de servidores externos
3. ✅ El instalador pesará ~40-70MB más (según modelo elegido)
4. ✅ Funcionará "para siempre" (incluso sin internet)

### Notas Técnicas

- **Package Manager:** Esta app usa Bun (más rápido que npm/yarn)
- **Vite:** Los archivos `.onnx` están configurados en `vite.config.ts` para ser incluidos en el build
- **Angular:** La carpeta `public/` se copia automáticamente al build
- **Electron:** Usar `env.localModelPath = './models/'` (ruta relativa)
- **Ionic/Capacitor:** Usar `env.localModelPath = './models/'` 

### Estado Actual

🔄 **Modo Híbrido Activo:**
- Desarrollo: Descarga desde CDN (más rápido)
- Producción: Puede usar modelos locales si están presentes

Para forzar modo offline completo, cambiar en `ai-background-removal.service.ts`:
```typescript
env.allowRemoteModels = false; // ⛔ PROHIBIR INTERNET
```
