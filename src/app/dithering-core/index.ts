export type { DitheringOptions } from './types';
export { COLOR_PALETTES, hexToRgb } from './palettes';
export { clamp, findClosestPaletteColor, quantizeColor, distributeError } from './helpers';
export { ERROR_DIFFUSION_KERNELS, FLOYD_STEINBERG, ATKINSON, JARVIS_JUDICE_NINKE, STUCKI, BURKES, SIERRA, SIERRA_LITE } from './error-diffusion-kernels';
export type { DiffusionKernel } from './error-diffusion-kernels';
export { applyErrorDiffusion, applyOrderedDithering, applyRandomDithering, applyHalftonePattern, applyCrosshatchPattern } from './dithering-algorithms';
