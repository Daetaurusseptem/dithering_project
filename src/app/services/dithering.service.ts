import { Injectable, inject } from '@angular/core';
import { WebGLDitheringService } from './webgl-dithering.service';
import { DitheringOptions } from '../dithering-core/types';
import { COLOR_PALETTES, hexToRgb } from '../dithering-core/palettes';
import { ERROR_DIFFUSION_KERNELS } from '../dithering-core/error-diffusion-kernels';
import {
  applyErrorDiffusion,
  applyOrderedDithering,
  applyRandomDithering,
  applyHalftonePattern,
  applyCrosshatchPattern
} from '../dithering-core/dithering-algorithms';
import { clamp } from '../dithering-core/helpers';

export type { DitheringOptions } from '../dithering-core/types';

@Injectable({
  providedIn: 'root'
})
export class DitheringService {
  private webglDitheringService = inject(WebGLDitheringService);
  private colorPalettes: { [key: string]: number[][] } = { ...COLOR_PALETTES };

  constructor() {
    this.initWorker();
  }

  private worker: Worker | null = null;
  private workerCallbacks: { [key: string]: { resolve: (val: ImageData) => void, reject: (err: any) => void } } = {};

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('../workers/dithering.worker', import.meta.url));
        this.worker.onmessage = ({ data }) => {
          if (this.workerCallbacks[data.id]) {
            if (data.error) {
              this.workerCallbacks[data.id].reject(data.error);
            } else {
              this.workerCallbacks[data.id].resolve(data.imageData);
            }
            delete this.workerCallbacks[data.id];
          }
        };
      } catch (e) {
        console.error('⚠️ Could not initialize Web Worker:', e);
      }
    } else {
      console.warn('⚠️ Web Workers are not supported in this environment.');
    }
  }

  async applyDitheringAsync(imageData: ImageData, options: DitheringOptions): Promise<ImageData> {
    if (this.webglDitheringService.isAvailable()) {
      const webglResult = this.webglDitheringService.applyDithering(imageData, options);
      if (webglResult) {
        console.log('⚡ WebGL dithering used for', options.algorithm);
        return webglResult;
      }
    }

    if (this.worker) {
      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        this.workerCallbacks[id] = { resolve, reject };

        const paletteColors = options.palette ? this.colorPalettes[options.palette] : undefined;

        this.worker!.postMessage({
          imageData,
          options: {
            ...options,
            paletteColors
          },
          id
        });
      });
    }

    console.warn('⚠️ Web Worker not available, falling back to main thread CPU dithering');
    return this.applyDithering(imageData, options);
  }

  addCustomPalette(id: string, colors: string[]): void {
    this.colorPalettes[id] = colors.map(hex => hexToRgb(hex));
  }

  getAvailableAlgorithms(): { id: string; name: string; category: string }[] {
    return [
      { id: 'floyd-steinberg', name: 'Floyd-Steinberg', category: 'Error Diffusion' },
      { id: 'atkinson', name: 'Atkinson', category: 'Error Diffusion' },
      { id: 'jarvis-judice-ninke', name: 'Jarvis, Judice & Ninke', category: 'Error Diffusion' },
      { id: 'stucki', name: 'Stucki', category: 'Error Diffusion' },
      { id: 'burkes', name: 'Burkes', category: 'Error Diffusion' },
      { id: 'sierra', name: 'Sierra', category: 'Error Diffusion' },
      { id: 'sierra-lite', name: 'Sierra Lite', category: 'Error Diffusion' },
      { id: 'ordered-2x2', name: 'Ordered 2x2', category: 'Ordered' },
      { id: 'ordered-4x4', name: 'Ordered 4x4', category: 'Ordered' },
      { id: 'ordered-8x8', name: 'Ordered 8x8', category: 'Ordered' },
      { id: 'random', name: 'Random', category: 'Ordered' },
      { id: 'pattern-halftone', name: 'Halftone Pattern', category: 'Pattern' },
      { id: 'pattern-crosshatch', name: 'Crosshatch Pattern', category: 'Pattern' }
    ];
  }

  getAvailablePalettes(): { id: string; name: string }[] {
    return [
      { id: 'monochrome', name: 'Monochrome' },
      { id: 'gameboy', name: 'Game Boy' },
      { id: 'cga', name: 'CGA' },
      { id: 'commodore64', name: 'Commodore 64' },
      { id: 'apple2', name: 'Apple II' },
      { id: 'pico8', name: 'PICO-8' },
      { id: 'nes', name: 'NES' },
      { id: 'zxspectrum', name: 'ZX Spectrum' },
      { id: 'dmg', name: 'DMG (Game Boy)' }
    ];
  }

  getPaletteColors(paletteId: string): number[][] | null {
    return this.colorPalettes[paletteId] || null;
  }

  applyDithering(imageData: ImageData, options: DitheringOptions): ImageData {
    if (this.webglDitheringService.isAvailable()) {
      const webglResult = this.webglDitheringService.applyDithering(imageData, options);
      if (webglResult) {
        console.log('⚡ WebGL dithering used for', options.algorithm);
        return webglResult;
      }
    }

    console.log('🖥️ CPU dithering used for', options.algorithm);
    const processed = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    this.applyImageAdjustments(processed, options);

    if (options.blur > 0) {
      this.applyBlur(processed, options.blur);
    }

    const palette = options.palette ? this.colorPalettes[options.palette] : null;

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

  private applyImageAdjustments(imageData: ImageData, options: DitheringOptions): void {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      const contrast = (options.contrast - 50) * 2.55;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      r = clamp(factor * (r - 128) + 128);
      g = clamp(factor * (g - 128) + 128);
      b = clamp(factor * (b - 128) + 128);

      const midtonesFactor = (options.midtones - 50) / 50;
      if (midtonesFactor !== 0) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance > 64 && luminance < 192) {
          r = clamp(r + midtonesFactor * 30);
          g = clamp(g + midtonesFactor * 30);
          b = clamp(b + midtonesFactor * 30);
        }
      }

      const highlightsFactor = (options.highlights - 50) / 50;
      if (highlightsFactor !== 0) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
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

  private applyBlur(imageData: ImageData, radius: number): void {
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
}
