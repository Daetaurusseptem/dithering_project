import { Injectable, inject } from '@angular/core';
import { WebGLDitheringService } from './webgl-dithering.service';

export interface DitheringOptions {
  algorithm: string;
  scale: number;
  contrast: number;
  midtones: number;
  highlights: number;
  blur: number;
  palette?: string;
  threshold?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DitheringService {
  private webglDitheringService = inject(WebGLDitheringService);

  // Paletas de color predefinidas (retro shading)
  private colorPalettes: { [key: string]: number[][] } = {
    'monochrome': [[0, 0, 0], [255, 255, 255]],
    'gameboy': [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
    'cga': [[0, 0, 0], [0, 255, 255], [255, 0, 255], [255, 255, 255]],
    'commodore64': [[0, 0, 0], [255, 255, 255], [136, 0, 0], [170, 255, 238]],
    'apple2': [[0, 0, 0], [114, 38, 64], [64, 51, 127], [228, 52, 254], [14, 89, 64], [128, 128, 128], [27, 154, 254], [191, 179, 255], [64, 76, 0], [228, 101, 1], [128, 128, 128], [241, 166, 191], [27, 203, 1], [191, 204, 128], [141, 217, 191], [255, 255, 255]]
  };

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

  /**
   * Applies dithering using Web Worker (Async)
   */
  async applyDitheringAsync(imageData: ImageData, options: DitheringOptions): Promise<ImageData> {
    // Try WebGL first (it's fast and on main thread but GPU accelerated)
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

        // Pass palette colors explicitly to worker to avoid complex object passing
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

    // Fallback to sync CPU
    console.warn('⚠️ Web Worker not available, falling back to main thread CPU dithering');
    return this.applyDithering(imageData, options);
  }


  /**
   * Agrega una paleta personalizada
   */
  addCustomPalette(id: string, colors: string[]): void {
    this.colorPalettes[id] = colors.map(hex => this.hexToRgb(hex));
  }

  /**
   * Convierte color hexadecimal a RGB
   */
  private hexToRgb(hex: string): number[] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  /**
   * Procesa una imagen aplicando el algoritmo de dithering seleccionado
   */
  applyDithering(
    imageData: ImageData,
    options: DitheringOptions
  ): ImageData {
    // Try WebGL first for performance
    if (this.webglDitheringService.isAvailable()) {
      const webglResult = this.webglDitheringService.applyDithering(imageData, options);
      if (webglResult) {
        console.log('⚡ WebGL dithering used for', options.algorithm);
        return webglResult;
      }
    }

    // CPU fallback
    console.log('🖥️ CPU dithering used for', options.algorithm);
    const processed = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    // Aplicar ajustes de imagen primero
    this.applyImageAdjustments(processed, options);

    // Aplicar blur si es necesario
    if (options.blur > 0) {
      this.applyBlur(processed, options.blur);
    }

    // Obtener paleta de colores
    const palette = options.palette ? this.colorPalettes[options.palette] : null;

    // Aplicar el algoritmo de dithering correspondiente
    switch (options.algorithm) {
      case 'floyd-steinberg':
        return this.floydSteinberg(processed, palette);
      case 'atkinson':
        return this.atkinson(processed, palette);
      case 'jarvis-judice-ninke':
        return this.jarvisJudiceNinke(processed, palette);
      case 'stucki':
        return this.stucki(processed, palette);
      case 'burkes':
        return this.burkes(processed, palette);
      case 'sierra':
        return this.sierra(processed, palette);
      case 'sierra-lite':
        return this.sierraLite(processed, palette);
      case 'ordered-2x2':
        return this.orderedDithering(processed, 2, palette);
      case 'ordered-4x4':
        return this.orderedDithering(processed, 4, palette);
      case 'ordered-8x8':
        return this.orderedDithering(processed, 8, palette);
      case 'random':
        return this.randomDithering(processed, options.threshold || 128, palette);
      case 'pattern-halftone':
        return this.halftonePattern(processed, palette);
      case 'pattern-crosshatch':
        return this.crosshatchPattern(processed, palette);
      default:
        return this.floydSteinberg(processed, palette);
    }
  }

  /**
   * Aplica ajustes de imagen (contraste, medios tonos, highlights)
   */
  private applyImageAdjustments(imageData: ImageData, options: DitheringOptions): void {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Aplicar contraste
      const contrast = (options.contrast - 50) * 2.55;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      r = this.clamp(factor * (r - 128) + 128);
      g = this.clamp(factor * (g - 128) + 128);
      b = this.clamp(factor * (b - 128) + 128);

      // Aplicar ajuste de medios tonos
      const midtonesFactor = (options.midtones - 50) / 50;
      if (midtonesFactor !== 0) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance > 64 && luminance < 192) {
          r = this.clamp(r + midtonesFactor * 30);
          g = this.clamp(g + midtonesFactor * 30);
          b = this.clamp(b + midtonesFactor * 30);
        }
      }

      // Aplicar ajuste de highlights
      const highlightsFactor = (options.highlights - 50) / 50;
      if (highlightsFactor !== 0) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance > 192) {
          r = this.clamp(r + highlightsFactor * 30);
          g = this.clamp(g + highlightsFactor * 30);
          b = this.clamp(b + highlightsFactor * 30);
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

  /**
   * Floyd-Steinberg Dithering (Error Diffusion clásico)
   */
  private floydSteinberg(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor(oldR, oldG, oldB, palette)
          : this.quantizeColor(oldR, oldG, oldB);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Distribuir error a píxeles vecinos
        this.distributeError(data, width, height, x + 1, y, errR, errG, errB, 7 / 16);
        this.distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
        this.distributeError(data, width, height, x, y + 1, errR, errG, errB, 5 / 16);
        this.distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
      }
    }

