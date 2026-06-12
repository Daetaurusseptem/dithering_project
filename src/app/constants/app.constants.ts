export const MAX_GIF_DIMENSION = 600;
export const MAX_EXPORT_DIMENSION = 1200;

export const MOBILE_MAX_WIDTH = 767;
export const TABLET_MAX_WIDTH = 1024;

export const LOW_END_MOBILE_MAX_DIMENSION = 800;
export const HIGH_END_MOBILE_MAX_DIMENSION = 1200;
export const TABLET_MAX_DIMENSION = 1600;
export const DESKTOP_MAX_DIMENSION = 2400;

export const DEFAULT_CANVAS_WIDTH = 800;
export const DEFAULT_CANVAS_HEIGHT = 600;

export const PROCESS_DEBOUNCE_MS = 300;
export const GIF_PREVIEW_DEBOUNCE_MS = 300;
export const WAIFU_STATE_IDLE_DELAY_MS = 2000;
export const WAIFU_SUCCESS_DELAY_MS = 1500;

export const DEFAULT_DITHERING_THRESHOLD = 128;

export function fpsToDelay(fps: number): number {
  return Math.floor(1000 / fps);
}
