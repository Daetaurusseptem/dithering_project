export interface CompositionLayer {
  id: string;
  name: string;
  type: 'image' | 'shape' | 'text' | 'brush'; // Layer type
  image: HTMLImageElement;
  imageData: ImageData;
  visible: boolean;
  locked: boolean;
  order: number; // z-index
  
  // Transform properties
  x: number; // position X (pixels)
  y: number; // position Y (pixels)
  width: number; // scaled width
  height: number; // scaled height
  rotation: number; // degrees
  opacity: number; // 0-100
  
  // Visual effects
  removeBackground: boolean;
  backgroundColor?: string; // Color to remove (hex)
  backgroundThreshold: number; // 0-100, tolerance for removal
  
  tint: boolean;
  tintColor: string; // hex color
  tintIntensity: number; // 0-100
  tintBlendMode: BlendMode;
  
  // Dithering control
  ditherExempt: boolean; // Si es true, esta capa NO recibe dithering
  
  // Custom dithering (optional per-layer dithering settings)
  customDither?: {
    enabled: boolean;
    algorithm: string; // floyd-steinberg, atkinson, bayer, etc
    palette?: string; // Custom palette ID or 'monochrome', 'grayscale', etc
    threshold?: number; // 0-255 for threshold algorithm
    bayerLevel?: number; // 2, 4, 8, 16 for bayer
    scale?: number; // Scale multiplier
    contrast?: number; // 0-100
    midtones?: number; // 0-100
    highlights?: number; // 0-100
    blur?: number; // Blur amount
  };
  
  // Shape properties (for shape layers)
  shapeType?: 'rectangle' | 'circle' | 'ellipse' | 'polygon' | 'star' | 'line';
  shapeFillColor?: string;
  shapeStrokeColor?: string;
  shapeStrokeWidth?: number;
  shapeFilled?: boolean;
  
  // Text properties (for text layers)
  textContent?: string;
  textFontFamily?: string;
  textFontSize?: number;
  textColor?: string;
  textBold?: boolean;
  textItalic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  textStrokeEnabled?: boolean;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  
  // Layer effects (direct properties for easier access)
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  
  glowEnabled?: boolean;
  glowColor?: string;
  glowIntensity?: number;
  
  // Layer effects (Fusion Options - Photoshop style)
  effects?: LayerEffects;
  
  // Metadata
  thumbnail?: string; // base64 thumbnail
}

export interface LayerEffects {
  // Stroke
  stroke?: {
    enabled: boolean;
    color: string;
    width: number;
    position: 'outside' | 'inside' | 'center';
  };
  
  // Drop Shadow
  dropShadow?: {
    enabled: boolean;
    color: string;
    opacity: number;
    angle: number;
    distance: number;
    spread: number;
    size: number;
  };
  
  // Inner Shadow
  innerShadow?: {
    enabled: boolean;
    color: string;
    opacity: number;
    angle: number;
    distance: number;
    size: number;
  };
  
  // Outer Glow
  outerGlow?: {
    enabled: boolean;
    color: string;
    opacity: number;
    size: number;
    spread: number;
  };
  
  // Inner Glow
  innerGlow?: {
    enabled: boolean;
    color: string;
    opacity: number;
    size: number;
  };
  
  // Bevel & Emboss
  bevel?: {
    enabled: boolean;
    style: 'outer' | 'inner' | 'emboss' | 'pillow';
    depth: number;
    size: number;
    soften: number;
    angle: number;
    altitude: number;
  };
}

export type BlendMode = 
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'color'
  | 'hue'
  | 'saturation';

export interface CompositionState {
  layers: CompositionLayer[];
  activeLayerId: string | null; // Kept for backwards compatibility
  selectedLayerIds: string[]; // Multiple selection support
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
}

export interface BackgroundRemovalOptions {
  color: string; // Target color to remove
  threshold: number; // Tolerance (0-255)
  feather: number; // Edge softening (0-10 pixels)
}

export interface TintOptions {
  color: string;
  intensity: number; // 0-1
  blendMode: BlendMode;
  preserveLuminosity: boolean;
}

// Helper para generar ID único
export function generateLayerId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper para crear capa por defecto
export function createDefaultLayer(
  image: HTMLImageElement,
  imageData: ImageData,
  order: number
): CompositionLayer {
  return {
    id: generateLayerId(),
    name: `Layer ${order + 1}`,
    type: 'image',
    image,
    imageData,
    visible: true,
    locked: false,
    order,
    x: 0,
    y: 0,
    width: imageData.width,
    height: imageData.height,
    rotation: 0,
    opacity: 100,
    removeBackground: false,
    backgroundColor: '#ffffff',
    backgroundThreshold: 30,
    tint: false,
    tintColor: '#ffffff',
    tintIntensity: 50,
    tintBlendMode: 'normal',
    ditherExempt: false
  };
}
