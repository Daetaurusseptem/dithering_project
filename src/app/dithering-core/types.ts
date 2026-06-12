export interface DitheringOptions {
  algorithm: string;
  scale: number;
  contrast: number;
  midtones: number;
  highlights: number;
  blur: number;
  palette?: string;
  paletteColors?: number[][];
  threshold?: number;
}
