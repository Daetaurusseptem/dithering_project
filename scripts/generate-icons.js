/**
 * Script para generar iconos en diferentes tamaños desde el SVG
 * Uso: bun run generate:icons
 * 
 * Usa sharp para convertir SVG → PNG automáticamente
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
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

// Verificar si existe el SVG
if (!existsSync(svgPath)) {
  console.error('❌ No se encontró icon.svg en public/');
  process.exit(1);
}

// Intentar usar sharp si está disponible
let sharp;
try {
  sharp = await import('sharp');
  sharp = sharp.default;
  console.log('✅ Using sharp for PNG generation\n');
} catch (error) {
  console.log('⚠️  sharp not installed, installing...\n');
  
  // Instalar sharp con Bun
  const { spawnSync } = await import('child_process');
  const result = spawnSync('bun', ['add', '-d', 'sharp'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  if (result.status !== 0) {
    console.error('❌ Failed to install sharp');
    console.log('\n📝 Manual installation:');
    console.log('   bun add -d sharp');
    console.log('\n   Then run: bun run generate:icons\n');
    process.exit(1);
  }
  
  // Importar después de instalar
  sharp = (await import('sharp')).default;
  console.log('✅ sharp installed successfully\n');
}

// Leer SVG
const svgBuffer = readFileSync(svgPath);

// Generar cada tamaño
console.log('🔄 Generating PNG icons...\n');

for (const { name, size } of ICON_SIZES) {
  try {
    const outputPath = join(publicDir, name);
    
    await sharp(svgBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`✅ ${name} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Failed to generate ${name}:`, error.message);
  }
}

console.log('\n📋 All icons generated successfully!\n');

// Verificar manifest.json
const manifestPath = join(publicDir, 'manifest.json');
if (existsSync(manifestPath)) {
  console.log('✅ manifest.json already exists');
  
  // Actualizar solo si hace falta
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  
  // Asegurar que tiene los iconos correctos
  manifest.icons = ICON_SIZES.map(({ name, size }) => ({
    src: `/${name}`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: 'any maskable'
  }));
  
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ manifest.json updated\n');
} else {
  console.log('⚠️  manifest.json not found, creating...\n');
  
  const manifest = {
    name: 'Dithering Converter',
    short_name: 'Dithering',
    description: 'Retro image dithering with AI background removal',
    start_url: '/',
    display: 'standalone',
    background_color: '#11001c',
    theme_color: '#ff00ff',
    permissions: ['camera', 'storage'],
    orientation: 'any',
    icons: ICON_SIZES.map(({ name, size }) => ({
      src: `/${name}`,
      sizes: `${size}x${size}`,
      type: 'image/png',
      purpose: 'any maskable'
    }))
  };
  
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ manifest.json created\n');
}

console.log('🎯 Icons ready for PWA, Electron, and mobile apps!\n');
