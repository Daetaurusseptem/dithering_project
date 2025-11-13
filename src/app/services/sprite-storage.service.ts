import { Injectable } from '@angular/core';

export interface SpriteFrameConfig {
  frameIndex: number;
  emotion: 'idle' | 'processing' | 'success' | 'error' | 'thinking' | 'happy';
  label: string;
}

export interface SpriteSheetConfig {
  imageData: string; // Base64
  framesPerRow: number;
  totalFrames: number;
  frameConfigs: SpriteFrameConfig[];
}

@Injectable({
  providedIn: 'root'
})
export class SpriteStorageService {
  private readonly STORAGE_KEY = 'waifu-sprite-config';

  /**
   * Guarda la configuración del sprite en localStorage
   */
  saveSpriteConfig(config: SpriteSheetConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving sprite config:', error);
    }
  }

  /**
   * Carga la configuración del sprite desde localStorage
   */
  loadSpriteConfig(): SpriteSheetConfig | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading sprite config:', error);
      return null;
    }
  }

  /**
   * Elimina la configuración del sprite
   */
  clearSpriteConfig(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Convierte un archivo a base64
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
