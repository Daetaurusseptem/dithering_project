import { Injectable, signal } from '@angular/core';

// Dynamic import to avoid bundling issues
let pipeline: any = null;
let env: any = null;

@Injectable({
  providedIn: 'root'
})
export class AiBackgroundRemovalService {
  private segmenter: any = null;
  private isInitialized = signal(false);
  private isProcessing = signal(false);
  private progress = signal(0);
  private loadingMessage = signal('');
  
  // Max resolution for mobile optimization
  private readonly MAX_RESOLUTION = 1024;
  
  constructor() {
    console.log('🤖 AI Background Removal Service created');
  }
  
  /**
   * Lazy load and initialize the model
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized()) return;
    
    try {
      console.log('🤖 Loading AI model...');
      this.loadingMessage.set('Loading AI model...');
      this.progress.set(10);
      
      // Dynamic import to avoid bundling warnings
      const transformers = await import('@huggingface/transformers');
      pipeline = transformers.pipeline;
      env = transformers.env;
      
      // 🎯 MODO HÍBRIDO: Intenta local primero, fallback a CDN
      // Esto permite: Desarrollo (CDN) + Producción Electron/Ionic (local)
      
      // Detectar si estamos en un entorno empaquetado (Electron/Ionic)
      const isPackaged = !!(window as any).electronAPI || 
                         (window as any).Capacitor ||
                         location.protocol === 'file:';
      
      if (isPackaged) {
        // 📦 MODO OFFLINE (Electron/Ionic/Capacitor)
        console.log('📦 Detected packaged app - using local models');
        env.allowLocalModels = true;   // ✅ Usar modelos locales
        env.allowRemoteModels = false; // ⛔ NO INTERNET
        env.localModelPath = './models/'; // Ruta relativa a public/models
        this.loadingMessage.set('Loading local AI model...');
      } else {
        // 🌐 MODO ONLINE (Desarrollo web normal)
        console.log('🌐 Web mode - downloading from CDN');
        env.allowLocalModels = false;  // Evitar errores de protobuf local
        env.allowRemoteModels = true;  // ✅ Descargar de HuggingFace CDN
        env.useBrowserCache = true;    // Cache en navegador
        this.loadingMessage.set('Downloading model from CDN (~25MB, one-time)...');
      }
      
      this.progress.set(30);
      
      // Use pipeline API - more robust than AutoModel
      // Para producción offline, cambiar a 'rmbg-1.4' si descargaste ese modelo
      const modelName = isPackaged ? 'rmbg-1.4' : 'Xenova/modnet';
      console.log(`🎭 Loading model: ${modelName}`);
      
      this.segmenter = await pipeline('image-segmentation', modelName, {
        revision: 'main',
      });
      
      this.isInitialized.set(true);
      this.progress.set(100);
      this.loadingMessage.set('Ready!');
      console.log('✅ AI Background Removal initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AI Background Removal:', error);
      this.loadingMessage.set('Failed to load model');
      throw error;
    }
  }
  
  /**
   * Optimize image resolution for mobile devices
   */
  private optimizeResolution(imageData: ImageData): { 
    optimized: ImageData; 
    scale: number;
    originalWidth: number;
    originalHeight: number;
  } {
    const { width, height } = imageData;
    
    // If already small enough, return as-is
    if (width <= this.MAX_RESOLUTION && height <= this.MAX_RESOLUTION) {
      return { 
        optimized: imageData, 
        scale: 1,
        originalWidth: width,
        originalHeight: height
      };
    }
    
    // Calculate scale to fit within MAX_RESOLUTION
    const scale = Math.min(
      this.MAX_RESOLUTION / width,
      this.MAX_RESOLUTION / height
    );
    
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);
    
    console.log(`📐 Optimizing: ${width}x${height} → ${newWidth}x${newHeight} (scale: ${scale.toFixed(2)})`);
    
    // Downscale using canvas
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d')!;
    
    // Draw original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Smooth downscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
    
