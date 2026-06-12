export function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

export function findClosestPaletteColor(r: number, g: number, b: number, palette: number[][]): number[] {
  let minDistance = Infinity;
  let closestColor = palette[0];

  for (const color of palette) {
    const dr = r - color[0];
    const dg = g - color[1];
    const db = b - color[2];
    const distance = dr * dr + dg * dg + db * db;

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  }

  return closestColor;
}

export function quantizeColor(r: number, g: number, b: number): number[] {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const value = luminance < 128 ? 0 : 255;
  return [value, value, value];
}

export function distributeError(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  errR: number,
  errG: number,
  errB: number,
  factor: number
): void {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    const idx = (y * width + x) * 4;
    data[idx] = clamp(data[idx] + errR * factor);
    data[idx + 1] = clamp(data[idx + 1] + errG * factor);
    data[idx + 2] = clamp(data[idx + 2] + errB * factor);
  }
}
