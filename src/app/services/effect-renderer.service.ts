import { Injectable, inject, Injector } from '@angular/core';
import { WebGLFlameService } from './webgl-flame.service';
import { WebGLParticlesService } from './webgl-particles.service';
import { WebGLMotionService } from './webgl-motion.service';
import { WebGLCRTService } from './webgl-crt.service';
import { DitheringService } from './dithering.service';
import { DitheringOptions } from '../dithering-core/types';
import { GifFrame } from './gif.service';
import { EffectLayer, EffectType } from '../models/effect-layer.interface';

@Injectable({ providedIn: 'root' })
export class EffectRendererService {
  private injector = inject(Injector);
  private _webglFlameService?: WebGLFlameService;
  private _webglParticlesService?: WebGLParticlesService;
  private _webglMotionService?: WebGLMotionService;
  private _webglCRTService?: WebGLCRTService;

  private get webglFlameService(): WebGLFlameService {
    if (!this._webglFlameService) {
      this._webglFlameService = this.injector.get(WebGLFlameService);
    }
    return this._webglFlameService;
  }

  private get webglParticlesService(): WebGLParticlesService {
    if (!this._webglParticlesService) {
      this._webglParticlesService = this.injector.get(WebGLParticlesService);
    }
    return this._webglParticlesService;
  }

  private get webglMotionService(): WebGLMotionService {
    if (!this._webglMotionService) {
      this._webglMotionService = this.injector.get(WebGLMotionService);
    }
    return this._webglMotionService;
  }

  private get webglCRTService(): WebGLCRTService {
    if (!this._webglCRTService) {
      this._webglCRTService = this.injector.get(WebGLCRTService);
    }
    return this._webglCRTService;
  }

  private ditheringService = inject(DitheringService);

  private customParticleSpriteCache: Map<string, HTMLImageElement> = new Map();

  async createLayeredEffectFrames(
    baseImageData: ImageData,
    layers: EffectLayer[],
    frameCount: number,
    fps: number,
    onProgress?: (progress: number) => void
  ): Promise<GifFrame[]> {
    const delay = Math.floor(1000 / fps);
    const frames: GifFrame[] = [];

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
      const canvas = document.createElement('canvas');
      canvas.width = baseImageData.width;
      canvas.height = baseImageData.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      ctx.putImageData(baseImageData, 0, 0);
      let currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      for (const layer of layers) {
        if (!layer.enabled) continue;
        currentImageData = this.applyLayerEffect(currentImageData, layer, frameIndex, frameCount);
        ctx.putImageData(currentImageData, 0, 0);
        currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }

      frames.push({ imageData: currentImageData, delay });
      const progress = Math.floor((frameIndex + 1) / frameCount * 50);
      onProgress?.(progress);
    }

