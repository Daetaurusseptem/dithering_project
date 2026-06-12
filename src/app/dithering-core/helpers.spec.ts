import { clamp, findClosestPaletteColor, quantizeColor, distributeError } from './helpers';
import { COLOR_PALETTES, hexToRgb } from './palettes';

describe('dithering-core/helpers', () => {
  describe('clamp', () => {
    it('should clamp values below 0', () => {
      expect(clamp(-10)).toBe(0);
    });

    it('should clamp values above 255', () => {
      expect(clamp(300)).toBe(255);
    });

    it('should return same value within range', () => {
      expect(clamp(128)).toBe(128);
    });

    it('should handle 0', () => {
      expect(clamp(0)).toBe(0);
    });

    it('should handle 255', () => {
      expect(clamp(255)).toBe(255);
    });
  });

  describe('findClosestPaletteColor', () => {
    const palette = [
      [0, 0, 0],
      [255, 255, 255],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255]
    ];

    it('should find exact match', () => {
      const result = findClosestPaletteColor(255, 0, 0, palette);
      expect(result).toEqual([255, 0, 0]);
    });

    it('should find closest to black', () => {
      const result = findClosestPaletteColor(10, 10, 10, palette);
      expect(result).toEqual([0, 0, 0]);
    });

    it('should find closest to white', () => {
      const result = findClosestPaletteColor(240, 240, 240, palette);
      expect(result).toEqual([255, 255, 255]);
    });

    it('should find closest to blue', () => {
      const result = findClosestPaletteColor(0, 0, 200, palette);
      expect(result).toEqual([0, 0, 255]);
    });
  });

  describe('quantizeColor', () => {
    it('should return black for dark colors', () => {
      const result = quantizeColor(50, 50, 50);
      expect(result).toEqual([0, 0, 0]);
    });

    it('should return white for bright colors', () => {
      const result = quantizeColor(200, 200, 200);
      expect(result).toEqual([255, 255, 255]);
    });

    it('should handle pure red (bright)', () => {
      const result = quantizeColor(255, 0, 0);
      expect(result).toEqual([0, 0, 0]); // luminance 76 < 128
    });

    it('should handle pure green (medium)', () => {
      const result = quantizeColor(0, 128, 0);
      expect(result).toEqual([0, 0, 0]); // luminance 75 < 128
    });
  });

  describe('distributeError', () => {
    it('should distribute error to valid pixel', () => {
      const data = new Uint8ClampedArray([100, 100, 100, 255]);
      distributeError(data, 1, 1, 0, 0, 10, 20, 30, 0.5);
      expect(data[0]).toBe(105); // 100 + 10*0.5
      expect(data[1]).toBe(110); // 100 + 20*0.5
      expect(data[2]).toBe(115); // 100 + 30*0.5
    });

    it('should not modify out of bounds', () => {
      const data = new Uint8ClampedArray([100, 100, 100, 255]);
      distributeError(data, 1, 1, -1, 0, 10, 20, 30, 0.5);
      expect(data[0]).toBe(100);
    });

    it('should clamp overflow', () => {
      const data = new Uint8ClampedArray([250, 250, 250, 255]);
      distributeError(data, 1, 1, 0, 0, 20, 20, 20, 1);
      expect(data[0]).toBe(255);
    });
  });
});

describe('dithering-core/palettes', () => {
  it('should have monochrome palette', () => {
    expect(COLOR_PALETTES['monochrome']).toEqual([[0, 0, 0], [255, 255, 255]]);
  });

  it('should have gameboy palette with 4 colors', () => {
    expect(COLOR_PALETTES['gameboy'].length).toBe(4);
  });

  it('should have pico8 palette with 16 colors', () => {
    expect(COLOR_PALETTES['pico8'].length).toBe(16);
  });

  it('should have nes palette', () => {
    expect(COLOR_PALETTES['nes']).toBeDefined();
    expect(COLOR_PALETTES['nes'].length).toBeGreaterThan(50);
  });

  it('should have dmg palette with 4 colors', () => {
    expect(COLOR_PALETTES['dmg'].length).toBe(4);
  });

  describe('hexToRgb', () => {
    it('should convert #000000 to black', () => {
      expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    });

    it('should convert #ffffff to white', () => {
      expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    });

    it('should convert without hash', () => {
      expect(hexToRgb('ff0000')).toEqual([255, 0, 0]);
    });

    it('should return black for invalid hex', () => {
      expect(hexToRgb('invalid')).toEqual([0, 0, 0]);
    });
  });
});
