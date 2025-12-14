/// <reference lib="webworker" />

// Definición de tipos para los mensajes
export interface DitheringRequest {
  imageData: ImageData;
  options: DitheringOptions;
  id: string;
}

export interface DitheringResponse {
  imageData: ImageData;
  id: string;
}

export interface DitheringOptions {
  algorithm: string;
  scale: number;
  contrast: number;
  midtones: number;
  highlights: number;
  blur: number;
  palette?: string;
  paletteColors?: number[][]; // Pasamos los colores directamente al worker
  threshold?: number;
}

// Event listener principal
addEventListener('message', ({ data }: { data: DitheringRequest }) => {
  console.log('👷 Worker received request:', data.options.algorithm);
  const startTime = performance.now();

  try {
    const result = applyDithering(data.imageData, data.options);
    const duration = performance.now() - startTime;
    console.log(`👷 Worker finished in ${duration.toFixed(2)}ms`);

    postMessage({
      imageData: result,
      id: data.id
    });
  } catch (error: any) { // Use 'any' or 'unknown' for error type
    console.error('👷 Worker error:', error);
    // En caso de error, devolvemos la imagen original
    postMessage({
      imageData: data.imageData,
      id: data.id,
      error: error.message
    });
  }
});

/**
 * Procesa una imagen aplicando el algoritmo de dithering seleccionado
 */
function applyDithering(
  imageData: ImageData,
  options: DitheringOptions
): ImageData {
  const processed = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // Aplicar ajustes de imagen primero
  applyImageAdjustments(processed, options);

  // Aplicar blur si es necesario
  if (options.blur > 0) {
    applyBlur(processed, options.blur);
  }

  // Obtener paleta de colores
  // La paleta viene en options.paletteColors o es null
  const palette = options.paletteColors || null;

  // Aplicar el algoritmo de dithering correspondiente
  switch (options.algorithm) {
    case 'floyd-steinberg':
      return floydSteinberg(processed, palette);
    case 'atkinson':
      return atkinson(processed, palette);
    case 'jarvis-judice-ninke':
      return jarvisJudiceNinke(processed, palette);
    case 'stucki':
      return stucki(processed, palette);
    case 'burkes':
      return burkes(processed, palette);
    case 'sierra':
      return sierra(processed, palette);
    case 'sierra-lite':
      return sierraLite(processed, palette);
    case 'ordered-2x2':
      return orderedDithering(processed, 2, palette);
    case 'ordered-4x4':
      return orderedDithering(processed, 4, palette);
    case 'ordered-8x8':
      return orderedDithering(processed, 8, palette);
    case 'random':
      return randomDithering(processed, options.threshold || 128, palette);
    case 'pattern-halftone':
      return halftonePattern(processed, palette);
    case 'pattern-crosshatch':
      return crosshatchPattern(processed, palette);
    default:
      return floydSteinberg(processed, palette);
  }
}

/**
 * Aplica ajustes de imagen (contraste, medios tonos, highlights)
 */
function applyImageAdjustments(imageData: ImageData, options: DitheringOptions): void {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Aplicar contraste
    if (options.contrast !== 50) {
      const contrast = (options.contrast - 50) * 2.55;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      r = clamp(factor * (r - 128) + 128);
      g = clamp(factor * (g - 128) + 128);
      b = clamp(factor * (b - 128) + 128);
    }

    // Calcular luminancia una vez para midrange y highlights
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Aplicar ajuste de medios tonos
    const midtonesFactor = (options.midtones - 50) / 50;
    if (midtonesFactor !== 0) {
      if (luminance > 64 && luminance < 192) {
        r = clamp(r + midtonesFactor * 30);
        g = clamp(g + midtonesFactor * 30);
        b = clamp(b + midtonesFactor * 30);
      }
    }

    // Aplicar ajuste de highlights
    const highlightsFactor = (options.highlights - 50) / 50;
    if (highlightsFactor !== 0) {
      if (luminance > 192) {
        r = clamp(r + highlightsFactor * 30);
        g = clamp(g + highlightsFactor * 30);
        b = clamp(b + highlightsFactor * 30);
      }
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

/**
 * Aplica un blur simple (box blur)
 */
function applyBlur(imageData: ImageData, radius: number): void {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const tempData = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const px = x + kx;
          const py = y + ky;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = (py * width + px) * 4;
            r += tempData[idx];
            g += tempData[idx + 1];
            b += tempData[idx + 2];
            count++;
          }
        }
      }

      const idx = (y * width + x) * 4;
      data[idx] = r / count;
      data[idx + 1] = g / count;
      data[idx + 2] = b / count;
    }
  }
}

/**
 * Floyd-Steinberg Dithering
 */
