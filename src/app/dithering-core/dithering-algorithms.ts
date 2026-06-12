import { DiffusionKernel } from './error-diffusion-kernels';
import { clamp, findClosestPaletteColor, quantizeColor, distributeError } from './helpers';

export function applyErrorDiffusion(
  imageData: ImageData,
  kernel: DiffusionKernel[],
  palette: number[][] | null
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldR = data[idx];
      const oldG = data[idx + 1];
      const oldB = data[idx + 2];

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(oldR, oldG, oldB, palette)
        : quantizeColor(oldR, oldG, oldB);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      for (const { dx, dy, weight } of kernel) {
        distributeError(data, width, height, x + dx, y + dy, errR, errG, errB, weight);
      }
    }
  }

  return imageData;
}

export function applyOrderedDithering(
  imageData: ImageData,
  matrixSize: number,
  palette: number[][] | null
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const matrices: { [key: number]: number[][] } = {
    2: [[0, 2], [3, 1]],
    4: [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ],
    8: [
      [0, 32, 8, 40, 2, 34, 10, 42],
      [48, 16, 56, 24, 50, 18, 58, 26],
      [12, 44, 4, 36, 14, 46, 6, 38],
      [60, 28, 52, 20, 62, 30, 54, 22],
      [3, 35, 11, 43, 1, 33, 9, 41],
      [51, 19, 59, 27, 49, 17, 57, 25],
      [15, 47, 7, 39, 13, 45, 5, 37],
      [63, 31, 55, 23, 61, 29, 53, 21]
    ]
  };

  const matrix = matrices[matrixSize];
  const divisor = matrixSize * matrixSize;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const threshold = (matrix[y % matrixSize][x % matrixSize] / divisor - 0.5) * 255;

      let r = data[idx] + threshold;
      let g = data[idx + 1] + threshold;
      let b = data[idx + 2] + threshold;

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(r, g, b, palette)
        : quantizeColor(r, g, b);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;
    }
  }

  return imageData;
}

export function applyRandomDithering(
  imageData: ImageData,
  threshold: number,
  palette: number[][] | null
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const randomThreshold = (Math.random() - 0.5) * threshold;

      let r = data[idx] + randomThreshold;
      let g = data[idx + 1] + randomThreshold;
      let b = data[idx + 2] + randomThreshold;

      const [newR, newG, newB] = palette
        ? findClosestPaletteColor(r, g, b, palette)
        : quantizeColor(r, g, b);

      data[idx] = newR;
      data[idx + 1] = newG;
      data[idx + 2] = newB;
    }
  }

  return imageData;
}

export function applyHalftonePattern(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const dotSize = 4;

  for (let y = 0; y < height; y += dotSize) {
    for (let x = 0; x < width; x += dotSize) {
      let avgR = 0, avgG = 0, avgB = 0, count = 0;

      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          avgR += data[idx];
          avgG += data[idx + 1];
          avgB += data[idx + 2];
          count++;
        }
      }

      avgR /= count;
      avgG /= count;
      avgB /= count;

      const luminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
      const radius = ((255 - luminance) / 255) * (dotSize / 2);

      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          const centerX = dotSize / 2;
          const centerY = dotSize / 2;
          const distance = Math.sqrt((dx - centerX) ** 2 + (dy - centerY) ** 2);

          let r, g, b;
          if (distance <= radius) {
            r = 0; g = 0; b = 0;
          } else {
            r = 255; g = 255; b = 255;
          }

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
        }
      }
    }
  }

  return imageData;
}

export function applyCrosshatchPattern(imageData: ImageData, palette: number[][] | null): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const luminance = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      let color = 255;

      if (luminance < 51) {
        color = 0;
      } else if (luminance < 102) {
        color = ((x % 4 === 0 || y % 4 === 0) || ((x + y) % 4 === 0)) ? 0 : 255;
      } else if (luminance < 153) {
        color = ((x % 4 === 0) || (y % 4 === 0)) ? 0 : 255;
      } else if (luminance < 204) {
        color = ((x + y) % 4 === 0) ? 0 : 255;
      }

      data[idx] = color;
      data[idx + 1] = color;
      data[idx + 2] = color;
    }
  }

  return imageData;
}
