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
  
  // Motion Sense options - EXPANDED with WebGL
  motionDirection?: 'horizontal' | 'vertical' | 'radial' | 'zoom' | 'spin' | 'wave' | 'spiral';
  motionSpeed?: number;
  motionBlurSamples?: number;        // 4-16 motion blur quality
  motionBlurSpread?: number;         // 0.1-2.0 blur spread distance
  motionChromaticAberration?: number; // 0-0.02 RGB separation
  motionVignette?: number;           // 0-1 vignette intensity
  motionDistortion?: number;         // -0.5 to 0.5 lens distortion
  motionTrails?: number;             // 0-0.9 motion trail persistence
  motionEdgeGlow?: number;           // 0-2 glow on motion edges
  
  // Particles options - EXPANDED for WebGL rendering
  particleType?: 'snow' | 'rain' | 'sparkles' | 'fireflies' | 'bubbles' | 'leaves' | 'embers' | 'stars' | 'confetti' | 'dust' | 'custom';
  particleDensity?: number; // 0-1 particle count multiplier
  particleCustomSprite?: string; // base64 sprite data for custom type
  particleSize?: number; // 0.5-10 base particle size
  particleSpeed?: number; // 0.1-5 movement speed
  
  // Visual properties
  particleOpacity?: number; // 0-1 transparency
  particleGlow?: number; // 0-2 glow intensity
  particleBlur?: number; // 0-5 blur amount
  particleCustomColorR?: number; // 0-255
  particleCustomColorG?: number; // 0-255
  particleCustomColorB?: number; // 0-255
  particleUseCustomColor?: boolean;
  particleColorVariation?: number; // 0-1 color randomness
  
  // Physics
  particleGravity?: number; // -2 to 2 vertical force
  particleWind?: number; // -2 to 2 horizontal force
  particleTurbulence?: number; // 0-2 random movement
  particleRotation?: number; // 0-5 rotation speed
  
  // Behavior
  particleFadeIn?: number; // 0-1 fade in distance
  particleFadeOut?: number; // 0-1 fade out distance
  particleTwinkle?: number; // 0-2 brightness variation
  particleDepth?: number; // 0-1 3D depth effect (parallax)
  
  // Spawn area
  particleSpawnArea?: 'full' | 'top' | 'bottom' | 'left' | 'right' | 'edges' | 'center';
  
  // Blend mode
  particleBlendMode?: 'normal' | 'additive' | 'multiply' | 'screen';
  
  // Dithering
  particleDitherEnabled?: boolean;
  particleDitherAlgorithm?: 'bayer-2x2' | 'bayer-4x4' | 'bayer-8x8' | 'floyd-steinberg' | 'atkinson' | 'ordered';
  particleDitherPalette?: 'monochrome' | 'gameboy' | 'cga' | 'commodore64' | 'apple2' | 'custom';
  particleDitherIntensity?: number; // 0-1 dithering strength
  
  // Flames options - EXPANDED for maximum control
  flameHeight?: number; // 0-100 % height of flames
  flameSpread?: number; // 0-100 horizontal spread
  flameIntensity?: number; // 0-2 overall intensity multiplier
  flameColor?: 'red' | 'blue' | 'green' | 'purple' | 'rainbow' | 'white' | 'custom' | 'gradient';
  flameTurbulence?: number; // 0-3 noise turbulence
  flameAlgorithm?: 'classic' | 'realistic' | 'plasma' | 'dragon' | 'wispy' | 'inferno';
  
  // Advanced flame controls
  flameDirection?: 'up' | 'down' | 'left' | 'right'; // Direction of flames
  flameSpeed?: number; // 0-5 animation speed multiplier
  flameDistortion?: number; // 0-2 horizontal wave distortion
  flameBaseHeat?: number; // 0-1 minimum heat value (affects flame base)
  flameBrightness?: number; // 0-2 brightness multiplier
  flameContrast?: number; // 0-2 color contrast
  flameNoiseScale?: number; // 0.1-5 scale of noise pattern
  flameNoiseOctaves?: number; // 1-4 number of noise layers
  flameOpacity?: number; // 0-1 overall opacity
  flameBlendMode?: 'normal' | 'additive' | 'screen' | 'multiply' | 'overlay';
  
  // Custom color (RGB 0-255)
  flameCustomColorR?: number;
  flameCustomColorG?: number;
  flameCustomColorB?: number;
  
  // Gradient color (second color for gradient mode)
  flameGradientColorR?: number;
  flameGradientColorG?: number;
  flameGradientColorB?: number;
  
  // Positioning
  flameOffsetX?: number; // -100 to 100 horizontal offset %
  flameOffsetY?: number; // -100 to 100 vertical offset %
  
  // Spawn Area Control
  flameSpawnArea?: 'full' | 'bottom' | 'top' | 'left' | 'right' | 'center' | 'first-half' | 'second-half' | 'edges' | 'corners';
  flameSpawnStart?: number; // 0-100 % where flames start appearing
  flameSpawnEnd?: number; // 0-100 % where flames stop appearing
  flameSpawnFadeIn?: number; // 0-100 fade in distance
  flameSpawnFadeOut?: number; // 0-100 fade out distance
  
  // Dithering for flames
  flameDitherEnabled?: boolean; // Enable/disable dithering on flames
  flameDitherAlgorithm?: 'floyd-steinberg' | 'bayer-2x2' | 'bayer-4x4' | 'bayer-8x8' | 'atkinson' | 'ordered';
  flameDitherPalette?: string; // Palette name (e.g., 'gameboy', 'c64', etc.) or 'custom'
  flameDitherColorCount?: number; // 2-256 number of colors (for custom palette)
  flameDitherIntensity?: number; // 0-1 blend between original and dithered
  
  // Quality
  flameSmoothing?: number; // 0-1 edge smoothing
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
    motionSpeed: 1,
    motionBlurSamples: 8,
    motionBlurSpread: 1.0,
    motionChromaticAberration: 0,
    motionVignette: 0,
    motionDistortion: 0,
    motionTrails: 0,
    motionEdgeGlow: 0
  },
  'particles': {
    particleType: 'snow',
    particleDensity: 0.5,
    particleSize: 2.0,
    particleSpeed: 1.0,
    particleOpacity: 0.8,
    particleGlow: 0.5,
    particleBlur: 0,
    particleCustomColorR: 255,
    particleCustomColorG: 255,
    particleCustomColorB: 255,
    particleUseCustomColor: false,
    particleColorVariation: 0.2,
    particleGravity: 0.5,
    particleWind: 0,
    particleTurbulence: 0.5,
    particleRotation: 1.0,
    particleFadeIn: 0.2,
    particleFadeOut: 0.2,
    particleTwinkle: 0.5,
    particleDepth: 0.5,
    particleSpawnArea: 'top',
    particleBlendMode: 'normal',
    particleDitherEnabled: false,
    particleDitherAlgorithm: 'bayer-4x4',
    particleDitherPalette: 'gameboy',
    particleDitherIntensity: 1.0,
    particleCustomSprite: undefined
  },
  'flames': {
    flameHeight: 60,
    flameSpread: 50,
    flameIntensity: 0.7,
    flameColor: 'red',
    flameTurbulence: 1.0,
    flameAlgorithm: 'realistic',
    flameDirection: 'up',
    flameSpeed: 1.0,
    flameDistortion: 0.3,
    flameBaseHeat: 0.1,
    flameBrightness: 1.0,
    flameContrast: 1.0,
    flameNoiseScale: 1.0,
    flameNoiseOctaves: 3,
    flameOpacity: 1.0,
    flameBlendMode: 'additive',
    flameCustomColorR: 255,
    flameCustomColorG: 100,
    flameCustomColorB: 0,
    flameGradientColorR: 255,
    flameGradientColorG: 255,
    flameGradientColorB: 0,
    flameOffsetX: 0,
    flameOffsetY: 0,
    flameSpawnArea: 'full',
    flameSpawnStart: 0,
    flameSpawnEnd: 100,
    flameSpawnFadeIn: 10,
    flameSpawnFadeOut: 10,
    flameDitherEnabled: false,
    flameDitherAlgorithm: 'bayer-4x4',
    flameDitherPalette: 'gameboy',
    flameDitherColorCount: 16,
    flameDitherIntensity: 1.0,
    flameSmoothing: 0.3
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