    return frames;
  }

  applyLayerEffect(
    imageData: ImageData,
    layer: EffectLayer,
    frameIndex: number,
    totalFrames: number
  ): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.putImageData(imageData, 0, 0);

    const phase = frameIndex / totalFrames;

    switch (layer.type) {
      case 'scanline':
        this.applyScanlineLayer(ctx, imageData, layer, phase);
        break;
      case 'vhs':
        this.applyVHSLayer(ctx, imageData, layer, phase);
        break;
      case 'noise':
        this.applyNoiseLayer(ctx, imageData, layer);
        break;
      case 'phosphor':
        this.applyPhosphorLayer(ctx, imageData, layer, phase);
        break;
      case 'rgb-split':
        this.applyRGBSplitLayer(ctx, imageData, layer, phase);
        break;
      case 'motion-sense':
        this.applyMotionSenseLayer(ctx, imageData, layer, phase);
        break;
      case 'particles':
        this.applyParticlesLayer(ctx, imageData, layer, phase);
        break;
      case 'flames':
        this.applyFlamesLayer(ctx, imageData, layer, phase);
        break;
    }

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private applyScanlineLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const result = this.webglCRTService.applyCRTEffect(imageData, {
      intensity: layer.intensity,
      scanlineThickness: layer.options.scanlineThickness || 2,
      scanlineSpacing: layer.options.scanlineSpacing || 4,
      curvature: layer.options.scanlineCurvature ?? 0.08,
      vignette: layer.options.scanlineVignette ?? 0.5,
      chromaticAberration: layer.options.scanlineChromaticAberration ?? 2,
      phosphorGlow: layer.options.scanlinePhosphorGlow ?? 0.3,
      brightness: layer.options.scanlineBrightness ?? 1.0,
      contrast: layer.options.scanlineContrast ?? 1.1
    }, phase);

    if (result) {
      ctx.putImageData(result, 0, 0);
      return;
    }

    const data = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const thickness = layer.options.scanlineThickness || 2;
    const spacing = layer.options.scanlineSpacing || 4;
    const offset = Math.floor(phase * spacing) % spacing;

    for (let y = offset; y < imageData.height; y += spacing) {
      for (let t = 0; t < thickness && y + t < imageData.height; t++) {
        for (let x = 0; x < imageData.width; x++) {
          const idx = ((y + t) * imageData.width + x) * 4;
          data.data[idx] *= (1 - layer.intensity * 0.7);
          data.data[idx + 1] *= (1 - layer.intensity * 0.7);
          data.data[idx + 2] *= (1 - layer.intensity * 0.7);
        }
      }
    }

    ctx.putImageData(data, 0, 0);
  }

  private applyVHSLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const data = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const distortion = layer.options.vhsDistortion || 5;
    const lineThickness = layer.options.vhsLineThickness || 2;
    const bleedRed = layer.options.vhsBleedRed ?? -3;
    const bleedGreen = layer.options.vhsBleedGreen ?? 0;
    const bleedBlue = layer.options.vhsBleedBlue ?? 3;
    const trackingNoise = layer.options.vhsTrackingNoise || 2;

    for (let y = 0; y < imageData.height; y++) {
      const offset = Math.sin(y * 0.1 + phase) * distortion * layer.intensity;
      const shift = Math.floor(offset);
      const hasTrackingNoise = Math.random() < (trackingNoise * 0.01);

      if (Math.abs(shift) > 0 || hasTrackingNoise) {
        for (let lineOffset = 0; lineOffset < lineThickness; lineOffset++) {
          const currentY = y + lineOffset;
          if (currentY >= imageData.height) break;

          for (let x = 0; x < imageData.width; x++) {
            const srcX = Math.max(0, Math.min(imageData.width - 1, x + shift));
            const dstIdx = (currentY * imageData.width + x) * 4;

            const redSrcX = Math.max(0, Math.min(imageData.width - 1, srcX + bleedRed));
            const greenSrcX = Math.max(0, Math.min(imageData.width - 1, srcX + bleedGreen));
            const blueSrcX = Math.max(0, Math.min(imageData.width - 1, srcX + bleedBlue));

            const redIdx = (currentY * imageData.width + redSrcX) * 4;
            const greenIdx = (currentY * imageData.width + greenSrcX) * 4;
            const blueIdx = (currentY * imageData.width + blueSrcX) * 4;

            data.data[dstIdx] = data.data[redIdx];
            data.data[dstIdx + 1] = data.data[greenIdx + 1];
            data.data[dstIdx + 2] = data.data[blueIdx + 2];

            if (hasTrackingNoise) {
              const noise = Math.random() * 100;
              data.data[dstIdx] = noise;
              data.data[dstIdx + 1] = noise;
              data.data[dstIdx + 2] = noise;
            }
          }
        }
        y += lineThickness - 1;
      }
    }

    ctx.putImageData(data, 0, 0);
  }

  private applyNoiseLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer) {
    const data = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const noiseSize = layer.options.noiseSize || 1;
    const noiseStrength = layer.intensity * 50;

    for (let i = 0; i < data.data.length; i += 4 * noiseSize) {
      const noise = (Math.random() - 0.5) * noiseStrength;
      data.data[i] = Math.max(0, Math.min(255, data.data[i] + noise));
      data.data[i + 1] = Math.max(0, Math.min(255, data.data[i + 1] + noise));
      data.data[i + 2] = Math.max(0, Math.min(255, data.data[i + 2] + noise));
    }

    ctx.putImageData(data, 0, 0);
  }

  private applyPhosphorLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const data = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const decay = layer.options.phosphorDecay || 0.7;
    const glow = layer.options.phosphorGlow || 0.5;
    const intensity = 0.5 + Math.sin(phase) * 0.5 * layer.intensity;

    for (let i = 0; i < data.data.length; i += 4) {
      const green = data.data[i + 1];
      data.data[i] *= (1 - intensity * (1 - decay) * 0.7);
      data.data[i + 1] = Math.min(255, green * (1 + intensity * glow));
      data.data[i + 2] *= (1 - intensity * (1 - decay) * 0.7);
    }

    ctx.putImageData(data, 0, 0);
  }

  private applyRGBSplitLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const direction = layer.options.rgbSplitDirection || 'horizontal';
    const amount = layer.options.rgbSplitAmount || 3;
    const intensity = layer.intensity * amount;

    let offsetX = 0, offsetY = 0;

    switch (direction) {
      case 'horizontal':
        offsetX = Math.sin(phase) * intensity;
        break;
      case 'vertical':
        offsetY = Math.sin(phase) * intensity;
        break;
      case 'diagonal':
        offsetX = Math.sin(phase) * intensity;
        offsetY = Math.cos(phase) * intensity;
        break;
    }

    const originalData = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const result = ctx.createImageData(imageData.width, imageData.height);

    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const idx = (y * imageData.width + x) * 4;

        const rX = Math.max(0, Math.min(imageData.width - 1, Math.floor(x + offsetX)));
        const rIdx = (y * imageData.width + rX) * 4;
        result.data[idx] = originalData.data[rIdx];

        result.data[idx + 1] = originalData.data[idx + 1];

        const bX = Math.max(0, Math.min(imageData.width - 1, Math.floor(x - offsetX)));
        const bY = Math.max(0, Math.min(imageData.height - 1, Math.floor(y + offsetY)));
        const bIdx = (bY * imageData.width + bX) * 4;
        result.data[idx + 2] = originalData.data[bIdx + 2];

        result.data[idx + 3] = originalData.data[idx + 3];
      }
    }

    ctx.putImageData(result, 0, 0);
  }

  private applyMotionSenseLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const direction = layer.options.motionDirection || 'horizontal';
    const speed = layer.options.motionSpeed || 1;
    const intensity = layer.intensity;

    if (this.webglMotionService.isAvailable()) {
      const result = this.webglMotionService.renderMotion(imageData, {
        direction,
        speed,
        intensity,
        phase,
        blurSamples: layer.options.motionBlurSamples || 8,
        blurSpread: layer.options.motionBlurSpread || 1.0,
        chromaticAberration: layer.options.motionChromaticAberration || 0,
        vignette: layer.options.motionVignette || 0,
        distortion: layer.options.motionDistortion || 0,
        trails: layer.options.motionTrails || 0,
        edgeGlow: layer.options.motionEdgeGlow || 0
      });

      if (result) {
        ctx.putImageData(result, 0, 0);
        return;
      }
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);

    ctx.clearRect(0, 0, imageData.width, imageData.height);

    let offsetX = 0, offsetY = 0, scale = 1;

    switch (direction) {
      case 'horizontal':
        offsetX = Math.sin(phase) * intensity * speed * 10;
        break;
      case 'vertical':
        offsetY = Math.sin(phase) * intensity * speed * 10;
        break;
      case 'radial':
        offsetX = Math.sin(phase) * intensity * speed * 8;
        offsetY = Math.cos(phase) * intensity * speed * 8;
        break;
      case 'zoom':
        scale = 1 + Math.sin(phase) * intensity * speed * 0.1;
        break;
      case 'spin':
      case 'wave':
      case 'spiral':
        offsetX = Math.sin(phase) * intensity * speed * 10;
        break;
    }

    const layers = 5;

    ctx.save();
    ctx.translate(imageData.width / 2, imageData.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-imageData.width / 2 + offsetX, -imageData.height / 2 + offsetY);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    ctx.globalAlpha = 0.3;
    for (let i = 1; i < layers; i++) {
      const t = i / layers;
      const layerOffsetX = offsetX * (1 - t);
      const layerOffsetY = offsetY * (1 - t);
      const layerScale = 1 + (scale - 1) * (1 - t);

      ctx.save();
      ctx.translate(imageData.width / 2, imageData.height / 2);
      ctx.scale(layerScale, layerScale);
      ctx.translate(-imageData.width / 2 + layerOffsetX, -imageData.height / 2 + layerOffsetY);
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  private applyParticlesLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const particleType = layer.options.particleType || 'snow';

    if (particleType === 'custom' && layer.options.particleCustomSprite) {
      this.renderCustomParticles(ctx, imageData, layer, phase);
      return;
    }

    if (this.webglParticlesService.isAvailable()) {
      const result = this.webglParticlesService.renderParticles(imageData, {
        type: particleType,
        density: (layer.options.particleDensity || 0.5) * layer.intensity,
        size: layer.options.particleSize || 2.0,
        speed: layer.options.particleSpeed || 1.0,
        phase,
        opacity: layer.options.particleOpacity || 0.8,
        glow: layer.options.particleGlow || 0.5,
        blur: layer.options.particleBlur || 0,
        color: {
          r: layer.options.particleCustomColorR || 255,
          g: layer.options.particleCustomColorG || 255,
          b: layer.options.particleCustomColorB || 255
        },
        useCustomColor: layer.options.particleUseCustomColor || false,
        colorVariation: layer.options.particleColorVariation || 0.2,
        gravity: layer.options.particleGravity || 0.5,
        wind: layer.options.particleWind || 0,
        turbulence: layer.options.particleTurbulence || 0.5,
        rotation: layer.options.particleRotation || 1.0,
        fadeIn: layer.options.particleFadeIn || 0.2,
        fadeOut: layer.options.particleFadeOut || 0.2,
        twinkle: layer.options.particleTwinkle || 0.5,
        depth: layer.options.particleDepth || 0.5,
        spawnArea: layer.options.particleSpawnArea || 'top',
        blendMode: layer.options.particleBlendMode || 'normal',
        ditherEnabled: layer.options.particleDitherEnabled || false,
        ditherAlgorithm: layer.options.particleDitherAlgorithm || 'bayer-4x4',
        ditherPalette: layer.options.particleDitherPalette || 'gameboy',
        ditherIntensity: layer.options.particleDitherIntensity ?? 1.0
      });

      if (result) {
        ctx.putImageData(result, 0, 0);
        return;
      }
    }

    const count = 50 * (layer.options.particleDensity || 0.5);
    const size = layer.options.particleSize || 2;

    ctx.globalAlpha = layer.intensity * 0.8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    for (let i = 0; i < count; i++) {
      const seed = (i * 12345 + phase * 67890) % 10000;
      const x = (seed % imageData.width);
      const y = ((seed * 7) % imageData.height + phase * 20) % imageData.height;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private renderCustomParticles(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const intensity = layer.intensity;
    const count = 50 * (layer.options.particleDensity || 0.5);
    const size = (layer.options.particleSize || 2) * 10;
    const speed = layer.options.particleSpeed || 1.0;
    const spriteData = layer.options.particleCustomSprite!;
    const gravity = layer.options.particleGravity || 0.5;
    const wind = layer.options.particleWind || 0;

    for (let i = 0; i < count; i++) {
      const seed = i / count;
      const x = (this.hash(seed * 1234.5) * imageData.width + wind * phase * 100) % imageData.width;
      const baseY = this.hash(seed * 5678.9) * imageData.height;
      const y = (baseY + phase * speed * 100 + gravity * phase * 50) % (imageData.height + size);

      const alpha = intensity * (layer.options.particleOpacity || 0.8);
      this.drawCustomParticle(ctx, x, y, size, spriteData, alpha);
    }
  }

  private hash(n: number): number {
    return Math.abs(Math.sin(n * 12345.6789) * 43758.5453) % 1;
  }

  private drawCustomParticle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, spriteData: string, alpha: number) {
    let img = this.customParticleSpriteCache.get(spriteData);

    if (!img) {
      img = new Image();
      img.src = spriteData;
      this.customParticleSpriteCache.set(spriteData, img);

      if (!img.complete) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
    }

    ctx.globalAlpha = alpha;
    const spriteSize = size * 4;
    ctx.drawImage(img, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
    ctx.globalAlpha = 1;
  }

  private applyFlamesLayer(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const algorithm = layer.options.flameAlgorithm || 'realistic';

    if (this.webglFlameService.isAvailable()) {
      const webglAlgorithm = this.mapFlameAlgorithmToWebGL(algorithm);
      if (webglAlgorithm) {
        const result = this.webglFlameService.renderFlames(imageData, {
          algorithm: webglAlgorithm,
          intensity: layer.intensity * (layer.options.flameIntensity || 0.7),
          phase,
          turbulence: layer.options.flameTurbulence || 1.0,
          speed: layer.options.flameSpeed || 1.0,
          direction: layer.options.flameDirection || 'up',
          distortion: layer.options.flameDistortion || 0.3,
          baseHeat: layer.options.flameBaseHeat || 0.1,
          brightness: layer.options.flameBrightness || 1.0,
          contrast: layer.options.flameContrast || 1.0,
          noiseScale: layer.options.flameNoiseScale || 1.0,
          noiseOctaves: layer.options.flameNoiseOctaves || 3,
          opacity: layer.options.flameOpacity || 1.0,
          customColorR: layer.options.flameCustomColorR || 0,
          customColorG: layer.options.flameCustomColorG || 0,
          customColorB: layer.options.flameCustomColorB || 0,
          gradientColorR: layer.options.flameGradientColorR || 255,
          gradientColorG: layer.options.flameGradientColorG || 255,
          gradientColorB: layer.options.flameGradientColorB || 0,
          useGradient: layer.options.flameColor === 'gradient',
          offsetX: layer.options.flameOffsetX || 0,
          offsetY: layer.options.flameOffsetY || 0,
          smoothing: layer.options.flameSmoothing || 0.3,
          height: layer.options.flameHeight || 60,
          spread: layer.options.flameSpread || 50,
          spawnArea: layer.options.flameSpawnArea || 'full',
          spawnStart: layer.options.flameSpawnStart || 0,
          spawnEnd: layer.options.flameSpawnEnd || 100,
          spawnFadeIn: layer.options.flameSpawnFadeIn || 10,
          spawnFadeOut: layer.options.flameSpawnFadeOut || 10
        });

        if (result) {
          ctx.putImageData(result, 0, 0);
          if (layer.options.flameDitherEnabled) {
            this.applyDitheringToFlames(ctx, layer, imageData);
          }
          return;
        }
      }
    }

    switch (algorithm) {
      case 'classic':
        this.applyClassicFlames(ctx, imageData, layer, phase);
        break;
      case 'realistic':
        this.applyRealisticFlames(ctx, imageData, layer, phase);
        break;
      case 'plasma':
        this.applyPlasmaFlames(ctx, imageData, layer, phase);
        break;
      case 'dragon':
        this.applyDragonFlames(ctx, imageData, layer, phase);
        break;
      case 'wispy':
        this.applyWispyFlames(ctx, imageData, layer, phase);
        break;
      case 'inferno':
        this.applyInfernoFlames(ctx, imageData, layer, phase);
        break;
    }

    if (layer.options.flameDitherEnabled) {
      this.applyDitheringToFlames(ctx, layer, imageData);
    }
  }

  private mapFlameAlgorithmToWebGL(algorithm: string): 'realistic' | 'plasma' | 'dragon' | 'inferno' | 'cool' | 'mystic' | null {
    const mapping: Record<string, 'realistic' | 'plasma' | 'dragon' | 'inferno' | 'cool' | 'mystic' | null> = {
      'realistic': 'realistic',
      'plasma': 'plasma',
      'dragon': 'dragon',
      'inferno': 'inferno',
      'cool': 'cool',
      'wispy': 'mystic',
      'classic': null
    };
    return mapping[algorithm] || null;
  }

  private applyDitheringToFlames(ctx: CanvasRenderingContext2D, layer: EffectLayer, originalImageData: ImageData) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const currentImageData = ctx.getImageData(0, 0, width, height);

    const algorithm = layer.options.flameDitherAlgorithm || 'bayer-4x4';
    const palette = layer.options.flameDitherPalette || 'gameboy';
    const intensity = layer.options.flameDitherIntensity ?? 1.0;

    const flamesOnly = new ImageData(width, height);
    for (let i = 0; i < currentImageData.data.length; i += 4) {
      const origR = originalImageData.data[i];
      const origG = originalImageData.data[i + 1];
      const origB = originalImageData.data[i + 2];
      const origA = originalImageData.data[i + 3];

      const currR = currentImageData.data[i];
      const currG = currentImageData.data[i + 1];
      const currB = currentImageData.data[i + 2];
      const currA = currentImageData.data[i + 3];

      if (currR !== origR || currG !== origG || currB !== origB || currA !== origA) {
        flamesOnly.data[i] = currR;
        flamesOnly.data[i + 1] = currG;
        flamesOnly.data[i + 2] = currB;
        flamesOnly.data[i + 3] = currA;
      }
    }

    const ditheredFlames = this.ditheringService.applyDithering(flamesOnly, {
      algorithm,
      palette: palette === 'custom' ? undefined : palette,
      scale: 1,
      contrast: 0,
      midtones: 0,
      highlights: 0,
      blur: 0
    });

    const result = new ImageData(width, height);
    for (let i = 0; i < result.data.length; i += 4) {
      result.data[i] = originalImageData.data[i];
      result.data[i + 1] = originalImageData.data[i + 1];
      result.data[i + 2] = originalImageData.data[i + 2];
      result.data[i + 3] = originalImageData.data[i + 3];

      const flameAlpha = ditheredFlames.data[i + 3] / 255;
      if (flameAlpha > 0) {
        const blendedAlpha = flameAlpha * intensity;
        result.data[i] = Math.round(result.data[i] * (1 - blendedAlpha) + ditheredFlames.data[i] * blendedAlpha);
        result.data[i + 1] = Math.round(result.data[i + 1] * (1 - blendedAlpha) + ditheredFlames.data[i + 1] * blendedAlpha);
        result.data[i + 2] = Math.round(result.data[i + 2] * (1 - blendedAlpha) + ditheredFlames.data[i + 2] * blendedAlpha);
      }
    }

    ctx.putImageData(result, 0, 0);
  }

  private applyClassicFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;

    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;

    ctx.globalCompositeOperation = 'lighter';
    const numFlames = Math.ceil(width / 12);
    const phaseRad = phase * Math.PI * 2;

    for (let i = 0; i < numFlames; i++) {
      const x = (i * width) / numFlames;
      const waveOffset = Math.sin(phaseRad * 0.5 + i * 0.8) * 10 * turbulence;

      const gradient = ctx.createLinearGradient(x, flameBottom, x, flameBottom - flameHeightPixels);
      const colors = this.getFlameColors(color, intensity);
      colors.forEach((c, idx) => gradient.addColorStop(idx / (colors.length - 1), c));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x + waveOffset, flameBottom);

      for (let j = 0; j <= 8; j++) {
        const progress = j / 8;
        const y = flameBottom - progress * flameHeightPixels;
        const xOff = Math.sin(progress * Math.PI * 2 + phaseRad + i) * 15 * turbulence * (1 - progress);
        const flameWidth = 20 * (1 - progress * 0.8);
        ctx.lineTo(x + waveOffset + xOff + (j % 2 ? flameWidth : -flameWidth), y);
      }

      ctx.closePath();
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  private applyRealisticFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;

    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;

    ctx.globalCompositeOperation = 'lighter';

    const resolution = 4;
    const cols = Math.ceil(width / resolution);
    const rows = Math.ceil(flameHeightPixels / resolution);
    const phaseOffset = phase * 5;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * resolution;
        const py = flameBottom - y * resolution;

        const noise = this.perlinNoise(x * 0.1, y * 0.1 + phaseOffset, 0) * turbulence;
        const heatValue = Math.max(0, 1 - (y / rows) + noise * 0.3);

        if (heatValue > 0.1) {
          const alpha = heatValue * intensity;
          const colors = this.getFlameColors(color, alpha);
          const colorIndex = Math.min(Math.floor(heatValue * (colors.length - 1)), colors.length - 1);

          ctx.fillStyle = colors[colorIndex];
          ctx.fillRect(px, py, resolution, resolution);

          if (heatValue > 0.7) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = colors[0];
            ctx.fillRect(px, py, resolution, resolution);
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  private applyPlasmaFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;

    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;

    ctx.globalCompositeOperation = 'lighter';
    const data = ctx.getImageData(0, 0, width, height);
    const phaseRad = phase * Math.PI * 2;

    for (let y = 0; y < flameHeightPixels; y++) {
      for (let x = 0; x < width; x++) {
        const py = flameBottom - y;
        if (py < 0 || py >= height) continue;

        const plasma1 = Math.sin(x * 0.02 + phaseRad * 1.5);
        const plasma2 = Math.sin(y * 0.03 - phaseRad * 1.0);
        const plasma3 = Math.sin((x + y) * 0.015 + phaseRad * 0.75);
        const plasma4 = Math.sin(Math.sqrt(x * x + y * y) * 0.02 + phaseRad * 1.25);

        const plasmaValue = (plasma1 + plasma2 + plasma3 + plasma4) / 4;
        const heatValue = Math.max(0, (1 - y / flameHeightPixels) * (0.5 + plasmaValue * 0.5 * turbulence));

        if (heatValue > 0.1) {
          const idx = (py * width + x) * 4;
          const [r, g, b] = this.getFlameRGB(color, heatValue);
          data.data[idx] = Math.min(255, data.data[idx] + r * heatValue);
          data.data[idx + 1] = Math.min(255, data.data[idx + 1] + g * heatValue);
          data.data[idx + 2] = Math.min(255, data.data[idx + 2] + b * heatValue);
        }
      }
    }

    ctx.putImageData(data, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  private applyDragonFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;

    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;

    ctx.globalCompositeOperation = 'lighter';
    const phaseRad = phase * Math.PI * 2;

    const numDragons = 3 + Math.floor(turbulence * 2);

    for (let d = 0; d < numDragons; d++) {
      const startX = (d * width) / numDragons + Math.sin(phaseRad * 0.5 + d) * 50;
      const phaseOffset = d * Math.PI * 0.6;

      ctx.beginPath();
      ctx.moveTo(startX, flameBottom);

      const segments = 20;
      let prevX = startX;
      let prevY = flameBottom;

      for (let i = 1; i <= segments; i++) {
        const progress = i / segments;
        const y = flameBottom - progress * flameHeightPixels;

        const amplitude = 30 * turbulence * (1 - progress * 0.5);
        const frequency = 3;
        const x = startX + Math.sin(progress * Math.PI * frequency + phaseRad * 2.5 + phaseOffset) * amplitude;

        const gradient = ctx.createLinearGradient(prevX, prevY, x, y);
        const colors = this.getFlameColors(color, intensity * (1 - progress * 0.3));
        gradient.addColorStop(0, colors[Math.floor(progress * (colors.length - 1))]);
        gradient.addColorStop(1, colors[Math.min(Math.floor(progress * colors.length), colors.length - 1)]);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 15 * (1 - progress * 0.7);
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y);

        prevX = x;
        prevY = y;
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  private applyWispyFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;

    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;

    ctx.globalCompositeOperation = 'lighter';
    const phaseRad = phase * Math.PI * 2;

    const numWisps = 30 + Math.floor(turbulence * 20);

    for (let i = 0; i < numWisps; i++) {
      const x = (i * width) / numWisps + Math.sin(phaseRad * 1.0 + i) * 20 * turbulence;
      const wispPhase = phaseRad * 1.5 + i * 0.5;
      const wispHeight = flameHeightPixels * (0.6 + Math.sin(phaseRad + i) * 0.2 + 0.2);

      for (let j = 0; j < 5; j++) {
        const y = flameBottom - j * (wispHeight / 5);
        const progress = j / 5;
        const xOffset = Math.sin(wispPhase + j * 0.8) * 25 * turbulence * (1 + progress);
        const size = (20 - j * 3) * (1 + Math.sin(wispPhase * 2) * 0.3);

        const gradient = ctx.createRadialGradient(
          x + xOffset, y, 0,
          x + xOffset, y, size
        );

        const colors = this.getFlameColors(color, intensity * (1 - progress * 0.7));
        gradient.addColorStop(0, colors[Math.floor(progress * (colors.length - 1))]);
        gradient.addColorStop(0.5, colors[Math.min(Math.floor((progress + 0.2) * colors.length), colors.length - 1)]);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x + xOffset - size, y - size, size * 2, size * 2);
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  private applyInfernoFlames(ctx: CanvasRenderingContext2D, imageData: ImageData, layer: EffectLayer, phase: number) {
    const heightPercent = layer.options.flameHeight || 100;
    const intensity = layer.intensity * (layer.options.flameIntensity || 0.7);
    const color = layer.options.flameColor || 'red';
    const turbulence = layer.options.flameTurbulence || 1;

    const width = imageData.width;
    const height = imageData.height;
    const flameBottom = height;
    const flameHeightPixels = (height * heightPercent) / 100;

    ctx.globalCompositeOperation = 'lighter';
    const phaseRad = phase * Math.PI * 2;

    const numFlames = Math.ceil(width / 4);

    for (let l = 0; l < 4; l++) {
      const layerAlpha = intensity * (1 - l * 0.15);

      for (let i = 0; i < numFlames; i++) {
        const x = (i * width) / numFlames + Math.sin(phaseRad * 2.0 + i + l) * 8;
        const waveOffset = Math.cos(phaseRad * 1.5 + i * 0.3 + l) * 12 * turbulence;
        const heightVar = Math.sin(phaseRad * 1.25 + i * 0.5) * 30;

        const gradient = ctx.createLinearGradient(x, flameBottom, x, flameBottom - flameHeightPixels - heightVar);
        const colors = this.getFlameColors(color, layerAlpha);
        colors.forEach((c, idx) => gradient.addColorStop(idx / (colors.length - 1), c));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x + waveOffset, flameBottom);

        const segments = 15;
        const baseWidth = 18 + l * 5;

        for (let j = 0; j <= segments; j++) {
          const progress = j / segments;
          const y = flameBottom - progress * (flameHeightPixels + heightVar);
          const turbNoise = Math.sin(progress * 8 + phaseRad + i + l) * turbulence * 8;
          const widthMod = baseWidth * (1 - progress * 0.9) * (1 + Math.sin(phaseRad * 2.5 + j) * 0.3);

          ctx.lineTo(x + waveOffset + turbNoise + (j % 2 ? widthMod : -widthMod), y);
        }

        ctx.closePath();
        ctx.fill();

        const sparkSeed = i * 17 + l;
        const sparkChance = (Math.sin(phaseRad + sparkSeed) + 1) / 2;
        if (l === 0 && sparkChance < 0.3) {
          const sparkY = flameBottom - (Math.sin(phaseRad * 3 + sparkSeed) * 0.5 + 0.5) * flameHeightPixels * 0.7;
          const sparkX = x + (Math.cos(phaseRad * 2 + sparkSeed) * 0.5) * 40;

          ctx.fillStyle = colors[0];
          ctx.shadowBlur = 15;
          ctx.shadowColor = colors[0];
          ctx.fillRect(sparkX, sparkY, 3, 3);
          ctx.shadowBlur = 0;
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  private getFlameColors(color: string, alpha: number): string[] {
    const a = Math.min(1, alpha);

    switch (color) {
      case 'red':
        return [
          `rgba(255, 255, 200, ${a})`,
          `rgba(255, 220, 100, ${a * 0.95})`,
          `rgba(255, 150, 50, ${a * 0.85})`,
          `rgba(255, 80, 0, ${a * 0.7})`,
          `rgba(200, 30, 0, ${a * 0.5})`,
          `rgba(100, 0, 0, ${a * 0.2})`
        ];
      case 'blue':
        return [
          `rgba(220, 240, 255, ${a})`,
          `rgba(180, 220, 255, ${a * 0.9})`,
          `rgba(120, 180, 255, ${a * 0.8})`,
          `rgba(60, 120, 255, ${a * 0.6})`,
          `rgba(20, 60, 200, ${a * 0.4})`,
          `rgba(0, 20, 120, ${a * 0.2})`
        ];
      case 'green':
        return [
          `rgba(220, 255, 200, ${a})`,
          `rgba(180, 255, 150, ${a * 0.9})`,
          `rgba(120, 220, 100, ${a * 0.8})`,
          `rgba(60, 180, 60, ${a * 0.6})`,
          `rgba(20, 120, 20, ${a * 0.4})`,
          `rgba(0, 60, 0, ${a * 0.2})`
        ];
      case 'purple':
        return [
          `rgba(255, 220, 255, ${a})`,
          `rgba(255, 180, 255, ${a * 0.9})`,
          `rgba(220, 120, 255, ${a * 0.8})`,
          `rgba(180, 60, 220, ${a * 0.6})`,
          `rgba(120, 20, 160, ${a * 0.4})`,
          `rgba(60, 0, 80, ${a * 0.2})`
        ];
      case 'rainbow':
        const baseHue = Math.random() * 360;
        return [
          `hsla(${baseHue}, 100%, 80%, ${a})`,
          `hsla(${(baseHue + 40) % 360}, 100%, 70%, ${a * 0.9})`,
          `hsla(${(baseHue + 80) % 360}, 100%, 60%, ${a * 0.8})`,
          `hsla(${(baseHue + 120) % 360}, 100%, 50%, ${a * 0.6})`,
          `hsla(${(baseHue + 160) % 360}, 100%, 40%, ${a * 0.4})`,
          `hsla(${(baseHue + 200) % 360}, 100%, 30%, ${a * 0.2})`
        ];
      default:
        return [`rgba(255, 100, 0, ${a})`];
    }
  }

  private getFlameRGB(color: string, heat: number): [number, number, number] {
    switch (color) {
      case 'red':
        return [255 * heat, 150 * heat, 0];
      case 'blue':
        return [150 * heat, 200 * heat, 255 * heat];
      case 'green':
        return [150 * heat, 255 * heat, 150 * heat];
      case 'purple':
        return [255 * heat, 150 * heat, 255 * heat];
      case 'rainbow':
        const hue = heat * 360;
        return this.hslToRgb(hue / 360, 1, 0.5 * heat);
      default:
        return [255 * heat, 100 * heat, 0];
    }
  }

  private perlinNoise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const hash = (X * 374761393 + Y * 668265263 + Z * 1274126177) & 0x7FFFFFFF;
    return (hash / 0x7FFFFFFF) * 2 - 1;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}
