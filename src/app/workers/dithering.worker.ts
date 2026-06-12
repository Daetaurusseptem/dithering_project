/// <reference lib="webworker" />

import { DitheringOptions } from '../dithering-core/types';
import { ERROR_DIFFUSION_KERNELS } from '../dithering-core/error-diffusion-kernels';
import {
  applyErrorDiffusion,
  applyOrderedDithering,
  applyRandomDithering,
  applyHalftonePattern,
  applyCrosshatchPattern
} from '../dithering-core/dithering-algorithms';
import { clamp } from '../dithering-core/helpers';
import { DitheringRequest } from './dithering.worker.types';

export interface DitheringResponse {
  imageData: ImageData;
  id: string;
}

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
  } catch (error: any) {
    console.error('👷 Worker error:', error);
    postMessage({
      imageData: data.imageData,
      id: data.id,
      error: error.message
    });
  }
});

function applyDithering(imageData: ImageData, options: DitheringOptions): ImageData {
  const processed = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  applyImageAdjustments(processed, options);

  if (options.blur > 0) {
    applyBlur(processed, options.blur);
  }

  const palette = options.paletteColors || null;

  switch (options.algorithm) {
    case 'floyd-steinberg':
    case 'atkinson':
    case 'jarvis-judice-ninke':
    case 'stucki':
    case 'burkes':
    case 'sierra':
    case 'sierra-lite': {
      const kernel = ERROR_DIFFUSION_KERNELS[options.algorithm];
      return applyErrorDiffusion(processed, kernel, palette);
    }
    case 'ordered-2x2':
      return applyOrderedDithering(processed, 2, palette);
    case 'ordered-4x4':
      return applyOrderedDithering(processed, 4, palette);
    case 'ordered-8x8':
      return applyOrderedDithering(processed, 8, palette);
    case 'random':
      return applyRandomDithering(processed, options.threshold || 128, palette);
    case 'pattern-halftone':
      return applyHalftonePattern(processed, palette);
    case 'pattern-crosshatch':
      return applyCrosshatchPattern(processed, palette);
    default:
      return applyErrorDiffusion(processed, ERROR_DIFFUSION_KERNELS['floyd-steinberg'], palette);
  }
}

function applyImageAdjustments(imageData: ImageData, options: DitheringOptions): void {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (options.contrast !== 50) {
      const contrast = (options.contrast - 50) * 2.55;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      r = clamp(factor * (r - 128) + 128);
      g = clamp(factor * (g - 128) + 128);
      b = clamp(factor * (b - 128) + 128);
    }

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    const midtonesFactor = (options.midtones - 50) / 50;
    if (midtonesFactor !== 0) {
      if (luminance > 64 && luminance < 192) {
        r = clamp(r + midtonesFactor * 30);
        g = clamp(g + midtonesFactor * 30);
        b = clamp(b + midtonesFactor * 30);
      }
    }

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
