export interface DiffusionKernel {
  dx: number;
  dy: number;
  weight: number;
}

export const FLOYD_STEINBERG: DiffusionKernel[] = [
  { dx: 1, dy: 0, weight: 7 / 16 },
  { dx: -1, dy: 1, weight: 3 / 16 },
  { dx: 0, dy: 1, weight: 5 / 16 },
  { dx: 1, dy: 1, weight: 1 / 16 },
];

export const ATKINSON: DiffusionKernel[] = [
  { dx: 1, dy: 0, weight: 1 / 8 },
  { dx: 2, dy: 0, weight: 1 / 8 },
  { dx: -1, dy: 1, weight: 1 / 8 },
  { dx: 0, dy: 1, weight: 1 / 8 },
  { dx: 1, dy: 1, weight: 1 / 8 },
  { dx: 0, dy: 2, weight: 1 / 8 },
];

export const JARVIS_JUDICE_NINKE: DiffusionKernel[] = [
  { dx: 1, dy: 0, weight: 7 / 48 },
  { dx: 2, dy: 0, weight: 5 / 48 },
  { dx: -2, dy: 1, weight: 3 / 48 },
  { dx: -1, dy: 1, weight: 5 / 48 },
  { dx: 0, dy: 1, weight: 7 / 48 },
  { dx: 1, dy: 1, weight: 5 / 48 },
  { dx: 2, dy: 1, weight: 3 / 48 },
  { dx: -2, dy: 2, weight: 1 / 48 },
  { dx: -1, dy: 2, weight: 3 / 48 },
  { dx: 0, dy: 2, weight: 5 / 48 },
  { dx: 1, dy: 2, weight: 3 / 48 },
  { dx: 2, dy: 2, weight: 1 / 48 },
];

export const STUCKI: DiffusionKernel[] = [
  { dx: 1, dy: 0, weight: 8 / 42 },
  { dx: 2, dy: 0, weight: 4 / 42 },
  { dx: -2, dy: 1, weight: 2 / 42 },
  { dx: -1, dy: 1, weight: 4 / 42 },
  { dx: 0, dy: 1, weight: 8 / 42 },
  { dx: 1, dy: 1, weight: 4 / 42 },
  { dx: 2, dy: 1, weight: 2 / 42 },
  { dx: -2, dy: 2, weight: 1 / 42 },
  { dx: -1, dy: 2, weight: 2 / 42 },
  { dx: 0, dy: 2, weight: 4 / 42 },
  { dx: 1, dy: 2, weight: 2 / 42 },
  { dx: 2, dy: 2, weight: 1 / 42 },
];

export const BURKES: DiffusionKernel[] = [
  { dx: 1, dy: 0, weight: 8 / 32 },
  { dx: 2, dy: 0, weight: 4 / 32 },
  { dx: -2, dy: 1, weight: 2 / 32 },
  { dx: -1, dy: 1, weight: 4 / 32 },
  { dx: 0, dy: 1, weight: 8 / 32 },
  { dx: 1, dy: 1, weight: 4 / 32 },
  { dx: 2, dy: 1, weight: 2 / 32 },
];

export const SIERRA: DiffusionKernel[] = [
  { dx: 1, dy: 0, weight: 5 / 32 },
  { dx: 2, dy: 0, weight: 3 / 32 },
  { dx: -2, dy: 1, weight: 2 / 32 },
  { dx: -1, dy: 1, weight: 4 / 32 },
  { dx: 0, dy: 1, weight: 5 / 32 },
  { dx: 1, dy: 1, weight: 4 / 32 },
  { dx: 2, dy: 1, weight: 2 / 32 },
  { dx: -1, dy: 2, weight: 2 / 32 },
  { dx: 0, dy: 2, weight: 3 / 32 },
  { dx: 1, dy: 2, weight: 2 / 32 },
];

export const SIERRA_LITE: DiffusionKernel[] = [
  { dx: 1, dy: 0, weight: 2 / 4 },
  { dx: -1, dy: 1, weight: 1 / 4 },
  { dx: 0, dy: 1, weight: 1 / 4 },
];

export const ERROR_DIFFUSION_KERNELS: { [key: string]: DiffusionKernel[] } = {
  'floyd-steinberg': FLOYD_STEINBERG,
  'atkinson': ATKINSON,
  'jarvis-judice-ninke': JARVIS_JUDICE_NINKE,
  'stucki': STUCKI,
  'burkes': BURKES,
  'sierra': SIERRA,
  'sierra-lite': SIERRA_LITE,
};
