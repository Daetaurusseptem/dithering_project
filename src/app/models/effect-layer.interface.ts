export interface EffectLayer {
  id: string;
  type: EffectType;
  enabled: boolean;
  intensity: number;
  options: EffectOptions;
  order: number; // Para el orden de aplicación
}

export type EffectType = 
  | 'scanline' 
  | 'vhs' 
  | 'noise' 
  | 'phosphor' 
  | 'rgb-split' 
  | 'motion-sense'
  | 'particles'
  | 'flames';

export interface EffectOptions {
  // Scanline options
  scanlineThickness?: number;
  scanlineSpacing?: number;
  
  // VHS options
  vhsDistortion?: number;
  vhsColorBleed?: number;
  vhsLineThickness?: number; // Grosor de las líneas de glitch
  vhsBleedRed?: number; // Desplazamiento del canal rojo
  vhsBleedGreen?: number; // Desplazamiento del canal verde
  vhsBleedBlue?: number; // Desplazamiento del canal azul
  vhsTrackingNoise?: number; // Ruido de tracking vertical
  
  // Noise options
  noiseType?: 'film' | 'digital' | 'grain';
  noiseSize?: number;
  
  // Phosphor options
  phosphorDecay?: number;
  phosphorGlow?: number;
  
  // RGB Split options
  rgbSplitDirection?: 'horizontal' | 'vertical' | 'diagonal';
  rgbSplitAmount?: number;
  
  // Motion Sense options
  motionDirection?: 'horizontal' | 'vertical' | 'radial' | 'zoom';
  motionSpeed?: number;
  
  // Particles options
  particleCount?: number;
  particleSize?: number;
  particleColor?: 'white' | 'rainbow' | 'warm' | 'cool';
  particleSpeed?: number;
  particleShape?: 'circle' | 'star' | 'square' | 'sparkle' | 'custom';
  particleEmissionMode?: 'float' | 'burst' | 'fountain' | 'spiral' | 'edges' | 'rain' | 'center';
  particleCustomSprite?: string; // Base64 del sprite dibujado
  
  // Flames options
  flameHeight?: number;
  flameIntensity?: number;
  flameColor?: 'red' | 'blue' | 'green' | 'purple' | 'rainbow';
  flameTurbulence?: number;
  flameAlgorithm?: 'classic' | 'realistic' | 'plasma' | 'dragon' | 'wispy' | 'inferno';
}

export const DEFAULT_EFFECT_OPTIONS: Record<EffectType, EffectOptions> = {
  'scanline': {
    scanlineThickness: 2,
    scanlineSpacing: 4
  },
  'vhs': {
    vhsDistortion: 5,
    vhsColorBleed: 3,
    vhsLineThickness: 2,
    vhsBleedRed: -3,
    vhsBleedGreen: 0,
    vhsBleedBlue: 3,
    vhsTrackingNoise: 2
  },
  'noise': {
    noiseType: 'film',
    noiseSize: 1
  },
  'phosphor': {
    phosphorDecay: 0.7,
    phosphorGlow: 0.5
  },
  'rgb-split': {
    rgbSplitDirection: 'horizontal',
    rgbSplitAmount: 3
  },
  'motion-sense': {
    motionDirection: 'horizontal',
    motionSpeed: 1
  },
  'particles': {
    particleCount: 50,
    particleSize: 3,
    particleColor: 'white',
    particleSpeed: 1,
    particleShape: 'circle',
    particleEmissionMode: 'float',
    particleCustomSprite: ''
  },
  'flames': {
    flameHeight: 100,
    flameIntensity: 0.7,
    flameColor: 'red',
    flameTurbulence: 1,
    flameAlgorithm: 'realistic'
  }
};

export const EFFECT_NAMES: Record<EffectType, string> = {
  'scanline': '📺 CRT Scanline',
  'vhs': '📼 VHS Glitch',
  'noise': '🎞️ Film Noise',
  'phosphor': '💚 Phosphor Decay',
  'rgb-split': '🌈 RGB Split',
  'motion-sense': '🌀 Motion Sense',
  'particles': '✨ Particles',
  'flames': '🔥 Flames'
};
