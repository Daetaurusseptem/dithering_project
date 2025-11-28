import { Injectable, signal, inject } from '@angular/core';
import { 
  CompositionLayer, 
  CompositionState, 
  BackgroundRemovalOptions, 
  TintOptions,
  BlendMode,
  createDefaultLayer,
  generateLayerId
} from '../models/composition-layer.interface';
import { DitheringOptions, DitheringService } from './dithering.service';
import { AiBackgroundRemovalService } from './ai-background-removal.service';

@Injectable({
  providedIn: 'root'
})
export class CompositionService {
  private aiBackgroundRemoval = inject(AiBackgroundRemovalService);
  // State
  compositionState = signal<CompositionState>({
    layers: [],
    activeLayerId: null,
    selectedLayerIds: [], // Multiple selection
    canvasWidth: 800,
    canvasHeight: 600,
    backgroundColor: 'transparent'
  });
  
  // Dithering options for preview
  ditheringOptions = signal<DitheringOptions>({
    algorithm: 'floyd-steinberg',
    scale: 1,
    contrast: 0,
    midtones: 0,
    highlights: 0,
    blur: 0,
    palette: 'monochrome',
    threshold: 128
  });
  
  private ditheringService = inject(DitheringService);
  
  constructor() {}
  
  /**
   * ===== LAYER MANAGEMENT =====
   */
  
  addLayer(image: HTMLImageElement, imageData: ImageData, position?: { x: number; y: number }): string {
    const state = this.compositionState();
    const newLayer = createDefaultLayer(image, imageData, state.layers.length);
    
    // Check if layer is larger than canvas and scale it down if needed
    let scaleX = 1;
    let scaleY = 1;
    
    if (newLayer.width > state.canvasWidth) {
      scaleX = state.canvasWidth / newLayer.width * 0.9; // 90% to leave margin
    }
    
    if (newLayer.height > state.canvasHeight) {
      scaleY = state.canvasHeight / newLayer.height * 0.9; // 90% to leave margin
    }
    
    // Use the smaller scale to maintain aspect ratio
    const scale = Math.min(scaleX, scaleY);
    
    if (scale < 1) {
      newLayer.width = Math.floor(newLayer.width * scale);
      newLayer.height = Math.floor(newLayer.height * scale);
      console.log('🔽 Auto-scaled layer to fit canvas:', { 
        scale: scale.toFixed(2), 
        newSize: { w: newLayer.width, h: newLayer.height },
        canvasSize: { w: state.canvasWidth, h: state.canvasHeight }
      });
    }
    
    // Position layer - either at specified position or centered on canvas
    if (position) {
      newLayer.x = position.x;
      newLayer.y = position.y;
    } else {
      // Center layer on canvas by default
      newLayer.x = (state.canvasWidth - newLayer.width) / 2;
      newLayer.y = (state.canvasHeight - newLayer.height) / 2;
    }
    
    // Create new state with new array reference
    const newState = {
      ...state,
      layers: [...state.layers, newLayer],
      activeLayerId: newLayer.id,
      selectedLayerIds: [newLayer.id] // Select new layer
    };
    
    this.compositionState.set(newState);
    return newLayer.id;
  }
  
  removeLayer(layerId: string): void {
    const state = this.compositionState();
    const newLayers = state.layers.filter(l => l.id !== layerId);
    
    // Update order
    newLayers.forEach((layer, i) => layer.order = i);
    
    // Update active layer
    const newActiveLayerId = state.activeLayerId === layerId
      ? (newLayers.length > 0 ? newLayers[0].id : null)
      : state.activeLayerId;
    
    this.compositionState.set({
      ...state,
      layers: newLayers,
      activeLayerId: newActiveLayerId
    });
  }
  
  duplicateLayer(layerId: string): string | null {
    const state = this.compositionState();
    const layer = state.layers.find(l => l.id === layerId);
    
    if (!layer) return null;
    
    const newLayer: CompositionLayer = {
      ...layer,
      id: generateLayerId(),
      name: `${layer.name} Copy`,
      order: state.layers.length,
      x: layer.x + 20,
      y: layer.y + 20
    };
    
    this.compositionState.set({
      ...state,
      layers: [...state.layers, newLayer],
      activeLayerId: newLayer.id
    });
    
    return newLayer.id;
  }
  