function floydSteinberg(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(oldR, oldG, oldB, palette)
        : quantizeColor(oldR, oldG, oldB);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(data, width, height, x + 1, y, errR, errG, errB, 7 / 16);
      distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
      distributeError(data, width, height, x, y + 1, errR, errG, errB, 5 / 16);
      distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
    }
  }

  return imageData;
}

/**
 * Atkinson Dithering
 */
function atkinson(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(oldR, oldG, oldB, palette)
        : quantizeColor(oldR, oldG, oldB);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      const factor = 1 / 8;
      distributeError(data, width, height, x + 1, y, errR, errG, errB, factor);
      distributeError(data, width, height, x + 2, y, errR, errG, errB, factor);
      distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, factor);
      distributeError(data, width, height, x, y + 1, errR, errG, errB, factor);
      distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, factor);
      distributeError(data, width, height, x, y + 2, errR, errG, errB, factor);
    }
  }

  return imageData;
}

/**
 * Jarvis, Judice, and Ninke Dithering
 */
function jarvisJudiceNinke(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(oldR, oldG, oldB, palette)
        : quantizeColor(oldR, oldG, oldB);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(data, width, height, x + 1, y, errR, errG, errB, 7 / 48);
      distributeError(data, width, height, x + 2, y, errR, errG, errB, 5 / 48);
      distributeError(data, width, height, x - 2, y + 1, errR, errG, errB, 3 / 48);
      distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 5 / 48);
      distributeError(data, width, height, x, y + 1, errR, errG, errB, 7 / 48);
      distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 5 / 48);
      distributeError(data, width, height, x + 2, y + 1, errR, errG, errB, 3 / 48);
      distributeError(data, width, height, x - 2, y + 2, errR, errG, errB, 1 / 48);
      distributeError(data, width, height, x - 1, y + 2, errR, errG, errB, 3 / 48);
      distributeError(data, width, height, x, y + 2, errR, errG, errB, 5 / 48);
      distributeError(data, width, height, x + 1, y + 2, errR, errG, errB, 3 / 48);
      distributeError(data, width, height, x + 2, y + 2, errR, errG, errB, 1 / 48);
    }
  }

  return imageData;
}

/**
 * Stucki Dithering
 */
function stucki(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(oldR, oldG, oldB, palette)
        : quantizeColor(oldR, oldG, oldB);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(data, width, height, x + 1, y, errR, errG, errB, 8 / 42);
      distributeError(data, width, height, x + 2, y, errR, errG, errB, 4 / 42);
      distributeError(data, width, height, x - 2, y + 1, errR, errG, errB, 2 / 42);
      distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 4 / 42);
      distributeError(data, width, height, x, y + 1, errR, errG, errB, 8 / 42);
      distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 4 / 42);
      distributeError(data, width, height, x + 2, y + 1, errR, errG, errB, 2 / 42);
      distributeError(data, width, height, x - 2, y + 2, errR, errG, errB, 1 / 42);
      distributeError(data, width, height, x - 1, y + 2, errR, errG, errB, 2 / 42);
      distributeError(data, width, height, x, y + 2, errR, errG, errB, 4 / 42);
      distributeError(data, width, height, x + 1, y + 2, errR, errG, errB, 2 / 42);
      distributeError(data, width, height, x + 2, y + 2, errR, errG, errB, 1 / 42);
    }
  }

  return imageData;
}

/**
 * Burkes Dithering
 */
function burkes(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(oldR, oldG, oldB, palette)
        : quantizeColor(oldR, oldG, oldB);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(data, width, height, x + 1, y, errR, errG, errB, 8 / 32);
      distributeError(data, width, height, x + 2, y, errR, errG, errB, 4 / 32);
      distributeError(data, width, height, x - 2, y + 1, errR, errG, errB, 2 / 32);
      distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 4 / 32);
      distributeError(data, width, height, x, y + 1, errR, errG, errB, 8 / 32);
      distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 4 / 32);
      distributeError(data, width, height, x + 2, y + 1, errR, errG, errB, 2 / 32);
    }
  }

  return imageData;
}

/**
 * Sierra Dithering
 */
function sierra(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(oldR, oldG, oldB, palette)
        : quantizeColor(oldR, oldG, oldB);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(data, width, height, x + 1, y, errR, errG, errB, 5 / 32);
      distributeError(data, width, height, x + 2, y, errR, errG, errB, 3 / 32);
      distributeError(data, width, height, x - 2, y + 1, errR, errG, errB, 2 / 32);
      distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 4 / 32);
      distributeError(data, width, height, x, y + 1, errR, errG, errB, 5 / 32);
      distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 4 / 32);
      distributeError(data, width, height, x + 2, y + 1, errR, errG, errB, 2 / 32);
      distributeError(data, width, height, x - 1, y + 2, errR, errG, errB, 2 / 32);
      distributeError(data, width, height, x, y + 2, errR, errG, errB, 3 / 32);
      distributeError(data, width, height, x + 1, y + 2, errR, errG, errB, 2 / 32);
    }
  }

  return imageData;
}

