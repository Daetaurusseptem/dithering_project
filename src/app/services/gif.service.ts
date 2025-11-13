import { Injectable } from '@angular/core';

// Tipo para gif.js
declare const GIF: any;

export interface GifFrame {
  imageData: ImageData;
  delay: number; // milliseconds
}

export interface GifExportOptions {
  quality?: number; // 1-30 (1 = best, 30 = worst)
  workers?: number; // Number of web workers
  workerScript?: string;
  width?: number;
  height?: number;
  repeat?: number; // 0 = loop forever, -1 = no loop, n = loop n times
}

@Injectable({
  providedIn: 'root'
})
export class GifService {
  /**
   * Crea un GIF animado desde una sola imagen aplicando ruido variable
   */
  async createAnimatedGifFromImage(
    imageData: ImageData,
    frameCount: number = 10,
    noiseIntensity: number = 0.1
  ): Promise<GifFrame[]> {
    const frames: GifFrame[] = [];
    
    for (let i = 0; i < frameCount; i++) {
      // Crear una copia del imageData
      const frameData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );
      
      // Aplicar ruido animado
      this.applyAnimatedNoise(frameData, i, noiseIntensity);
      
      frames.push({
        imageData: frameData,
        delay: 100 // 100ms por frame = 10 FPS
      });
    }
    
    return frames;
  }

  /**
   * Aplica ruido animado a un frame
   */
  private applyAnimatedNoise(imageData: ImageData, frameIndex: number, intensity: number) {
    const data = imageData.data;
    const seed = frameIndex * 1000;
    
    for (let i = 0; i < data.length; i += 4) {
      // Generar ruido pseudo-aleatorio basado en posición y frame
      const noise = (this.seededRandom(seed + i) - 0.5) * 2 * intensity * 255;
      
      // Aplicar ruido a cada canal RGB
      data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
      // Alpha permanece sin cambios
    }
  }

  /**
   * Genera un número pseudo-aleatorio basado en una semilla
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Extrae frames de un GIF animado
   */
  async extractGifFrames(file: File): Promise<GifFrame[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const frames = await this.parseGif(arrayBuffer);
          resolve(frames);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parser básico de GIF (simplificado)
   * Para producción, se recomienda usar una librería como 'gifuct-js'
   */
  private async parseGif(arrayBuffer: ArrayBuffer): Promise<GifFrame[]> {
    // Por ahora, implementación básica que carga el GIF como imagen
    // y crea un solo frame
    const blob = new Blob([arrayBuffer], { type: 'image/gif' });
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        resolve([{
          imageData,
          delay: 100
        }]);
        
        URL.revokeObjectURL(url);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load GIF'));
      };
      
      img.src = url;
    });
  }

  /**
   * Exporta frames como GIF animado usando gif.js
   */
  async exportAsGif(
    frames: GifFrame[], 
    options?: GifExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (frames.length === 0) {
      throw new Error('No frames to export');
    }

    return new Promise((resolve, reject) => {
      try {
        // Configurar gif.js
        const gif = new GIF({
          workers: options?.workers || 2,
          quality: options?.quality || 10,
          width: options?.width || frames[0].imageData.width,
          height: options?.height || frames[0].imageData.height,
          workerScript: '/gif.worker.js', // Ruta relativa a public/
          repeat: options?.repeat ?? 0 // 0 = loop forever
        });

        // Escuchar progreso
        gif.on('progress', (p: number) => {
          if (onProgress) {
            onProgress(Math.floor(p * 100));
          }
        });

        // Cuando termine
        gif.on('finished', (blob: Blob) => {
          resolve(blob);
        });

        // Agregar frames
        frames.forEach(frame => {
          // Convertir ImageData a canvas
          const canvas = document.createElement('canvas');
          canvas.width = frame.imageData.width;
          canvas.height = frame.imageData.height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.putImageData(frame.imageData, 0, 0);
            gif.addFrame(canvas, { delay: frame.delay });
          }
        });

        // Renderizar
        gif.render();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Crea un dither scan effect (escaneo de líneas que se mueve)
   */
  async createScanlineEffect(
    imageData: ImageData,
    frameCount: number = 20
  ): Promise<GifFrame[]> {
    const frames: GifFrame[] = [];
    
    for (let i = 0; i < frameCount; i++) {
      const frameData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );
      
      // Aplicar efecto de scanline que se mueve
      this.applyScanlineEffect(frameData, i, frameCount);
      
      frames.push({
        imageData: frameData,
        delay: 50 // 50ms por frame = 20 FPS
      });
    }
    
    return frames;
  }

  /**
   * Aplica un efecto de scanline animado
   */
  private applyScanlineEffect(imageData: ImageData, frameIndex: number, totalFrames: number) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Calcular la posición de la línea de escaneo
    const scanlinePosition = (frameIndex / totalFrames) * height;
    const scanlineThickness = 3;
    
    for (let y = 0; y < height; y++) {
      const distanceFromScanline = Math.abs(y - scanlinePosition);
      
      if (distanceFromScanline < scanlineThickness) {
        // Área de scanline - hacer más brillante
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const brightness = 1.3;
          
          data[i] = Math.min(255, data[i] * brightness);     // R
          data[i + 1] = Math.min(255, data[i + 1] * brightness); // G
          data[i + 2] = Math.min(255, data[i + 2] * brightness); // B
        }
      } else if (distanceFromScanline < scanlineThickness * 3) {
        // Área de penumbra - oscurecer levemente
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const darkness = 0.95;
          
          data[i] = data[i] * darkness;     // R
          data[i + 1] = data[i + 1] * darkness; // G
          data[i + 2] = data[i + 2] * darkness; // B
        }
      }
    }
  }

  /**
   * Efecto VHS - líneas de interferencia y distorsión
   */
  async createVHSEffect(
    imageData: ImageData,
    frameCount: number = 15
  ): Promise<GifFrame[]> {
    const frames: GifFrame[] = [];
    
    for (let i = 0; i < frameCount; i++) {
      const frameData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );
      
      // Aplicar glitches VHS aleatorios
      this.applyVHSGlitch(frameData, i);
      
      frames.push({
        imageData: frameData,
        delay: 66 // ~15 FPS
      });
    }
    
    return frames;
  }

  /**
   * Aplica glitch VHS
   */
  private applyVHSGlitch(imageData: ImageData, frameIndex: number) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Líneas horizontales de glitch aleatorias
    const glitchLines = Math.floor(this.seededRandom(frameIndex * 123) * 5);
    
    for (let line = 0; line < glitchLines; line++) {
      const y = Math.floor(this.seededRandom(frameIndex * 456 + line * 789) * height);
      const offset = Math.floor((this.seededRandom(frameIndex * 234 + line * 567) - 0.5) * width * 0.1);
      
      // Desplazar la línea horizontalmente
      const rowData = new Uint8ClampedArray(width * 4);
      for (let x = 0; x < width; x++) {
        const srcX = (x - offset + width) % width;
        const srcI = (y * width + srcX) * 4;
        const dstI = x * 4;
        
        rowData[dstI] = data[srcI];
        rowData[dstI + 1] = data[srcI + 1];
        rowData[dstI + 2] = data[srcI + 2];
        rowData[dstI + 3] = data[srcI + 3];
      }
      
      // Copiar de vuelta
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const srcI = x * 4;
        
        data[i] = rowData[srcI];
        data[i + 1] = rowData[srcI + 1];
        data[i + 2] = rowData[srcI + 2];
        data[i + 3] = rowData[srcI + 3];
      }
    }
    
    // Agregar ruido general
    this.applyAnimatedNoise(imageData, frameIndex, 0.02);
  }
}