  /**
   * Add layer with specific ID (for undo/redo)
   */
  addLayerWithId(layer: CompositionLayer): void {
    const state = this.compositionState();
    
    // Check if layer already exists
    const exists = state.layers.find(l => l.id === layer.id);
    if (exists) {
      console.error(`⚠️ Layer ${layer.id} already exists! Not adding duplicate.`);
      return;
    }
    
    this.compositionState.set({
      ...state,
      layers: [...state.layers, layer],
      activeLayerId: layer.id
    });
  }
  
  /**
   * Add layer at specific index (for undo/redo)
   */
  addLayerAtIndex(layer: CompositionLayer, index: number): void {
    const state = this.compositionState();
    const newLayers = [...state.layers];
    newLayers.splice(index, 0, layer);
    
    // Update order
    newLayers.forEach((l, i) => l.order = i);
    
    this.compositionState.set({
      ...state,
      layers: newLayers,
      activeLayerId: layer.id
    });
  }
  
  /**
   * Alias for removeLayer (for consistency with history commands)
   */
  deleteLayer(layerId: string): void {
    this.removeLayer(layerId);
  }
  
  /**
   * Reorder layer from one index to another
   */
  reorderLayer(fromIndex: number, toIndex: number): void {
    const state = this.compositionState();
    const newLayers = [...state.layers];
    const [movedLayer] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, movedLayer);
    
    // Update order
    newLayers.forEach((layer, i) => layer.order = i);
    
