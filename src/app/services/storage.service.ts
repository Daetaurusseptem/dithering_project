import { Injectable } from '@angular/core';

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  isCustom: boolean;
}

export interface DitheringPreset {
  id: string;
  name: string;
  algorithm: string;
  palette: string;
  scale: number;
  contrast: number;
  midtones: number;
  highlights: number;
  blur: number;
  customPalette?: ColorPalette;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly PALETTES_KEY = 'dithering_custom_palettes';
  private readonly PRESETS_KEY = 'dithering_presets';

  constructor() { }

  // Paletas personalizadas
  getCustomPalettes(): ColorPalette[] {
    const stored = localStorage.getItem(this.PALETTES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  saveCustomPalette(palette: ColorPalette): void {
    const palettes = this.getCustomPalettes();
    const existingIndex = palettes.findIndex(p => p.id === palette.id);
    
    if (existingIndex >= 0) {
      palettes[existingIndex] = palette;
    } else {
      palettes.push(palette);
    }
    
    localStorage.setItem(this.PALETTES_KEY, JSON.stringify(palettes));
  }

  deleteCustomPalette(paletteId: string): void {
    const palettes = this.getCustomPalettes().filter(p => p.id !== paletteId);
    localStorage.setItem(this.PALETTES_KEY, JSON.stringify(palettes));
  }

  // Presets
  getPresets(): DitheringPreset[] {
    const stored = localStorage.getItem(this.PRESETS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  savePreset(preset: DitheringPreset): void {
    const presets = this.getPresets();
    const existingIndex = presets.findIndex(p => p.id === preset.id);
    
    if (existingIndex >= 0) {
      presets[existingIndex] = preset;
    } else {
      presets.push(preset);
    }
    
    localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
  }

  deletePreset(presetId: string): void {
    const presets = this.getPresets().filter(p => p.id !== presetId);
    localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
  }

  loadPreset(presetId: string): DitheringPreset | null {
    const presets = this.getPresets();
    return presets.find(p => p.id === presetId) || null;
  }
}