/**
 * Sierra Lite Dithering
 */
function sierraLite(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(oldR, oldG, oldB, palette)
        : quantizeColor(oldR, oldG, oldB);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      distributeError(data, width, height, x + 1, y, errR, errG, errB, 2 / 4);
      distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 1 / 4);
      distributeError(data, width, height, x, y + 1, errR, errG, errB, 1 / 4);
    }
  }

  return imageData;
}

/**
 * Ordered Dithering (Bayer Matrix)
 */
function orderedDithering(imageData: ImageData, matrixSize: number, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Bayer matrices
  const matrices: { [key: number]: number[][] } = {
    2: [[0, 2], [3, 1]],
    4: [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ],
    8: [
      [0, 32, 8, 40, 2, 34, 10, 42],
      [48, 16, 56, 24, 50, 18, 58, 26],
      [12, 44, 4, 36, 14, 46, 6, 38],
      [60, 28, 52, 20, 62, 30, 54, 22],
      [3, 35, 11, 43, 1, 33, 9, 41],
      [51, 19, 59, 27, 49, 17, 57, 25],
      [15, 47, 7, 39, 13, 45, 5, 37],
      [63, 31, 55, 23, 61, 29, 53, 21]
    ]
  };

  const matrix = matrices[matrixSize];
  const divisor = matrixSize * matrixSize;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const threshold = (matrix[y % matrixSize][x % matrixSize] / divisor - 0.5) * 255;

      let r = data[idx] + threshold;
      let g = data[idx + 1] + threshold;
      let b = data[idx + 2] + threshold;

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(r, g, b, palette)
        : quantizeColor(r, g, b);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;
    }
  }

  return imageData;
}

/**
 * Random Dithering
 */
function randomDithering(imageData: ImageData, threshold: number, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const randomThreshold = (Math.random() - 0.5) * threshold;

      let r = data[idx] + randomThreshold;
      let g = data[idx + 1] + randomThreshold;
      let b = data[idx + 2] + randomThreshold;

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(r, g, b, palette)
        : quantizeColor(r, g, b);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;
    }
  }

  return imageData;
}

/**
 * Halftone Pattern
 */
function halftonePattern(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const dotSize = 4;

  for (let y = 0; y < height; y += dotSize) {
    for (let x = 0; x < width; x += dotSize) {
      let avgR = 0, avgG = 0, avgB = 0, count = 0;

      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          avgR += data[idx];
          avgG += data[idx + 1];
          avgB += data[idx + 2];
          count++;
        }
      }

      avgR /= count;
      avgG /= count;
      avgB /= count;

      const luminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
      const radius = ((255 - luminance) / 255) * (dotSize / 2);

      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          const centerX = dotSize / 2;
          const centerY = dotSize / 2;
          const distance = Math.sqrt((dx - centerX) ** 2 + (dy - centerY) ** 2);

          let r, g, b;
          if (distance <= radius) {
            r = 0; g = 0; b = 0;
          } else {
            r = 255; g = 255; b = 255;
          }

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
        }
      }
    }
  }

  return imageData;
}

/**
 * Crosshatch Pattern
 */
function crosshatchPattern(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      let color = 255;

      if (luminance < 51) {
        color = 0;
      } else if (luminance < 102) {
        color = ((x % 4 === 0 || y % 4 === 0) || ((x + y) % 4 === 0)) ? 0 : 255;
      } else if (luminance < 153) {
        color = ((x % 4 === 0) || (y % 4 === 0)) ? 0 : 255;
      } else if (luminance < 204) {
        color = ((x + y) % 4 === 0) ? 0 : 255;
      }

      data[idx] = color;
      data[idx + 1] = color;
      data[idx + 2] = color;
    }
  }

  return imageData;
}

/**
 * Helpers
 */
function findClosestPaletteColor(r: number, g: number, b: number, palette: number[][]): number[] {
  let minDistance = Infinity;
  let closestColor = palette[0];

  for (const color of palette) {
    const distance = Math.sqrt(
      (r - color[0]) ** 2 +
      (g - color[1]) ** 2 +
      (b - color[2]) ** 2
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

function quantizeColor(r: number, g: number, b: number): number[] {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const value = luminance < 128 ? 0 : 255;
  return [value, value, value];
}

function distributeError(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  errR: number,
  errG: number,
  errB: number,
  factor: number
): void {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    const idx = (y * width + x) * 4;
    data[idx] = clamp(data[idx] + errR * factor);
    data[idx + 1] = clamp(data[idx + 1] + errG * factor);
    data[idx + 2] = clamp(data[idx + 2] + errB * factor);
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}