    this.compositionState.set({
      ...state,
      layers: newLayers
    });
  }
  
  updateLayer(layerId: string, updates: Partial<CompositionLayer>): void {
    const state = this.compositionState();
    const layerIndex = state.layers.findIndex(l => l.id === layerId);
    
    if (layerIndex !== -1) {
      const newLayers = [...state.layers];
      newLayers[layerIndex] = { ...newLayers[layerIndex], ...updates };
      
      this.compositionState.set({
        ...state,
        layers: newLayers
      });
    }
  }
  
  moveLayerUp(layerId: string): void {
    const state = this.compositionState();
    const index = state.layers.findIndex(l => l.id === layerId);
    
    if (index < state.layers.length - 1) {
      const newLayers = [...state.layers];
      [newLayers[index], newLayers[index + 1]] = 
        [newLayers[index + 1], newLayers[index]];
      
      newLayers.forEach((layer, i) => layer.order = i);
      
      this.compositionState.set({
        ...state,
        layers: newLayers
      });
    }
  }
  
  moveLayerDown(layerId: string): void {
    const state = this.compositionState();
    const index = state.layers.findIndex(l => l.id === layerId);
    
    if (index > 0) {
      const newLayers = [...state.layers];
      [newLayers[index], newLayers[index - 1]] = 
        [newLayers[index - 1], newLayers[index]];
      
      newLayers.forEach((layer, i) => layer.order = i);
      
      this.compositionState.set({
        ...state,
        layers: newLayers
      });
    }
  }
  
  setActiveLayer(layerId: string): void {
    this.compositionState.set({
      ...this.compositionState(),
      activeLayerId: layerId
    });
  }
  
  toggleLayerVisibility(layerId: string): void {
    const state = this.compositionState();
    const layerIndex = state.layers.findIndex(l => l.id === layerId);
    
    if (layerIndex !== -1) {
      const newLayers = [...state.layers];
      newLayers[layerIndex] = {
        ...newLayers[layerIndex],
        visible: !newLayers[layerIndex].visible
      };
      
      this.compositionState.set({
        ...state,
        layers: newLayers
      });
    }
  }
  
  clearAllLayers(): void {
    const state = this.compositionState();
    // Keep canvas size and background color, only clear layers
    this.compositionState.set({
      ...state,
      layers: [],
      activeLayerId: null,
      selectedLayerIds: []
    });
  }
  
  setCanvasSize(width: number, height: number): void {
    const state = this.compositionState();
    this.compositionState.set({
      ...state,
      canvasWidth: width,
      canvasHeight: height
    });
  }
  
  /**
   * ===== BACKGROUND REMOVAL =====
   * Enhanced algorithm with edge detection and flood fill
   */
  
  async removeBackground(layer: CompositionLayer, options: BackgroundRemovalOptions): Promise<ImageData> {
    // Use AI removal if enabled and available
    if (layer.useAiRemoval && this.aiBackgroundRemoval.isReady()) {
      console.log('🤖 Using AI Background Removal...');
      try {
        return await this.aiBackgroundRemoval.removeBackground(layer.imageData);
      } catch (error) {
        console.error('❌ AI removal failed, falling back to manual:', error);
        // Fallback to manual removal
      }
    }
    
    // Manual color-based removal
    const { color, threshold, feather } = options;
    
    console.log('🎨 Remove background (manual):', { color, threshold, feather });
    
    // Parse target color
    const targetRGB = this.hexToRgb(color);
    if (!targetRGB) {
      console.warn('⚠️ Invalid color:', color);
      return layer.imageData;
    }
    
    console.log('🎯 Target RGB:', targetRGB);
    
    // Clone image data
    const imageData = new ImageData(
      new Uint8ClampedArray(layer.imageData.data),
      layer.imageData.width,
      layer.imageData.height
    );
    
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    let removedCount = 0;
    
    // Remove background pixels based on color similarity
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate color distance using weighted Euclidean distance
        const dr = r - targetRGB.r;
        const dg = g - targetRGB.g;
        const db = b - targetRGB.b;
        
        // Weighted distance (human eye is more sensitive to green)
        const distance = Math.sqrt(
          0.299 * dr * dr +
          0.587 * dg * dg +
          0.114 * db * db
        );
        
        // Apply threshold (higher threshold = more aggressive removal)
        if (distance <= threshold) {
          data[i + 3] = 0; // Set alpha to transparent
          removedCount++;
        } else if (feather > 0 && distance <= threshold + feather) {
          // Feather edge - gradual transparency
          const alpha = ((distance - threshold) / feather) * 255;
          data[i + 3] = Math.min(255, Math.max(0, alpha));
        }
      }
    }
    
    console.log(`✅ Removed ${removedCount} pixels (${((removedCount / (width * height)) * 100).toFixed(1)}%)`);
    
    return imageData;
  }
  
  /**
   * Apply Gaussian blur to alpha mask for smooth edges
   */
  private applyGaussianBlur(mask: Uint8Array, width: number, height: number, radius: number): void {
    const kernel = this.createGaussianKernel(radius);
    const kernelSize = kernel.length;
    const halfSize = Math.floor(kernelSize / 2);
    const tempMask = new Uint8Array(mask);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const px = x + kx - halfSize;
            const py = y + ky - halfSize;
            
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const weight = kernel[ky][kx];
              sum += tempMask[py * width + px] * weight;
              weightSum += weight;
            }
          }
        }
        
        mask[y * width + x] = Math.round(sum / weightSum);
      }
    }
  }
  
  /**
   * Create Gaussian kernel for blur
   */
  private createGaussianKernel(radius: number): number[][] {
    const size = radius * 2 + 1;
    const kernel: number[][] = [];
    const sigma = radius / 2;
    const twoSigmaSquare = 2 * sigma * sigma;
    let sum = 0;
    
    for (let y = 0; y < size; y++) {
      kernel[y] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const value = Math.exp(-(dx * dx + dy * dy) / twoSigmaSquare);
        kernel[y][x] = value;
        sum += value;
      }
    }
    
    // Normalize
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        kernel[y][x] /= sum;
      }
    }
    
    return kernel;
  }
  
  /**
   * ===== TINTING & COLOR =====
   */
  
  applyTint(layer: CompositionLayer, options: TintOptions): ImageData {
    const { color, intensity, blendMode, preserveLuminosity } = options;
    
    const tintRGB = this.hexToRgb(color);
    if (!tintRGB) return layer.imageData;
    
    // Clone image data
    const imageData = new ImageData(
      new Uint8ClampedArray(layer.imageData.data),
      layer.imageData.width,
      layer.imageData.height
    );
    
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a === 0) continue; // Skip transparent pixels
      
      let newR = r, newG = g, newB = b;
      
      switch (blendMode) {
        case 'normal':
          newR = this.lerp(r, tintRGB.r, intensity);
          newG = this.lerp(g, tintRGB.g, intensity);
          newB = this.lerp(b, tintRGB.b, intensity);
          break;
          
        case 'multiply':
          newR = (r * tintRGB.r / 255) * intensity + r * (1 - intensity);
          newG = (g * tintRGB.g / 255) * intensity + g * (1 - intensity);
          newB = (b * tintRGB.b / 255) * intensity + b * (1 - intensity);
          break;
          
        case 'screen':
          newR = (255 - (255 - r) * (255 - tintRGB.r) / 255) * intensity + r * (1 - intensity);
          newG = (255 - (255 - g) * (255 - tintRGB.g) / 255) * intensity + g * (1 - intensity);
          newB = (255 - (255 - b) * (255 - tintRGB.b) / 255) * intensity + b * (1 - intensity);
          break;
          
        case 'overlay':
          newR = this.overlayBlend(r, tintRGB.r) * intensity + r * (1 - intensity);
          newG = this.overlayBlend(g, tintRGB.g) * intensity + g * (1 - intensity);
          newB = this.overlayBlend(b, tintRGB.b) * intensity + b * (1 - intensity);
          break;
          
        case 'color':
          const hsl = this.rgbToHsl(r, g, b);
          const tintHsl = this.rgbToHsl(tintRGB.r, tintRGB.g, tintRGB.b);
          const rgb = this.hslToRgb(tintHsl.h, tintHsl.s, hsl.l);
          newR = this.lerp(r, rgb.r, intensity);
          newG = this.lerp(g, rgb.g, intensity);
          newB = this.lerp(b, rgb.b, intensity);
          break;
      }
      
      // Preserve luminosity if requested
      if (preserveLuminosity) {
        const originalLum = 0.299 * r + 0.587 * g + 0.114 * b;
        const newLum = 0.299 * newR + 0.587 * newG + 0.114 * newB;
        const lumFactor = newLum !== 0 ? originalLum / newLum : 1;
        
        newR *= lumFactor;
        newG *= lumFactor;
        newB *= lumFactor;
      }
      
      data[i] = Math.min(255, Math.max(0, Math.round(newR)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(newG)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(newB)));
    }
    
    return imageData;
  }
  
  /**
   * ===== COMPOSITION RENDERING =====
   */
  
  async renderComposition(): Promise<ImageData> {
    const state = this.compositionState();
    
    // Create output canvas
    const canvas = document.createElement('canvas');
    canvas.width = state.canvasWidth;
    canvas.height = state.canvasHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    // Fill background (only if not transparent)
    if (state.backgroundColor !== 'transparent') {
      ctx.fillStyle = state.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Sort layers by order
    const sortedLayers = [...state.layers].sort((a, b) => a.order - b.order);
    
    // Render each layer
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;
      
      ctx.save();
      
      // Apply transformations
      ctx.globalAlpha = layer.opacity / 100;
      
      // Translate to layer position + center for rotation
      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      
      // Get processed image data
      let imageData = layer.imageData;
      
      // Apply background removal
      if (layer.removeBackground && layer.backgroundColor) {
        imageData = await this.removeBackground(layer, {
          color: layer.backgroundColor,
          threshold: layer.backgroundThreshold,
          feather: 2
        });
      }
      
      // Apply tint
      if (layer.tint) {
        imageData = this.applyTint(layer, {
          color: layer.tintColor,
          intensity: layer.tintIntensity / 100,
          blendMode: layer.tintBlendMode,
          preserveLuminosity: false
        });
      }
      
      // Draw layer
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imageData, 0, 0);
      
      ctx.drawImage(
        tempCanvas,
        layer.x,
        layer.y,
        layer.width,
        layer.height
      );
      
      ctx.restore();
    }
    
    // Return composed image data
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  
  /**
   * Render composition with dither-exempt layers preserved
   * Returns both the ditherable content and exempt layers separately
   */
  async renderForDithering(): Promise<{
    ditherableContent: ImageData;
    exemptLayers: Array<{ layer: CompositionLayer; imageData: ImageData }>;
  }> {
    const state = this.compositionState();
    
    // Separate layers
    // Layers with custom dither are also exempt from global dither
    const ditherableLayers = state.layers.filter(l => 
      !l.ditherExempt && !l.customDither?.enabled && l.visible
    );
    const exemptLayers = state.layers.filter(l => 
      (l.ditherExempt || l.customDither?.enabled) && l.visible
    );
    
    // Render ditherable content
    const ditherableCanvas = document.createElement('canvas');
    ditherableCanvas.width = state.canvasWidth;
    ditherableCanvas.height = state.canvasHeight;
    const ditherableCtx = ditherableCanvas.getContext('2d')!;
    
    // Fill background (only if not transparent)
    if (state.backgroundColor !== 'transparent') {
      ditherableCtx.fillStyle = state.backgroundColor;
      ditherableCtx.fillRect(0, 0, ditherableCanvas.width, ditherableCanvas.height);
    }
    
    await this.renderLayersToContext(ditherableCtx, ditherableLayers);
    
    const ditherableContent = ditherableCtx.getImageData(
      0, 0, ditherableCanvas.width, ditherableCanvas.height
    );
    
    // Process exempt layers
    const exemptLayersData = await Promise.all(
      exemptLayers.map(async layer => ({
        layer,
        imageData: await this.renderSingleLayer(layer)
      }))
    );
    
    return {
      ditherableContent,
      exemptLayers: exemptLayersData
    };
  }
  
  private async renderLayersToContext(ctx: CanvasRenderingContext2D, layers: CompositionLayer[]): Promise<void> {
    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);
    
    for (const layer of sortedLayers) {
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      
      const centerX = layer.x + layer.width / 2;
      const centerY = layer.y + layer.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      
      let imageData = layer.imageData;
      
      if (layer.removeBackground && layer.backgroundColor) {
        imageData = await this.removeBackground(layer, {
          color: layer.backgroundColor,
          threshold: layer.backgroundThreshold,
          feather: 2
        });
      }
      
      if (layer.tint) {
        imageData = this.applyTint(layer, {
          color: layer.tintColor,
          intensity: layer.tintIntensity / 100,
          blendMode: layer.tintBlendMode,
          preserveLuminosity: false
        });
      }
      
      // Apply custom dither if enabled
      if (layer.customDither?.enabled && !layer.ditherExempt) {
        imageData = this.applyCustomDither(imageData, layer.customDither);
      }
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imageData, 0, 0);
      
      // Apply stroke effect to the silhouette FIRST if enabled
      if (layer.effects?.stroke?.enabled) {
        const stroke = layer.effects.stroke;
        const strokeCanvas = document.createElement('canvas');
        strokeCanvas.width = tempCanvas.width;
        strokeCanvas.height = tempCanvas.height;
        const strokeCtx = strokeCanvas.getContext('2d')!;
        
        // Create outline by drawing the image multiple times in a circle pattern
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
          const offsetX = Math.cos(angle) * stroke.width;
          const offsetY = Math.sin(angle) * stroke.width;
          strokeCtx.drawImage(tempCanvas, offsetX, offsetY);
        }
        
        // Draw original image on top
        strokeCtx.globalCompositeOperation = 'source-atop';
        strokeCtx.fillStyle = stroke.color;
        strokeCtx.fillRect(0, 0, strokeCanvas.width, strokeCanvas.height);
        
        // Now composite the original image
        strokeCtx.globalCompositeOperation = 'destination-over';
        strokeCtx.drawImage(tempCanvas, 0, 0);
        
        // Replace temp canvas with stroked version
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(strokeCanvas, 0, 0);
      }
      
      // Apply Drop Shadow effect
      if (layer.effects?.dropShadow?.enabled) {
        const shadow = layer.effects.dropShadow;
        const angleRad = (shadow.angle * Math.PI) / 180;
        const offsetX = Math.cos(angleRad) * shadow.distance;
        const offsetY = Math.sin(angleRad) * shadow.distance;
        
        const shadowOpacity = (shadow.opacity / 100);
        const shadowColor = this.hexToRgba(shadow.color, shadowOpacity);
        
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadow.size;
        ctx.shadowOffsetX = offsetX;
        ctx.shadowOffsetY = offsetY;
      }
      
      // Outer Glow effect
      if (layer.effects?.outerGlow?.enabled) {
        const glow = layer.effects.outerGlow;
        const glowOpacity = (glow.opacity / 100);
        const glowColor = this.hexToRgba(glow.color, glowOpacity);
        
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glow.size;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      ctx.drawImage(tempCanvas, layer.x, layer.y, layer.width, layer.height);
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.restore();
    }
  }
  
  private async renderSingleLayer(layer: CompositionLayer): Promise<ImageData> {
    let imageData = layer.imageData;
    
    if (layer.removeBackground && layer.backgroundColor) {
      imageData = await this.removeBackground(layer, {
        color: layer.backgroundColor,
        threshold: layer.backgroundThreshold,
        feather: 2
      });
    }
    
    if (layer.tint) {
      imageData = this.applyTint(layer, {
        color: layer.tintColor,
        intensity: layer.tintIntensity / 100,
        blendMode: layer.tintBlendMode,
        preserveLuminosity: false
      });
    }
    
    // Apply custom dither if enabled
    if (layer.customDither?.enabled && !layer.ditherExempt) {
      imageData = this.applyCustomDither(imageData, layer.customDither);
    }
    
    return imageData;
  }
  
  /**
   * Apply custom dither to layer
   */
  private applyCustomDither(
    imageData: ImageData,
    customDither: { 
      algorithm: string; 
      palette?: string; 
      threshold?: number; 
      bayerLevel?: number;
      scale?: number;
      contrast?: number;
      midtones?: number;
      highlights?: number;
      blur?: number;
    }
  ): ImageData {
    // Get current global palette from dithering options
    const globalOptions = this.ditheringOptions();
    
    // Use layer's custom palette if specified, otherwise use global palette
    const paletteToUse = customDither.palette || globalOptions.palette;
    
    // Create custom dithering options using layer's settings
    const customOptions: DitheringOptions = {
      algorithm: customDither.algorithm,
      palette: paletteToUse,
      scale: customDither.scale ?? 1,
      contrast: customDither.contrast ?? 50,
      midtones: customDither.midtones ?? 50,
      highlights: customDither.highlights ?? 50,
      blur: customDither.blur ?? 0,
      threshold: customDither.threshold || 128
    };
    
    return this.ditheringService.applyDithering(imageData, customOptions);
  }
  
  /**
   * ===== UTILITY FUNCTIONS =====
   */
  
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  private overlayBlend(base: number, blend: number): number {
    return base < 128
      ? (2 * base * blend) / 255
      : 255 - (2 * (255 - base) * (255 - blend)) / 255;
  }
  
  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255; g /= 255; b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h, s, l };
  }
  
  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
  
  /**
   * ===== MULTIPLE SELECTION =====
   */
  
  /**
   * Select a single layer (replaces current selection unless shift is pressed)
   */
  selectLayer(layerId: string, addToSelection: boolean = false): void {
    const state = this.compositionState();
    
    if (addToSelection) {
      // Add to existing selection if not already selected
      const selectedLayerIds = state.selectedLayerIds.includes(layerId)
        ? state.selectedLayerIds
        : [...state.selectedLayerIds, layerId];
      
      this.compositionState.set({
        ...state,
        activeLayerId: layerId,
        selectedLayerIds
      });
    } else {
      // Replace selection with single layer
      this.compositionState.set({
        ...state,
        activeLayerId: layerId,
        selectedLayerIds: [layerId]
      });
    }
  }
  
  /**
   * Toggle layer selection (for Shift+Click)
   */
  toggleLayerSelection(layerId: string): void {
    const state = this.compositionState();
    const isSelected = state.selectedLayerIds.includes(layerId);
    
    if (isSelected) {
      // Remove from selection
      const selectedLayerIds = state.selectedLayerIds.filter(id => id !== layerId);
      const newActiveLayerId = selectedLayerIds.length > 0 
        ? selectedLayerIds[selectedLayerIds.length - 1]
        : null;
      
      this.compositionState.set({
        ...state,
        activeLayerId: newActiveLayerId,
        selectedLayerIds
      });
    } else {
      // Add to selection
      this.compositionState.set({
        ...state,
        activeLayerId: layerId,
        selectedLayerIds: [...state.selectedLayerIds, layerId]
      });
    }
  }
  
  /**
   * Clear all selections
   */
  clearSelection(): void {
    const state = this.compositionState();
    this.compositionState.set({
      ...state,
      activeLayerId: null,
      selectedLayerIds: []
    });
  }
  
  /**
   * Select multiple layers
   */
  selectMultipleLayers(layerIds: string[]): void {
    const state = this.compositionState();
    this.compositionState.set({
      ...state,
      activeLayerId: layerIds.length > 0 ? layerIds[0] : null,
      selectedLayerIds: layerIds
    });
  }
  
  /**
   * Update multiple layers at once (for moving selection)
   */
  updateMultipleLayers(updates: { layerId: string; changes: Partial<CompositionLayer> }[]): void {
    const state = this.compositionState();
    const newLayers = [...state.layers];
    
    updates.forEach(({ layerId, changes }) => {
      const layerIndex = newLayers.findIndex(l => l.id === layerId);
      if (layerIndex !== -1) {
        newLayers[layerIndex] = { ...newLayers[layerIndex], ...changes };
      }
    });
    
    this.compositionState.set({
      ...state,
      layers: newLayers
    });
  }
  
  /**
   * Check if a layer is selected
   */
  isLayerSelected(layerId: string): boolean {
    return this.compositionState().selectedLayerIds.includes(layerId);
  }
  
  /**
   * Get all selected layers
   */
  getSelectedLayers(): CompositionLayer[] {
    const state = this.compositionState();
    return state.layers.filter(l => state.selectedLayerIds.includes(l.id));
  }

  /**
   * Update all selected layers with the same updates
   */
  updateSelectedLayers(updates: Partial<CompositionLayer>): void {
    const state = this.compositionState();
    const selectedIds = state.selectedLayerIds;
    
    if (selectedIds.length === 0) return;
    
    const newLayers = state.layers.map(layer => 
      selectedIds.includes(layer.id) 
        ? { ...layer, ...updates }
        : layer
    );
    
    this.compositionState.set({
      ...state,
      layers: newLayers
    });
  }

  /**
   * Copy selected layers to clipboard
   */
  private clipboard: CompositionLayer[] = [];

  copySelectedLayers(): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    // Deep clone the layers for clipboard
    this.clipboard = selectedLayers.map(layer => ({
      ...layer,
      imageData: new ImageData(
        new Uint8ClampedArray(layer.imageData.data),
        layer.imageData.width,
        layer.imageData.height
      ),
      // Deep clone effects
      effects: layer.effects ? {
        stroke: layer.effects.stroke ? { ...layer.effects.stroke } : undefined,
        dropShadow: layer.effects.dropShadow ? { ...layer.effects.dropShadow } : undefined,
        outerGlow: layer.effects.outerGlow ? { ...layer.effects.outerGlow } : undefined
      } : undefined,
      // Deep clone customDither
      customDither: layer.customDither ? { ...layer.customDither } : undefined
    }));
  }

  /**
   * Get clipboard layers without pasting
   */
  getClipboardLayers(): CompositionLayer[] {
    return this.clipboard;
  }

  /**
   * Paste layers from clipboard
   */
  pasteFromClipboard(): void {
    if (this.clipboard.length === 0) return;

    const state = this.compositionState();
    const newLayerIds: string[] = [];
    const newLayers: CompositionLayer[] = [];

    // Paste each layer with offset
    for (const clipboardLayer of this.clipboard) {
      const newId = `layer-${Date.now()}-${Math.random()}`;
      const newLayer: CompositionLayer = {
        ...clipboardLayer,
        id: newId,
        name: `${clipboardLayer.name} (copy)`,
        order: state.layers.length + newLayers.length,
        x: clipboardLayer.x + 20, // Offset by 20px
        y: clipboardLayer.y + 20,
        imageData: new ImageData(
          new Uint8ClampedArray(clipboardLayer.imageData.data),
          clipboardLayer.imageData.width,
          clipboardLayer.imageData.height
        ),
        // Deep clone effects
        effects: clipboardLayer.effects ? {
          stroke: clipboardLayer.effects.stroke ? { ...clipboardLayer.effects.stroke } : undefined,
          dropShadow: clipboardLayer.effects.dropShadow ? { ...clipboardLayer.effects.dropShadow } : undefined,
          outerGlow: clipboardLayer.effects.outerGlow ? { ...clipboardLayer.effects.outerGlow } : undefined
        } : undefined,
        // Deep clone customDither
        customDither: clipboardLayer.customDither ? { ...clipboardLayer.customDither } : undefined
      };

      newLayers.push(newLayer);
      newLayerIds.push(newId);
    }

    // Add new layers to state and select them
    this.compositionState.set({
      ...state,
      layers: [...state.layers, ...newLayers],
      activeLayerId: newLayerIds[newLayerIds.length - 1],
      selectedLayerIds: newLayerIds
    });
  }

  /**
   * Duplicate selected layers (copy + paste)
   * Returns array of new layer IDs
   */
  duplicateSelectedLayers(): string[] {
    const beforeCount = this.compositionState().layers.length;
    this.copySelectedLayers();
    this.pasteFromClipboard();
    
    // Get the newly created layer IDs
    const afterState = this.compositionState();
    const newLayerIds = afterState.selectedLayerIds; // The pasted layers are automatically selected
    
    return newLayerIds;
  }

  /**
   * ===== BATCH OPERATIONS =====
   */

  /**
   * Apply custom dither to selected layers
   */
  applyCustomDitherToSelection(customDither: CompositionLayer['customDither']): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    const updates = selectedLayers.map(layer => ({
      layerId: layer.id,
      changes: { customDither }
    }));

    this.updateMultipleLayers(updates);
  }

  /**
   * Apply tint to selected layers
   */
  applyTintToSelection(tint: boolean, tintColor: string, tintIntensity: number, tintBlendMode: BlendMode): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    const updates = selectedLayers.map(layer => ({
      layerId: layer.id,
      changes: { tint, tintColor, tintIntensity, tintBlendMode }
    }));

    this.updateMultipleLayers(updates);
  }

  /**
   * Apply background removal to selected layers
   */
  applyBackgroundRemovalToSelection(removeBackground: boolean, backgroundColor?: string, backgroundThreshold?: number): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    const updates = selectedLayers.map(layer => ({
      layerId: layer.id,
      changes: { 
        removeBackground, 
        backgroundColor: backgroundColor ?? layer.backgroundColor,
        backgroundThreshold: backgroundThreshold ?? layer.backgroundThreshold
      }
    }));

    this.updateMultipleLayers(updates);
  }

  /**
   * Toggle dither exempt for selected layers
   */
  toggleDitherExemptForSelection(ditherExempt: boolean): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    const updates = selectedLayers.map(layer => ({
      layerId: layer.id,
      changes: { ditherExempt }
    }));

    this.updateMultipleLayers(updates);
  }

  /**
   * Set opacity for selected layers
   */
  setOpacityForSelection(opacity: number): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    const updates = selectedLayers.map(layer => ({
      layerId: layer.id,
      changes: { opacity }
    }));

    this.updateMultipleLayers(updates);
  }

  /**
   * Apply blend mode to selected layers (if supported in future)
   */
  applyBlendModeToSelection(blendMode: BlendMode): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    const updates = selectedLayers.map(layer => ({
      layerId: layer.id,
      changes: { tintBlendMode: blendMode }
    }));

    this.updateMultipleLayers(updates);
  }

  /**
   * Lock/unlock selected layers
   */
  setLockedForSelection(locked: boolean): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    const updates = selectedLayers.map(layer => ({
      layerId: layer.id,
      changes: { locked }
    }));

    this.updateMultipleLayers(updates);
  }

  /**
   * Show/hide selected layers
   */
  setVisibilityForSelection(visible: boolean): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    const updates = selectedLayers.map(layer => ({
      layerId: layer.id,
      changes: { visible }
    }));

    this.updateMultipleLayers(updates);
  }

  /**
   * Apply effects to selected layers
   */
  applyEffectsToSelection(effects: CompositionLayer['effects']): void {
    const selectedLayers = this.getSelectedLayers();
    if (selectedLayers.length === 0) return;

    const updates = selectedLayers.map(layer => ({
      layerId: layer.id,
      changes: { effects: effects ? { ...effects } : undefined }
    }));

    this.updateMultipleLayers(updates);
  }
}