    return imageData;
  }

  /**
   * Atkinson Dithering (Usado en Macintosh clásico)
   */
  private atkinson(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor(oldR, oldG, oldB, palette)
          : this.quantizeColor(oldR, oldG, oldB);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Atkinson distribuye 6/8 del error (más suave)
        const factor = 1 / 8;
        this.distributeError(data, width, height, x + 1, y, errR, errG, errB, factor);
        this.distributeError(data, width, height, x + 2, y, errR, errG, errB, factor);
        this.distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, factor);
        this.distributeError(data, width, height, x, y + 1, errR, errG, errB, factor);
        this.distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, factor);
        this.distributeError(data, width, height, x, y + 2, errR, errG, errB, factor);
      }
    }

    return imageData;
  }

  /**
   * Jarvis, Judice, and Ninke Dithering
   */
  private jarvisJudiceNinke(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor(oldR, oldG, oldB, palette)
          : this.quantizeColor(oldR, oldG, oldB);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Distribución JJN (más amplia)
        this.distributeError(data, width, height, x + 1, y, errR, errG, errB, 7 / 48);
        this.distributeError(data, width, height, x + 2, y, errR, errG, errB, 5 / 48);
        this.distributeError(data, width, height, x - 2, y + 1, errR, errG, errB, 3 / 48);
        this.distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 5 / 48);
        this.distributeError(data, width, height, x, y + 1, errR, errG, errB, 7 / 48);
        this.distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 5 / 48);
        this.distributeError(data, width, height, x + 2, y + 1, errR, errG, errB, 3 / 48);
        this.distributeError(data, width, height, x - 2, y + 2, errR, errG, errB, 1 / 48);
        this.distributeError(data, width, height, x - 1, y + 2, errR, errG, errB, 3 / 48);
        this.distributeError(data, width, height, x, y + 2, errR, errG, errB, 5 / 48);
        this.distributeError(data, width, height, x + 1, y + 2, errR, errG, errB, 3 / 48);
        this.distributeError(data, width, height, x + 2, y + 2, errR, errG, errB, 1 / 48);
      }
    }

    return imageData;
  }

  /**
   * Stucki Dithering
   */
  private stucki(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor(oldR, oldG, oldB, palette)
          : this.quantizeColor(oldR, oldG, oldB);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        this.distributeError(data, width, height, x + 1, y, errR, errG, errB, 8 / 42);
        this.distributeError(data, width, height, x + 2, y, errR, errG, errB, 4 / 42);
        this.distributeError(data, width, height, x - 2, y + 1, errR, errG, errB, 2 / 42);
        this.distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 4 / 42);
        this.distributeError(data, width, height, x, y + 1, errR, errG, errB, 8 / 42);
        this.distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 4 / 42);
        this.distributeError(data, width, height, x + 2, y + 1, errR, errG, errB, 2 / 42);
        this.distributeError(data, width, height, x - 2, y + 2, errR, errG, errB, 1 / 42);
        this.distributeError(data, width, height, x - 1, y + 2, errR, errG, errB, 2 / 42);
        this.distributeError(data, width, height, x, y + 2, errR, errG, errB, 4 / 42);
        this.distributeError(data, width, height, x + 1, y + 2, errR, errG, errB, 2 / 42);
        this.distributeError(data, width, height, x + 2, y + 2, errR, errG, errB, 1 / 42);
      }
    }

    return imageData;
  }

  /**
   * Burkes Dithering
   */
  private burkes(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor(oldR, oldG, oldB, palette)
          : this.quantizeColor(oldR, oldG, oldB);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        this.distributeError(data, width, height, x + 1, y, errR, errG, errB, 8 / 32);
        this.distributeError(data, width, height, x + 2, y, errR, errG, errB, 4 / 32);
        this.distributeError(data, width, height, x - 2, y + 1, errR, errG, errB, 2 / 32);
        this.distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 4 / 32);
        this.distributeError(data, width, height, x, y + 1, errR, errG, errB, 8 / 32);
        this.distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 4 / 32);
        this.distributeError(data, width, height, x + 2, y + 1, errR, errG, errB, 2 / 32);
      }
    }

    return imageData;
  }

  /**
   * Sierra Dithering
   */
  private sierra(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor(oldR, oldG, oldB, palette)
          : this.quantizeColor(oldR, oldG, oldB);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        this.distributeError(data, width, height, x + 1, y, errR, errG, errB, 5 / 32);
        this.distributeError(data, width, height, x + 2, y, errR, errG, errB, 3 / 32);
        this.distributeError(data, width, height, x - 2, y + 1, errR, errG, errB, 2 / 32);
        this.distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 4 / 32);
        this.distributeError(data, width, height, x, y + 1, errR, errG, errB, 5 / 32);
        this.distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 4 / 32);
        this.distributeError(data, width, height, x + 2, y + 1, errR, errG, errB, 2 / 32);
        this.distributeError(data, width, height, x - 1, y + 2, errR, errG, errB, 2 / 32);
        this.distributeError(data, width, height, x, y + 2, errR, errG, errB, 3 / 32);
        this.distributeError(data, width, height, x + 1, y + 2, errR, errG, errB, 2 / 32);
      }
    }

    return imageData;
  }

  /**
   * Sierra Lite Dithering (más rápido)
   */
  private sierraLite(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor(oldR, oldG, oldB, palette)
          : this.quantizeColor(oldR, oldG, oldB);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        this.distributeError(data, width, height, x + 1, y, errR, errG, errB, 2 / 4);
        this.distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 1 / 4);
        this.distributeError(data, width, height, x, y + 1, errR, errG, errB, 1 / 4);
      }
    }

    return imageData;
  }

  /**
   * Ordered Dithering (Bayer Matrix)
   */
  private orderedDithering(imageData: ImageData, matrixSize: number, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor(r, g, b, palette)
          : this.quantizeColor(r, g, b);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;
      }
    }

    return imageData;
  }

  /**
   * Random Dithering (White Noise)
   */
  private randomDithering(imageData: ImageData, threshold: number, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor(r, g, b, palette)
          : this.quantizeColor(r, g, b);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;
      }
    }

    return imageData;
  }

  /**
   * Halftone Pattern Dithering
   */
  private halftonePattern(imageData: ImageData, palette: number[][] | null): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const dotSize = 4;

    for (let y = 0; y < height; y += dotSize) {
      for (let x = 0; x < width; x += dotSize) {
        let avgR = 0, avgG = 0, avgB = 0, count = 0;

        // Calcular promedio del bloque
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

        // Dibujar círculo
        for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
          for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const centerX = dotSize / 2;
            const centerY = dotSize / 2;
            const distance = Math.sqrt((dx - centerX) ** 2 + (dy - centerY) ** 2);

            if (distance <= radius) {
              data[idx] = 0;
              data[idx + 1] = 0;
              data[idx + 2] = 0;
            } else {
              data[idx] = 255;
              data[idx + 1] = 255;
              data[idx + 2] = 255;
            }
          }
        }
      }
    }

    return imageData;
  }

  /**
   * Crosshatch Pattern Dithering
   */
  private crosshatchPattern(imageData: ImageData, palette: number[][] | null): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        let color = 255;

        // Patrones de crosshatch según luminosidad
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
   * Encuentra el color más cercano en la paleta
   */
  private findClosestPaletteColor(r: number, g: number, b: number, palette: number[][]): number[] {
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

  /**
   * Cuantiza un color (reducción simple a blanco/negro)
   */
  private quantizeColor(r: number, g: number, b: number): number[] {
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const value = luminance < 128 ? 0 : 255;
    return [value, value, value];
  }

  /**
   * Distribuye el error a un píxel vecino
   */
  private distributeError(
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
      data[idx] = this.clamp(data[idx] + errR * factor);
      data[idx + 1] = this.clamp(data[idx + 1] + errG * factor);
      data[idx + 2] = this.clamp(data[idx + 2] + errB * factor);
    }
  }

  /**
   * Limita un valor entre 0 y 255
   */
  private clamp(value: number): number {
    return Math.max(0, Math.min(255, value));
  }

  /**
   * Obtiene la lista de algoritmos disponibles
   */
  getAvailableAlgorithms(): { id: string; name: string; category: string }[] {
    return [
      { id: 'floyd-steinberg', name: 'Floyd-Steinberg', category: 'Error Diffusion' },
      { id: 'atkinson', name: 'Atkinson', category: 'Error Diffusion' },
      { id: 'jarvis-judice-ninke', name: 'Jarvis-Judice-Ninke', category: 'Error Diffusion' },
      { id: 'stucki', name: 'Stucki', category: 'Error Diffusion' },
      { id: 'burkes', name: 'Burkes', category: 'Error Diffusion' },
      { id: 'sierra', name: 'Sierra', category: 'Error Diffusion' },
      { id: 'sierra-lite', name: 'Sierra Lite', category: 'Error Diffusion' },
      { id: 'ordered-2x2', name: 'Ordered 2x2', category: 'Ordered Dithering' },
      { id: 'ordered-4x4', name: 'Ordered 4x4', category: 'Ordered Dithering' },
      { id: 'ordered-8x8', name: 'Ordered 8x8', category: 'Ordered Dithering' },
      { id: 'random', name: 'Random', category: 'Pattern Dithering' },
      { id: 'pattern-halftone', name: 'Halftone', category: 'Pattern Dithering' },
      { id: 'pattern-crosshatch', name: 'Crosshatch', category: 'Pattern Dithering' }
    ];
  }

  /**
   * Obtiene la lista de paletas disponibles
   */
  getAvailablePalettes(): { id: string; name: string }[] {
    return [
      { id: 'monochrome', name: 'Monochrome' },
      { id: 'gameboy', name: 'Game Boy' },
      { id: 'cga', name: 'CGA' },
      { id: 'commodore64', name: 'Commodore 64' },
      { id: 'apple2', name: 'Apple II' }
    ];
  }

  /**
   * Obtiene los colores de una paleta específica en formato hex
   */
  getPaletteColors(paletteId: string): string[] {
    const palette = this.colorPalettes[paletteId];
    if (!palette) return [];

    return palette.map(rgb => this.rgbToHex(rgb[0], rgb[1], rgb[2]));
  }

  /**
   * Convierte RGB a formato hexadecimal
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
}