    return {
      optimized: ctx.getImageData(0, 0, newWidth, newHeight),
      scale,
      originalWidth: width,
      originalHeight: height
    };
  }
  
  /**
   * Remove background from image using AI
   */
  async removeBackground(imageData: ImageData): Promise<ImageData> {
    // Initialize model if needed (lazy loading)
    if (!this.isInitialized()) {
      await this.initialize();
    }
    
    if (this.isProcessing()) {
      throw new Error('Already processing an image');
    }
    
    this.isProcessing.set(true);
    this.progress.set(0);
    
    try {
      console.log('🎨 Removing background with AI...');
      this.loadingMessage.set('Preparing image...');
      this.progress.set(20);
      
      // Optimize resolution for mobile
      const { optimized, scale, originalWidth, originalHeight } = 
        this.optimizeResolution(imageData);
      
      // Convert ImageData to canvas
      const canvas = document.createElement('canvas');
      canvas.width = optimized.width;
      canvas.height = optimized.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(optimized, 0, 0);
      
      this.progress.set(40);
      this.loadingMessage.set('Running AI model...');
      
      // Run segmentation - pipeline works directly with canvas/image
      console.log('📸 Sending image to AI model...');
      const result = await this.segmenter(canvas.toDataURL());
      console.log('✅ AI result:', result);
      
      this.progress.set(70);
      this.loadingMessage.set('Processing mask...');
      
      // Result is array of segments
      if (!result || result.length === 0) {
        throw new Error('No segments detected in image');
      }
      
      // Get mask from first segment (usually the main subject)
      const segment = result[0];
      console.log('🎭 Segment:', segment);
      
      // The mask is a RawImage object from Transformers.js
      // We need to convert it to ImageData
      let maskImageData: ImageData;
      
      if (segment.mask) {
        const maskRawImage = segment.mask; // This is a RawImage object
        console.log('🖼️ Mask dimensions:', maskRawImage.width, 'x', maskRawImage.height);
        
        // RawImage has .data property which is Uint8ClampedArray or similar
        // Create canvas to work with the mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = maskRawImage.width;
        maskCanvas.height = maskRawImage.height;
        const maskCtx = maskCanvas.getContext('2d')!;
        
        // Convert RawImage to ImageData
        // RawImage.data might be in different formats, let's create proper ImageData
        const tempImageData = maskCtx.createImageData(maskRawImage.width, maskRawImage.height);
        
        // Copy mask data - RawImage might be grayscale, we need to expand to RGBA
        const maskData = maskRawImage.data;
        for (let i = 0; i < maskData.length; i++) {
          const value = maskData[i];
          const idx = i * 4;
          tempImageData.data[idx] = value;     // R
          tempImageData.data[idx + 1] = value; // G
          tempImageData.data[idx + 2] = value; // B
          tempImageData.data[idx + 3] = 255;   // A
        }
        
        maskCtx.putImageData(tempImageData, 0, 0);
        maskImageData = maskCtx.getImageData(0, 0, maskRawImage.width, maskRawImage.height);
      } else {
        throw new Error('No mask found in segmentation result');
      }
      
      this.progress.set(85);
      this.loadingMessage.set('Applying mask...');
      
      // Scale mask back to original size if needed
      let finalMask: ImageData;
      if (scale < 1) {
        // Need to upscale the mask
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = originalWidth;
        finalCanvas.height = originalHeight;
        const finalCtx = finalCanvas.getContext('2d')!;
        
        // Create temp canvas with mask
        const tempMaskCanvas = document.createElement('canvas');
        tempMaskCanvas.width = optimized.width;
        tempMaskCanvas.height = optimized.height;
        const tempMaskCtx = tempMaskCanvas.getContext('2d')!;
        tempMaskCtx.putImageData(maskImageData, 0, 0);
        
        // Upscale
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        finalCtx.drawImage(tempMaskCanvas, 0, 0, originalWidth, originalHeight);
        finalMask = finalCtx.getImageData(0, 0, originalWidth, originalHeight);
      } else {
        finalMask = maskImageData;
      }
      
      // Apply mask to original image
      const outputData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );
      
      // Use mask as alpha channel
      for (let i = 0; i < outputData.data.length; i += 4) {
        const maskAlpha = finalMask.data[i]; // R channel (grayscale)
        outputData.data[i + 3] = maskAlpha;
      }
      
      this.progress.set(100);
      this.loadingMessage.set('Done!');
      console.log('✅ Background removed successfully');
      
      return outputData;
    } catch (error) {
      console.error('❌ Background removal failed:', error);
      this.loadingMessage.set('Error: ' + (error as Error).message);
      throw error;
    } finally {
      this.isProcessing.set(false);
    }
  }
  
  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized();
  }
  
  /**
   * Get current processing status
   */
  getStatus() {
    return {
      initialized: this.isInitialized(),
      processing: this.isProcessing(),
      progress: this.progress()
    };
  }
  
  /**
   * Get progress signal for reactive updates
   */
  getProgressSignal() {
    return this.progress.asReadonly();
  }
  
  /**
   * Get processing signal for reactive updates
   */
  getProcessingSignal() {
    return this.isProcessing.asReadonly();
  }
  
  /**
   * Get loading message signal for UI feedback
   */
  getLoadingMessageSignal() {
    return this.loadingMessage.asReadonly();
  }
}
