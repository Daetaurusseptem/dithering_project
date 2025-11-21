import { Injectable, signal, effect } from '@angular/core';

export type ThemeId = 'retro-green' | 'retro-amber' | 'win98' | 'cyberpunk' | 'vaporwave';

interface ThemeColors {
  // Main colors
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  
  // Accents
  accent: string;
  accentGlow: string;
  success: string;
  warning: string;
  danger: string;
  
  // Shadows & effects
  shadowColor: string;
  glowColor: string;
}

interface Theme {
  id: ThemeId;
  name: string;
  colors: ThemeColors;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'dithering_theme';
  
  private themes: { [key: string]: Theme } = {
    'retro-green': {
      id: 'retro-green',
      name: 'Retro Green (Default)',
      colors: {
        primary: '#00ff00',
        secondary: '#90ee90',
        background: '#0f1f0f',
        surface: '#1a2d1a',
        text: '#00ff00',
        textSecondary: 'rgba(0, 255, 0, 0.6)',
        border: '#00ff00',
        accent: '#00ffcc',
        accentGlow: 'rgba(0, 255, 204, 0.5)',
        success: '#00ff00',
        warning: '#ffaa00',
        danger: '#ff6666',
        shadowColor: 'rgba(0, 255, 0, 0.3)',
        glowColor: 'rgba(0, 255, 0, 0.6)'
      }
    },
    'retro-amber': {
      id: 'retro-amber',
      name: 'Retro Amber',
      colors: {
        primary: '#ffaa00',
        secondary: '#ffcc66',
        background: '#1f1f0f',
        surface: '#2d2d1a',
        text: '#ffaa00',
        textSecondary: 'rgba(255, 170, 0, 0.6)',
        border: '#ffaa00',
        accent: '#ffcc00',
        accentGlow: 'rgba(255, 204, 0, 0.5)',
        success: '#88ff00',
        warning: '#ff8800',
        danger: '#ff4444',
        shadowColor: 'rgba(255, 170, 0, 0.3)',
        glowColor: 'rgba(255, 170, 0, 0.6)'
      }
    },
    'win98': {
      id: 'win98',
      name: 'Windows 98',
      colors: {
        primary: '#000080',
        secondary: '#0000aa',
        background: '#c0c0c0',
        surface: '#ffffff',
        text: '#000000',
        textSecondary: '#808080',
        border: '#000000',
        accent: '#000080',
        accentGlow: 'rgba(0, 0, 128, 0.3)',
        success: '#008000',
        warning: '#ff8800',
        danger: '#ff0000',
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        glowColor: 'rgba(0, 0, 128, 0.4)'
      }
    },
    'cyberpunk': {
      id: 'cyberpunk',
      name: 'Cyberpunk',
      colors: {
        primary: '#ff00ff',
        secondary: '#ff66ff',
        background: '#0a0014',
        surface: '#1a0028',
        text: '#ff00ff',
        textSecondary: 'rgba(255, 0, 255, 0.6)',
        border: '#ff00ff',
        accent: '#00ffff',
        accentGlow: 'rgba(0, 255, 255, 0.5)',
        success: '#00ff88',
        warning: '#ffaa00',
        danger: '#ff0088',
        shadowColor: 'rgba(255, 0, 255, 0.4)',
        glowColor: 'rgba(255, 0, 255, 0.8)'
      }
    },
    'vaporwave': {
      id: 'vaporwave',
      name: 'Vaporwave',
      colors: {
        primary: '#ff6ad5',
        secondary: '#ff88dd',
        background: '#1a0033',
        surface: '#2d0055',
        text: '#ff6ad5',
        textSecondary: 'rgba(255, 106, 213, 0.6)',
        border: '#ff6ad5',
        accent: '#00d4ff',
        accentGlow: 'rgba(0, 212, 255, 0.5)',
        success: '#00ff88',
        warning: '#ffd700',
        danger: '#ff4488',
        shadowColor: 'rgba(255, 106, 213, 0.4)',
        glowColor: 'rgba(255, 106, 213, 0.7)'
      }
    }
  };
  
  currentTheme = signal<ThemeId>(this.loadTheme());
  
  constructor() {
    // Apply theme when it changes
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
    });
  }
  
  private loadTheme(): ThemeId {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored && this.themes[stored]) {
      return stored as ThemeId;
    }
    return 'retro-green';
  }
  
  setTheme(themeId: ThemeId): void {
    if (this.themes[themeId]) {
      this.currentTheme.set(themeId);
      localStorage.setItem(this.STORAGE_KEY, themeId);
    }
  }
  
  getAvailableThemes(): { id: ThemeId; name: string }[] {
    return Object.values(this.themes).map(t => ({ id: t.id, name: t.name }));
  }
  
  getCurrentColors(): ThemeColors {
    const themeId = this.currentTheme();
    return this.themes[themeId].colors;
  }
  
  private applyTheme(themeId: ThemeId): void {
    const theme = this.themes[themeId];
    const root = document.documentElement;
    
    // Set CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVarName = `--theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVarName, value as string);
    });
    
    console.log(`🎨 Theme applied: ${theme.name}`);
  }
}
