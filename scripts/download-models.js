#!/usr/bin/env node
/**
 * Script para descargar modelos de IA para background removal offline
 * Uso: bun download-models.js [modelo]
 * 
 * Modelos disponibles:
 * - rmbg-1.4 (Recomendado, ~40MB, mejor calidad)
 * - modnet (Ligero, ~25MB, buena calidad)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuración de modelos
const MODELS = {
  'rmbg-1.4': {
    repo: 'briaai/RMBG-1.4',
    files: [
      'model_quantized.onnx',
      'config.json',
      'preprocessor_config.json',
      'tokenizer.json',
      'tokenizer_config.json'
    ]
  },
  'modnet': {
    repo: 'Xenova/modnet',
    files: [
      'model_quantized.onnx',
      'config.json', 
      'preprocessor_config.json'
    ]
  }
};

const MODEL_NAME = process.argv[2] || 'rmbg-1.4';
const BASE_URL = 'https://huggingface.co';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'models', MODEL_NAME);

if (!MODELS[MODEL_NAME]) {
  console.error(`❌ Modelo desconocido: ${MODEL_NAME}`);
  console.log(`Modelos disponibles: ${Object.keys(MODELS).join(', ')}`);
  process.exit(1);
}

const config = MODELS[MODEL_NAME];

console.log(`\n🤖 Descargando modelo: ${MODEL_NAME}`);
console.log(`📦 Repositorio: ${config.repo}`);
console.log(`📁 Destino: ${OUTPUT_DIR}\n`);

// Crear directorio si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Función para descargar archivo
function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${config.repo}/resolve/main/${filename}`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    
    console.log(`⬇️  Descargando: ${filename}...`);
    
    const file = fs.createWriteStream(outputPath);
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      // Seguir redirects
      followRedirect: true
    }, (response) => {
      // Manejar redirects manualmente
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
          let downloaded = 0;
          
          redirectResponse.on('data', (chunk) => {
            downloaded += chunk.length;
            const percent = ((downloaded / totalSize) * 100).toFixed(1);
            process.stdout.write(`\r   Progreso: ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)}MB)`);
          });
          
          redirectResponse.pipe(file);
          
          file.on('finish', () => {
            file.close();
            console.log(`\n   ✅ ${filename} descargado\n`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(outputPath, () => {});
          reject(err);
        });
      } else {
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;
        
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (totalSize) {
            const percent = ((downloaded / totalSize) * 100).toFixed(1);
            process.stdout.write(`\r   Progreso: ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)}MB)`);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`\n   ✅ ${filename} descargado\n`);
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Descargar todos los archivos secuencialmente
(async () => {
  try {
    for (const file of config.files) {
      try {
        await downloadFile(file);
      } catch (err) {
        console.warn(`⚠️  No se pudo descargar ${file}: ${err.message}`);
        console.log(`   (Puede ser opcional)`);
      }
    }
    
    console.log(`\n✅ ¡Modelo ${MODEL_NAME} descargado exitosamente!`);
    console.log(`📂 Ubicación: ${OUTPUT_DIR}`);
    console.log(`\n🚀 Tu app ahora puede funcionar 100% offline\n`);
    
  } catch (error) {
    console.error(`\n❌ Error durante la descarga:`, error.message);
    console.log(`\n💡 Descarga manual desde: ${BASE_URL}/${config.repo}/tree/main\n`);
    process.exit(1);
  }
})();
