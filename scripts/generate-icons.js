/**
 * Script para generar iconos en diferentes tamaños desde el SVG
 * Uso: bun run generate-icons
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ICON_SIZES = [
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-256.png', size: 256 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-128.png', size: 128 },
  { name: 'icon-96.png', size: 96 },
  { name: 'icon-48.png', size: 48 },
  { name: 'icon-32.png', size: 32 },
  { name: 'icon-16.png', size: 16 },
];

const publicDir = join(import.meta.dir, '..', 'public');
const svgPath = join(publicDir, 'icon.svg');

console.log('🎨 Generando iconos desde SVG...\n');

// Leer SVG
const svgContent = readFileSync(svgPath, 'utf-8');
console.log(`✅ SVG leído: ${svgPath}`);

console.log('\n⚠️  Para generar PNGs, necesitas una herramienta externa.');
console.log('📝 Opciones recomendadas:\n');

console.log('1️⃣  Online (Más rápido):');
console.log('   • Abre: https://svgtopng.com/');
console.log('   • Sube: public/icon.svg');
console.log('   • Descarga tamaños: 512, 256, 192, 128, 96, 48, 32, 16');
console.log('   • Guarda en: public/\n');

console.log('2️⃣  Con Inkscape (Offline):');
console.log('   inkscape --export-type=png --export-width=512 --export-filename=public/icon-512.png public/icon.svg\n');

console.log('3️⃣  Con ImageMagick (Offline):');
console.log('   magick public/icon.svg -resize 512x512 public/icon-512.png\n');

console.log('4️⃣  Con Node.js sharp (instalando dependencias):');
console.log('   npx @squoosh/cli --resize "{width:512,height:512}" -d public public/icon.svg\n');

// Crear manifest.json actualizado
const manifest = {
  "name": "Dithering Converter",
  "short_name": "Dithering",
  "description": "Retro image dithering with AI background removal",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#11001c",
  "theme_color": "#ff00ff",
  "icons": ICON_SIZES.map(({ name, size }) => ({
    "src": `/${name}`,
    "sizes": `${size}x${size}`,
    "type": "image/png",
    "purpose": "any maskable"
  }))
};

const manifestPath = join(publicDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`✅ Manifest PWA creado: ${manifestPath}\n`);

console.log('📋 Tamaños necesarios:');
ICON_SIZES.forEach(({ name, size }) => {
  console.log(`   • ${name} (${size}x${size})`);
});

console.log('\n🎯 Para Electron, usa icon-512.png como base');
console.log('🎯 Para Android/iOS, copia todos los tamaños\n');
