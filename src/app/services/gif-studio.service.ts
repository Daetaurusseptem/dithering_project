import { Injectable, inject } from '@angular/core';
import { GifService, GifFrame, GifExportOptions } from './gif.service';

export type GifEffectType = 'scanline' | 'vhs' | 'noise' | 'phosphor' | 'rgb-split' | 'motion-sense';

export interface GifEffectOptions {
  effectType: GifEffectType;
  frameCount: number;
  fps: number;
  intensity: number;
  addPulse: boolean;
  addGlitch: boolean;
  loopCount: number;
  quality: number;
}

@Injectable({
  providedIn: 'root'
})
export class GifStudioService {
  private gifService = inject(GifService);

  async createLegacyEffectFrames(
    baseImageData: ImageData,
    options: GifEffectOptions,
    onProgress?: (progress: number) => void
  ): Promise<GifFrame[]> {
    let frames: GifFrame[];

    switch (options.effectType) {
      case 'scanline':
        frames = await this.gifService.createScanlineEffect(baseImageData, options.frameCount);
        break;
      case 'vhs':
        frames = await this.gifService.createVHSEffect(baseImageData, options.frameCount);
        break;
      case 'noise':
        frames = this.createNoiseEffect(baseImageData, options);
        break;
      case 'phosphor':
        frames = this.createPhosphorEffect(baseImageData, options);
        break;
      case 'rgb-split':
        frames = this.createRgbSplitEffect(baseImageData, options);
        break;
      case 'motion-sense':
        frames = this.createMotionSenseEffect(baseImageData, options);
        break;
      default:
        frames = await this.gifService.createScanlineEffect(baseImageData, options.frameCount);
    }

    return frames.map((frame, i) => {
      const progress = Math.floor((i + 1) / frames.length * 50);
      onProgress?.(progress);
      return frame;
    });
  }

  private createNoiseEffect(imageData: ImageData, options: GifEffectOptions): GifFrame[] {
    const frames: GifFrame[] = [];
    const delay = Math.floor(1000 / options.fps);

    for (let i = 0; i < options.frameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;

      ctx.putImageData(imageData, 0, 0);

      const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frameData.data;

      for (let j = 0; j < data.length; j += 4) {
        const noise = (Math.random() - 0.5) * options.intensity * 50;
        data[j] += noise;
        data[j + 1] += noise;
        data[j + 2] += noise;
      }

      ctx.putImageData(frameData, 0, 0);
      frames.push({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        delay
      });
    }

    return frames;
  }

  private createPhosphorEffect(imageData: ImageData, options: GifEffectOptions): GifFrame[] {
    const frames: GifFrame[] = [];
    const delay = Math.floor(1000 / options.fps);

    for (let i = 0; i < options.frameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;

      ctx.putImageData(imageData, 0, 0);
      const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frameData.data;

      const phase = (i / options.frameCount) * Math.PI * 2;
      const intensity = 0.5 + Math.sin(phase) * 0.5 * options.intensity;

      for (let j = 0; j < data.length; j += 4) {
        const green = data[j + 1];
        data[j] = data[j] * 0.3;
        data[j + 1] = Math.min(255, green * (1 + intensity * 0.5));
        data[j + 2] = data[j + 2] * 0.3;
      }

      ctx.putImageData(frameData, 0, 0);
      frames.push({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        delay
      });
    }

    return frames;
  }

  private createRgbSplitEffect(imageData: ImageData, options: GifEffectOptions): GifFrame[] {
    const frames: GifFrame[] = [];
    const delay = Math.floor(1000 / options.fps);

    for (let i = 0; i < options.frameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;

      const phase = (i / options.frameCount) * Math.PI * 2;
      const offsetX = Math.sin(phase) * options.intensity * 5;
      const offsetY = Math.cos(phase) * options.intensity * 5;

      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'sepia(1) hue-rotate(0deg)';
      ctx.putImageData(imageData, offsetX, 0);

      ctx.filter = 'sepia(1) hue-rotate(120deg)';
      ctx.putImageData(imageData, 0, 0);

      ctx.filter = 'sepia(1) hue-rotate(240deg)';
      ctx.putImageData(imageData, -offsetX, offsetY);

      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';

      frames.push({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        delay
      });
    }

    return frames;
  }

  private createMotionSenseEffect(imageData: ImageData, options: GifEffectOptions): GifFrame[] {
    const frames: GifFrame[] = [];
    const delay = Math.floor(1000 / options.fps);

    for (let i = 0; i < options.frameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;

      const phase = (i / options.frameCount) * Math.PI * 2;
      const direction = Math.sin(phase);
      const blurAmount = Math.abs(direction) * options.intensity * 10;

      const layers = 5;
      ctx.globalAlpha = 1 / layers;

      for (let layer = 0; layer < layers; layer++) {
        const offset = (layer / layers) * direction * options.intensity * 15;
        ctx.filter = `blur(${blurAmount / layers}px)`;
        ctx.putImageData(imageData, offset, 0);
      }

      ctx.filter = 'none';
      ctx.globalAlpha = 1;

      frames.push({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        delay
      });
    }

    return frames;
  }

  scaleImageDataForPreview(imageData: ImageData, scale: number): ImageData {
    if (scale >= 1.0) return imageData;

    const scaledWidth = Math.floor(imageData.width * scale);
    const scaledHeight = Math.floor(imageData.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = scaledWidth;
    scaledCanvas.height = scaledHeight;
    const scaledCtx = scaledCanvas.getContext('2d')!;
    scaledCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);

    return scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight);
  }

  calculateGifDimensions(width: number, height: number, hdMode: boolean): { width: number; height: number } {
    if (hdMode) return { width, height };

    const MAX_GIF_DIM = 600;
    if (width > MAX_GIF_DIM || height > MAX_GIF_DIM) {
      const scale = Math.min(MAX_GIF_DIM / width, MAX_GIF_DIM / height);
      return {
        width: Math.round(width * scale),
        height: Math.round(height * scale)
      };
    }

    return { width, height };
  }

  async exportGif(
    frames: GifFrame[],
    options: {
      quality: number;
      loopCount: number;
      width: number;
      height: number;
    },
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    return this.gifService.exportAsGif(
      frames,
      {
        quality: options.quality,
        workers: 2,
        repeat: options.loopCount,
        width: options.width,
        height: options.height
      },
      onProgress
    );
  }
}
