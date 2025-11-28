import { Injectable } from '@angular/core';

export interface WebGLDitheringOptions {
  algorithm: string;
  scale: number;
  contrast: number;
  midtones: number;
  highlights: number;
  blur: number;
  palette?: string;
  threshold?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebGLDitheringService {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;

  // Paletas idénticas al DitheringService CPU
  private colorPalettes: { [key: string]: number[][] } = {
    'monochrome': [[0, 0, 0], [255, 255, 255]],
    'gameboy': [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
    'cga': [[0, 0, 0], [0, 255, 255], [255, 0, 255], [255, 255, 255]],
    'commodore64': [[0, 0, 0], [255, 255, 255], [136, 0, 0], [170, 255, 238]],
    'apple2': [[0, 0, 0], [114, 38, 64], [64, 51, 127], [228, 52, 254], [14, 89, 64], [128, 128, 128], [27, 154, 254], [191, 179, 255], [64, 76, 0], [228, 101, 1], [128, 128, 128], [241, 166, 191], [27, 203, 1], [191, 204, 128], [141, 217, 191], [255, 255, 255]]
  };

  constructor() {
    this.initWebGL();
  }

  private initWebGL(): void {
    try {
      this.canvas = document.createElement('canvas');
      const gl = this.canvas.getContext('webgl', { 
        premultipliedAlpha: false,
        preserveDrawingBuffer: true
      });
      
      if (!gl) {
        console.warn('WebGL not available for dithering');
        return;
      }
      
      this.gl = gl;
      console.log('✅ WebGL Dithering Service initialized');
    } catch (e) {
      console.error('WebGL initialization failed:', e);
    }
  }

  isAvailable(): boolean {
    return this.gl !== null;
  }

  /**
   * Apply dithering using WebGL
   * Falls back to null if WebGL not available
   */
  applyDithering(imageData: ImageData, options: WebGLDitheringOptions): ImageData | null {
    if (!this.gl || !this.canvas) {
      return null; // CPU fallback will handle
    }

    // Implement algorithms one by one
    // Error diffusion algorithms (Floyd-Steinberg, Atkinson, etc.) use CPU
    // because they require sequential processing
    
    switch (options.algorithm) {
      case 'ordered-2x2':
        return this.orderedDitheringWebGL(imageData, options, 2);
      case 'ordered-4x4':
        return this.orderedDitheringWebGL(imageData, options, 4);
      case 'ordered-8x8':
        return this.orderedDitheringWebGL(imageData, options, 8);
      
      // Error diffusion algorithms - optimized CPU implementation
      case 'floyd-steinberg':
        return this.errorDiffusionWebGL(imageData, options, 'floyd-steinberg');
      case 'atkinson':
        return this.errorDiffusionWebGL(imageData, options, 'atkinson');
      case 'jarvis-judice-ninke':
        return this.errorDiffusionWebGL(imageData, options, 'jarvis');
      case 'stucki':
        return this.errorDiffusionWebGL(imageData, options, 'stucki');
      case 'burkes':
        return this.errorDiffusionWebGL(imageData, options, 'burkes');
      case 'sierra':
        return this.errorDiffusionWebGL(imageData, options, 'sierra');
      case 'sierra-lite':
        return this.errorDiffusionWebGL(imageData, options, 'sierra-lite');
      
      // Pattern dithering algorithms - WebGL implementation
      case 'random':
        return this.randomDitheringWebGL(imageData, options);
      case 'pattern-halftone':
        return this.halftoneDitheringWebGL(imageData, options);
      case 'pattern-crosshatch':
        return this.crosshatchDitheringWebGL(imageData, options);
      
      // Otros algoritmos por implementar
      default:
        return null;
    }
  }

  /**
   * Floyd-Steinberg WebGL implementation
   */
  private floydSteinbergWebGL(imageData: ImageData, options: WebGLDitheringOptions): ImageData | null {
    if (!this.gl || !this.canvas) return null;

    const { width, height } = imageData;
    
    // Setup canvas
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);

    // Create and compile shader program
    if (!this.createFloydSteinbergProgram()) {
      return null;
    }

    // Apply image adjustments first (contrast, midtones, highlights)
    const adjusted = this.applyImageAdjustmentsCPU(imageData, options);
    
    // Apply blur if needed
    let processedData = adjusted;
    if (options.blur > 0) {
      processedData = this.applyBlurCPU(processedData, options.blur);
    }

    // Upload texture
    this.uploadTexture(processedData);

    // Get palette
    const palette = options.palette ? this.colorPalettes[options.palette] : null;
    
    // Render with Floyd-Steinberg
    const result = this.renderFloydSteinberg(processedData, palette);
    
    return result;
  }

  private createFloydSteinbergProgram(): boolean {
    if (!this.gl) return false;

    const vertexShaderSource = `
      attribute vec2 aPosition;
      varying vec2 vTexCoord;
      
      void main() {
        // Map from clip space [-1,1] to texture space [0,1]
        // Flip Y to match ImageData coordinate system
        vTexCoord = vec2(aPosition.x * 0.5 + 0.5, 1.0 - (aPosition.y * 0.5 + 0.5));
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform int uPaletteSize;
      uniform vec3 uPalette[16];
      uniform bool uUsePalette;
      uniform float uY; // Current scanline
      
      varying vec2 vTexCoord;
      
      vec3 quantizeColor(vec3 color) {
        return floor(color * 255.0 / 85.0 + 0.5) * 85.0 / 255.0;
      }
      
      vec3 findClosestPaletteColor(vec3 color) {
        if (!uUsePalette) {
          return quantizeColor(color);
        }
        
        float minDist = 999999.0;
        vec3 closest = uPalette[0];
        
        for (int i = 0; i < 16; i++) {
          if (i >= uPaletteSize) break;
          
          vec3 diff = color - uPalette[i];
          float dist = dot(diff, diff);
          
          if (dist < minDist) {
            minDist = dist;
            closest = uPalette[i];
          }
        }
        
        return closest;
      }
      
      void main() {
        vec2 pixel = gl_FragCoord.xy;
        vec2 uv = pixel / uResolution;
        
        vec4 oldColor = texture2D(uTexture, uv);
        vec3 newColor = findClosestPaletteColor(oldColor.rgb);
        
        gl_FragColor = vec4(newColor, oldColor.a);
      }
    `;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return false;

    this.program = this.gl.createProgram();
    if (!this.program) return false;

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Program link failed:', this.gl.getProgramInfoLog(this.program));
      return false;
    }

    return true;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Helper method to compile and link a complete shader program
   */
  private compileProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link failed:', this.gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  private uploadTexture(imageData: ImageData): void {
    if (!this.gl) return;

    if (!this.texture) {
      this.texture = this.gl.createTexture();
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      imageData
    );

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  }

  private renderFloydSteinberg(imageData: ImageData, palette: number[][] | null): ImageData | null {
    // Floyd-Steinberg requiere procesamiento secuencial fila por fila
    // Por ahora usaremos CPU para mantener la correcta difusión de error
    // WebGL es más efectivo para algoritmos ordered/pattern dithering
    return null;
  }

  /**
   * Apply image adjustments on CPU (contrast, midtones, highlights)
   */
  private applyImageAdjustmentsCPU(imageData: ImageData, options: WebGLDitheringOptions): ImageData {
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    const data = result.data;
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Contrast
      const contrast = (options.contrast - 50) * 2.55;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      r = this.clamp(factor * (r - 128) + 128);
      g = this.clamp(factor * (g - 128) + 128);
      b = this.clamp(factor * (b - 128) + 128);

      // Midtones
      const midtonesFactor = (options.midtones - 50) / 50;
      if (midtonesFactor !== 0) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance > 64 && luminance < 192) {
          r = this.clamp(r + midtonesFactor * 30);
          g = this.clamp(g + midtonesFactor * 30);
          b = this.clamp(b + midtonesFactor * 30);
        }
      }

      // Highlights
      const highlightsFactor = (options.highlights - 50) / 50;
      if (highlightsFactor !== 0) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance > 192) {
          r = this.clamp(r + highlightsFactor * 30);
          g = this.clamp(g + highlightsFactor * 30);
          b = this.clamp(b + highlightsFactor * 30);
        }
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    return result;
  }

  private applyBlurCPU(imageData: ImageData, radius: number): ImageData {
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    const data = result.data;
    const tempData = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const px = x + kx;
            const py = y + ky;

            if (px >= 0 && px < width && py >= 0 && py < height) {
              const idx = (py * width + px) * 4;
              r += tempData[idx];
              g += tempData[idx + 1];
              b += tempData[idx + 2];
              count++;
            }
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
      }
    }

    return result;
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(255, value));
  }

  /**
   * Error Diffusion algorithms (optimized CPU with typed arrays)
   */
  private errorDiffusionWebGL(imageData: ImageData, options: WebGLDitheringOptions, algorithm: string): ImageData | null {
    // Apply image adjustments first
    const adjusted = this.applyImageAdjustmentsCPU(imageData, options);
    
    // Apply blur if needed
    let processedData = adjusted;
    if (options.blur > 0) {
      processedData = this.applyBlurCPU(processedData, options.blur);
    }

    // Get palette
    const palette = options.palette ? this.colorPalettes[options.palette] : null;

    // Apply error diffusion
    const result = new ImageData(
      new Uint8ClampedArray(processedData.data),
      processedData.width,
      processedData.height
    );

    switch (algorithm) {
      case 'floyd-steinberg':
        return this.floydSteinbergCPU(result, palette);
      case 'atkinson':
        return this.atkinsonCPU(result, palette);
      case 'jarvis':
        return this.jarvisCPU(result, palette);
      case 'stucki':
        return this.stuckiCPU(result, palette);
      case 'burkes':
        return this.burkesCPU(result, palette);
      case 'sierra':
        return this.sierraCPU(result, palette);
      case 'sierra-lite':
        return this.sierraLiteCPU(result, palette);
      default:
        return null;
    }
  }

  private floydSteinbergCPU(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor([oldR, oldG, oldB], palette)
          : this.quantizeColorRGB([oldR, oldG, oldB]);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Floyd-Steinberg error distribution
        this.distributeErrorCPU(data, width, height, x + 1, y, errR, errG, errB, 7 / 16);
        this.distributeErrorCPU(data, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
        this.distributeErrorCPU(data, width, height, x, y + 1, errR, errG, errB, 5 / 16);
        this.distributeErrorCPU(data, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
      }
    }

    return imageData;
  }

  private atkinsonCPU(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor([oldR, oldG, oldB], palette)
          : this.quantizeColorRGB([oldR, oldG, oldB]);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Atkinson distribution (6/8 of error)
        const factor = 1 / 8;
        this.distributeErrorCPU(data, width, height, x + 1, y, errR, errG, errB, factor);
        this.distributeErrorCPU(data, width, height, x + 2, y, errR, errG, errB, factor);
        this.distributeErrorCPU(data, width, height, x - 1, y + 1, errR, errG, errB, factor);
        this.distributeErrorCPU(data, width, height, x, y + 1, errR, errG, errB, factor);
        this.distributeErrorCPU(data, width, height, x + 1, y + 1, errR, errG, errB, factor);
        this.distributeErrorCPU(data, width, height, x, y + 2, errR, errG, errB, factor);
      }
    }

    return imageData;
  }

  private jarvisCPU(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor([oldR, oldG, oldB], palette)
          : this.quantizeColorRGB([oldR, oldG, oldB]);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Jarvis, Judice, Ninke distribution
        this.distributeErrorCPU(data, width, height, x + 1, y, errR, errG, errB, 7 / 48);
        this.distributeErrorCPU(data, width, height, x + 2, y, errR, errG, errB, 5 / 48);
        this.distributeErrorCPU(data, width, height, x - 2, y + 1, errR, errG, errB, 3 / 48);
        this.distributeErrorCPU(data, width, height, x - 1, y + 1, errR, errG, errB, 5 / 48);
        this.distributeErrorCPU(data, width, height, x, y + 1, errR, errG, errB, 7 / 48);
        this.distributeErrorCPU(data, width, height, x + 1, y + 1, errR, errG, errB, 5 / 48);
        this.distributeErrorCPU(data, width, height, x + 2, y + 1, errR, errG, errB, 3 / 48);
        this.distributeErrorCPU(data, width, height, x - 2, y + 2, errR, errG, errB, 1 / 48);
        this.distributeErrorCPU(data, width, height, x - 1, y + 2, errR, errG, errB, 3 / 48);
        this.distributeErrorCPU(data, width, height, x, y + 2, errR, errG, errB, 5 / 48);
        this.distributeErrorCPU(data, width, height, x + 1, y + 2, errR, errG, errB, 3 / 48);
        this.distributeErrorCPU(data, width, height, x + 2, y + 2, errR, errG, errB, 1 / 48);
      }
    }

    return imageData;
  }

  private stuckiCPU(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor([oldR, oldG, oldB], palette)
          : this.quantizeColorRGB([oldR, oldG, oldB]);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Stucki distribution
        this.distributeErrorCPU(data, width, height, x + 1, y, errR, errG, errB, 8 / 42);
        this.distributeErrorCPU(data, width, height, x + 2, y, errR, errG, errB, 4 / 42);
        this.distributeErrorCPU(data, width, height, x - 2, y + 1, errR, errG, errB, 2 / 42);
        this.distributeErrorCPU(data, width, height, x - 1, y + 1, errR, errG, errB, 4 / 42);
        this.distributeErrorCPU(data, width, height, x, y + 1, errR, errG, errB, 8 / 42);
        this.distributeErrorCPU(data, width, height, x + 1, y + 1, errR, errG, errB, 4 / 42);
        this.distributeErrorCPU(data, width, height, x + 2, y + 1, errR, errG, errB, 2 / 42);
        this.distributeErrorCPU(data, width, height, x - 2, y + 2, errR, errG, errB, 1 / 42);
        this.distributeErrorCPU(data, width, height, x - 1, y + 2, errR, errG, errB, 2 / 42);
        this.distributeErrorCPU(data, width, height, x, y + 2, errR, errG, errB, 4 / 42);
        this.distributeErrorCPU(data, width, height, x + 1, y + 2, errR, errG, errB, 2 / 42);
        this.distributeErrorCPU(data, width, height, x + 2, y + 2, errR, errG, errB, 1 / 42);
      }
    }

    return imageData;
  }

  private burkesCPU(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor([oldR, oldG, oldB], palette)
          : this.quantizeColorRGB([oldR, oldG, oldB]);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Burkes distribution
        this.distributeErrorCPU(data, width, height, x + 1, y, errR, errG, errB, 8 / 32);
        this.distributeErrorCPU(data, width, height, x + 2, y, errR, errG, errB, 4 / 32);
        this.distributeErrorCPU(data, width, height, x - 2, y + 1, errR, errG, errB, 2 / 32);
        this.distributeErrorCPU(data, width, height, x - 1, y + 1, errR, errG, errB, 4 / 32);
        this.distributeErrorCPU(data, width, height, x, y + 1, errR, errG, errB, 8 / 32);
        this.distributeErrorCPU(data, width, height, x + 1, y + 1, errR, errG, errB, 4 / 32);
        this.distributeErrorCPU(data, width, height, x + 2, y + 1, errR, errG, errB, 2 / 32);
      }
    }

    return imageData;
  }

  private sierraCPU(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor([oldR, oldG, oldB], palette)
          : this.quantizeColorRGB([oldR, oldG, oldB]);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Sierra distribution
        this.distributeErrorCPU(data, width, height, x + 1, y, errR, errG, errB, 5 / 32);
        this.distributeErrorCPU(data, width, height, x + 2, y, errR, errG, errB, 3 / 32);
        this.distributeErrorCPU(data, width, height, x - 2, y + 1, errR, errG, errB, 2 / 32);
        this.distributeErrorCPU(data, width, height, x - 1, y + 1, errR, errG, errB, 4 / 32);
        this.distributeErrorCPU(data, width, height, x, y + 1, errR, errG, errB, 5 / 32);
        this.distributeErrorCPU(data, width, height, x + 1, y + 1, errR, errG, errB, 4 / 32);
        this.distributeErrorCPU(data, width, height, x + 2, y + 1, errR, errG, errB, 2 / 32);
        this.distributeErrorCPU(data, width, height, x - 1, y + 2, errR, errG, errB, 2 / 32);
        this.distributeErrorCPU(data, width, height, x, y + 2, errR, errG, errB, 3 / 32);
        this.distributeErrorCPU(data, width, height, x + 1, y + 2, errR, errG, errB, 2 / 32);
      }
    }

    return imageData;
  }

  private sierraLiteCPU(imageData: ImageData, palette: number[][] | null): ImageData {
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
          ? this.findClosestPaletteColor([oldR, oldG, oldB], palette)
          : this.quantizeColorRGB([oldR, oldG, oldB]);

        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;

        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;

        // Sierra Lite distribution
        this.distributeErrorCPU(data, width, height, x + 1, y, errR, errG, errB, 2 / 4);
        this.distributeErrorCPU(data, width, height, x - 1, y + 1, errR, errG, errB, 1 / 4);
        this.distributeErrorCPU(data, width, height, x, y + 1, errR, errG, errB, 1 / 4);
      }
    }

    return imageData;
  }

  private distributeErrorCPU(
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
    if (x < 0 || x >= width || y < 0 || y >= height) return;

    const idx = (y * width + x) * 4;
    data[idx] = this.clamp(data[idx] + errR * factor);
    data[idx + 1] = this.clamp(data[idx + 1] + errG * factor);
    data[idx + 2] = this.clamp(data[idx + 2] + errB * factor);
  }

  private findClosestPaletteColor(color: number[], palette: number[][]): number[] {
    let minDist = Infinity;
    let closest = palette[0];

    for (const paletteColor of palette) {
      const dr = color[0] - paletteColor[0];
      const dg = color[1] - paletteColor[1];
      const db = color[2] - paletteColor[2];
      const dist = dr * dr + dg * dg + db * db;

      if (dist < minDist) {
        minDist = dist;
        closest = paletteColor;
      }
    }

    return closest;
  }

  private quantizeColorRGB(color: number[]): number[] {
    return [
      Math.floor(color[0] / 85 + 0.5) * 85,
      Math.floor(color[1] / 85 + 0.5) * 85,
      Math.floor(color[2] / 85 + 0.5) * 85
    ];
  }

  /**
   * Ordered Dithering WebGL implementation (Bayer matrices)
   */
  private orderedDitheringWebGL(imageData: ImageData, options: WebGLDitheringOptions, matrixSize: number): ImageData | null {
    if (!this.gl || !this.canvas) return null;

    const { width, height } = imageData;
    
    // Setup canvas
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);

    // Create and compile shader program
    if (!this.createOrderedDitheringProgram(matrixSize)) {
      return null;
    }

    // Apply image adjustments first
    const adjusted = this.applyImageAdjustmentsCPU(imageData, options);
    
    // Apply blur if needed
    let processedData = adjusted;
    if (options.blur > 0) {
      processedData = this.applyBlurCPU(processedData, options.blur);
    }

    // Upload texture
    this.uploadTexture(processedData);

    // Get palette
    const palette = options.palette ? this.colorPalettes[options.palette] : null;
    
    // Render
    const result = this.renderOrderedDithering(processedData, palette, matrixSize);
    
    return result;
  }

  private createOrderedDitheringProgram(matrixSize: number): boolean {
    if (!this.gl) return false;

    // Clean up old program
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }

    const vertexShaderSource = `
      attribute vec2 aPosition;
      varying vec2 vTexCoord;
      
      void main() {
        // Map from clip space [-1,1] to texture space [0,1]
        // Flip Y to match ImageData coordinate system
        vTexCoord = vec2(aPosition.x * 0.5 + 0.5, 1.0 - (aPosition.y * 0.5 + 0.5));
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform int uPaletteSize;
      uniform vec3 uPalette[16];
      uniform bool uUsePalette;
      uniform int uMatrixSize;
      
      varying vec2 vTexCoord;
      
      // Bayer matrices
      float getBayerValue(int x, int y, int size) {
        if (size == 2) {
          int idx = y * 2 + x;
          if (idx == 0) return 0.0 / 4.0;
          if (idx == 1) return 2.0 / 4.0;
          if (idx == 2) return 3.0 / 4.0;
          return 1.0 / 4.0;
        } else if (size == 4) {
          int idx = y * 4 + x;
          if (idx == 0) return 0.0 / 16.0;
          if (idx == 1) return 8.0 / 16.0;
          if (idx == 2) return 2.0 / 16.0;
          if (idx == 3) return 10.0 / 16.0;
          if (idx == 4) return 12.0 / 16.0;
          if (idx == 5) return 4.0 / 16.0;
          if (idx == 6) return 14.0 / 16.0;
          if (idx == 7) return 6.0 / 16.0;
          if (idx == 8) return 3.0 / 16.0;
          if (idx == 9) return 11.0 / 16.0;
          if (idx == 10) return 1.0 / 16.0;
          if (idx == 11) return 9.0 / 16.0;
          if (idx == 12) return 15.0 / 16.0;
          if (idx == 13) return 7.0 / 16.0;
          if (idx == 14) return 13.0 / 16.0;
          return 5.0 / 16.0;
        } else { // 8x8
          // Simplified 8x8 approximation
          float fx = float(x) / 8.0;
          float fy = float(y) / 8.0;
          return fract(fx * 8.0 + fy * 32.0) * 0.5 + 0.25;
        }
      }
      
      vec3 quantizeColor(vec3 color) {
        return floor(color * 255.0 / 85.0 + 0.5) * 85.0 / 255.0;
      }
      
      vec3 findClosestPaletteColor(vec3 color) {
        if (!uUsePalette) {
          return quantizeColor(color);
        }
        
        float minDist = 999999.0;
        vec3 closest = uPalette[0];
        
        for (int i = 0; i < 16; i++) {
          if (i >= uPaletteSize) break;
          
          vec3 diff = color - uPalette[i];
          float dist = dot(diff, diff);
          
          if (dist < minDist) {
            minDist = dist;
            closest = uPalette[i];
          }
        }
        
        return closest;
      }
      
      void main() {
        vec2 pixel = gl_FragCoord.xy;
        vec2 uv = pixel / uResolution;
        
        vec4 oldColor = texture2D(uTexture, uv);
        
        // Get Bayer matrix threshold
        int x = int(mod(pixel.x, float(uMatrixSize)));
        int y = int(mod(pixel.y, float(uMatrixSize)));
        float threshold = getBayerValue(x, y, uMatrixSize);
        
        // Apply threshold to each channel
        vec3 color = oldColor.rgb + vec3(threshold - 0.5) * 0.1;
        color = clamp(color, 0.0, 1.0);
        
        // Find closest color in palette
        vec3 newColor = findClosestPaletteColor(color);
        
        gl_FragColor = vec4(newColor, oldColor.a);
      }
    `;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return false;

    this.program = this.gl.createProgram();
    if (!this.program) return false;

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Program link failed:', this.gl.getProgramInfoLog(this.program));
      return false;
    }

    return true;
  }

  private renderOrderedDithering(imageData: ImageData, palette: number[][] | null, matrixSize: number): ImageData | null {
    if (!this.gl || !this.program) return null;

    this.gl.useProgram(this.program);

    // Set up quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set uniforms
    const resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');
    this.gl.uniform2f(resolutionLocation, imageData.width, imageData.height);

    const matrixSizeLocation = this.gl.getUniformLocation(this.program, 'uMatrixSize');
    this.gl.uniform1i(matrixSizeLocation, matrixSize);

    // Palette uniforms
    const usePaletteLocation = this.gl.getUniformLocation(this.program, 'uUsePalette');
    this.gl.uniform1i(usePaletteLocation, palette ? 1 : 0);

    if (palette) {
      const paletteSizeLocation = this.gl.getUniformLocation(this.program, 'uPaletteSize');
      this.gl.uniform1i(paletteSizeLocation, palette.length);

      const paletteLocation = this.gl.getUniformLocation(this.program, 'uPalette');
      const paletteData: number[] = [];
      for (let i = 0; i < 16; i++) {
        if (i < palette.length) {
          paletteData.push(palette[i][0] / 255, palette[i][1] / 255, palette[i][2] / 255);
        } else {
          paletteData.push(0, 0, 0);
        }
      }
      this.gl.uniform3fv(paletteLocation, paletteData);
    }

    // Texture uniform
    const textureLocation = this.gl.getUniformLocation(this.program, 'uTexture');
    this.gl.uniform1i(textureLocation, 0);

    // Draw
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8ClampedArray(imageData.width * imageData.height * 4);
    this.gl.readPixels(0, 0, imageData.width, imageData.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    return new ImageData(pixels, imageData.width, imageData.height);
  }

  /**
   * Random Dithering - WebGL Implementation
   * Adds pseudo-random threshold to each pixel
   */
  private randomDitheringWebGL(imageData: ImageData, options: WebGLDitheringOptions): ImageData {
    // Apply preprocessing
    let processedData = this.applyImageAdjustmentsCPU(imageData, options);
    if (options.blur > 0) {
      processedData = this.applyBlurCPU(processedData, options.blur);
    }

    const palette = options.palette ? this.colorPalettes[options.palette] : null;
    const threshold = options.threshold !== undefined ? options.threshold : 128;

    return this.renderRandomDithering(processedData, threshold, palette);
  }

  /**
   * Halftone Pattern Dithering - WebGL Implementation
   * Creates dot patterns based on luminance in 4x4 blocks
   */
  private halftoneDitheringWebGL(imageData: ImageData, options: WebGLDitheringOptions): ImageData {
    // Apply preprocessing
    let processedData = this.applyImageAdjustmentsCPU(imageData, options);
    if (options.blur > 0) {
      processedData = this.applyBlurCPU(processedData, options.blur);
    }

    const palette = options.palette ? this.colorPalettes[options.palette] : null;

    return this.renderHalftoneDithering(processedData, palette);
  }

  /**
   * Crosshatch Pattern Dithering - WebGL Implementation
   * Creates line patterns based on luminance levels
   */
  private crosshatchDitheringWebGL(imageData: ImageData, options: WebGLDitheringOptions): ImageData {
    // Apply preprocessing
    let processedData = this.applyImageAdjustmentsCPU(imageData, options);
    if (options.blur > 0) {
      processedData = this.applyBlurCPU(processedData, options.blur);
    }

    const palette = options.palette ? this.colorPalettes[options.palette] : null;

    return this.renderCrosshatchDithering(processedData, palette);
  }

  /**
   * Create Random Dithering Shader Program
   */
  private createRandomDitheringProgram(): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShaderSource = `
      attribute vec2 aPosition;
      varying vec2 vTexCoord;
      
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = vec2(aPosition.x * 0.5 + 0.5, aPosition.y * 0.5 + 0.5);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uThreshold;
      uniform int uUsePalette;
      uniform int uPaletteSize;
      uniform vec3 uPalette[16];
      
      varying vec2 vTexCoord;
      
      // Pseudo-random hash function
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      vec3 findClosestPaletteColor(vec3 color, int size) {
        float minDist = 999999.0;
        vec3 closest = uPalette[0];
        
        for (int i = 0; i < 16; i++) {
          if (i >= size) break;
          float dist = distance(color, uPalette[i]);
          if (dist < minDist) {
            minDist = dist;
            closest = uPalette[i];
          }
        }
        
        return closest;
      }
      
      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        
        // Get pixel coordinate for hash
        vec2 pixelCoord = vTexCoord * uResolution;
        
        // Generate pseudo-random threshold
        float randomValue = hash(pixelCoord);
        float randomThreshold = (randomValue - 0.5) * (uThreshold / 255.0);
        
        // Apply random threshold to RGB channels
        vec3 noisyColor = color.rgb + vec3(randomThreshold);
        noisyColor = clamp(noisyColor, 0.0, 1.0);
        
        // Quantize
        vec3 finalColor;
        if (uUsePalette == 1) {
          finalColor = findClosestPaletteColor(noisyColor, uPaletteSize);
        } else {
          float luminance = 0.299 * noisyColor.r + 0.587 * noisyColor.g + 0.114 * noisyColor.b;
          float quantized = luminance > 0.5 ? 1.0 : 0.0;
          finalColor = vec3(quantized);
        }
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    return this.compileProgram(vertexShaderSource, fragmentShaderSource);
  }

  /**
   * Create Halftone Pattern Shader Program
   */
  private createHalftoneProgram(): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShaderSource = `
      attribute vec2 aPosition;
      varying vec2 vTexCoord;
      
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = vec2(aPosition.x * 0.5 + 0.5, aPosition.y * 0.5 + 0.5);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform int uUsePalette;
      uniform int uPaletteSize;
      uniform vec3 uPalette[16];
      
      varying vec2 vTexCoord;
      
      vec3 findClosestPaletteColor(vec3 color, int size) {
        float minDist = 999999.0;
        vec3 closest = uPalette[0];
        
        for (int i = 0; i < 16; i++) {
          if (i >= size) break;
          float dist = distance(color, uPalette[i]);
          if (dist < minDist) {
            minDist = dist;
            closest = uPalette[i];
          }
        }
        
        return closest;
      }
      
      void main() {
        vec2 pixelCoord = vTexCoord * uResolution;
        const float dotSize = 4.0;
        
        // Get block position
        vec2 blockPos = floor(pixelCoord / dotSize) * dotSize;
        
        // Calculate average luminance in 4x4 block (unrolled loop for WebGL 1.0)
        float avgLuminance = 0.0;
        float count = 0.0;
        
        for (int dy = 0; dy < 4; dy++) {
          for (int dx = 0; dx < 4; dx++) {
            vec2 samplePos = (blockPos + vec2(float(dx), float(dy))) / uResolution;
            if (samplePos.x < 1.0 && samplePos.y < 1.0) {
              vec4 sampleColor = texture2D(uTexture, samplePos);
              avgLuminance += 0.299 * sampleColor.r + 0.587 * sampleColor.g + 0.114 * sampleColor.b;
              count += 1.0;
            }
          }
        }
        
        avgLuminance /= count;
        
        // Calculate dot radius based on luminance (darker = larger dot)
        float radius = ((1.0 - avgLuminance) / 1.0) * (dotSize / 2.0);
        
        // Calculate distance from block center
        vec2 localPos = pixelCoord - blockPos;
        vec2 center = vec2(dotSize / 2.0, dotSize / 2.0);
        float distance = length(localPos - center);
        
        // Determine if pixel is inside dot
        vec3 finalColor;
        if (distance <= radius) {
          if (uUsePalette == 1) {
            finalColor = findClosestPaletteColor(vec3(0.0), uPaletteSize);
          } else {
            finalColor = vec3(0.0);
          }
        } else {
          if (uUsePalette == 1) {
            finalColor = findClosestPaletteColor(vec3(1.0), uPaletteSize);
          } else {
            finalColor = vec3(1.0);
          }
        }
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    return this.compileProgram(vertexShaderSource, fragmentShaderSource);
  }

  /**
   * Create Crosshatch Pattern Shader Program
   */
  private createCrosshatchProgram(): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShaderSource = `
      attribute vec2 aPosition;
      varying vec2 vTexCoord;
      
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = vec2(aPosition.x * 0.5 + 0.5, aPosition.y * 0.5 + 0.5);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform int uUsePalette;
      uniform int uPaletteSize;
      uniform vec3 uPalette[16];
      
      varying vec2 vTexCoord;
      
      vec3 findClosestPaletteColor(vec3 color, int size) {
        float minDist = 999999.0;
        vec3 closest = uPalette[0];
        
        for (int i = 0; i < 16; i++) {
          if (i >= size) break;
          float dist = distance(color, uPalette[i]);
          if (dist < minDist) {
            minDist = dist;
            closest = uPalette[i];
          }
        }
        
        return closest;
      }
      
      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        
        // Calculate luminance
        float luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
        
        // Get pixel coordinates
        vec2 pixelCoord = vTexCoord * uResolution;
        float x = pixelCoord.x;
        float y = pixelCoord.y;
        
        // Crosshatch patterns based on luminance levels
        float finalValue = 1.0;
        
        // Very dark: solid black
        if (luminance < 51.0 / 255.0) {
          finalValue = 0.0;
        }
        // Dark: dense crosshatch
        else if (luminance < 102.0 / 255.0) {
          if (mod(x, 4.0) == 0.0 || mod(y, 4.0) == 0.0 || mod(x + y, 4.0) == 0.0) {
            finalValue = 0.0;
          }
        }
        // Medium: medium crosshatch
        else if (luminance < 153.0 / 255.0) {
          if (mod(x, 4.0) == 0.0 || mod(y, 4.0) == 0.0) {
            finalValue = 0.0;
          }
        }
        // Light: sparse diagonal
        else if (luminance < 204.0 / 255.0) {
          if (mod(x + y, 4.0) == 0.0) {
            finalValue = 0.0;
          }
        }
        // Very light: white (default)
        
        vec3 finalColor;
        if (uUsePalette == 1) {
          finalColor = findClosestPaletteColor(vec3(finalValue), uPaletteSize);
        } else {
          finalColor = vec3(finalValue);
        }
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    return this.compileProgram(vertexShaderSource, fragmentShaderSource);
  }

  /**
   * Render Random Dithering using WebGL
   */
  private renderRandomDithering(imageData: ImageData, threshold: number, palette: number[][] | null): ImageData {
    if (!this.gl || !this.canvas) throw new Error('WebGL not initialized');

    // Setup canvas
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.gl.viewport(0, 0, imageData.width, imageData.height);

    // Create and compile shader program
    this.program = this.createRandomDitheringProgram();
    if (!this.program) throw new Error('Failed to create random dithering program');

    this.gl.useProgram(this.program);

    // Setup texture
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);

    // Setup vertex buffer
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set uniforms
    const resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');
    this.gl.uniform2f(resolutionLocation, imageData.width, imageData.height);

    const thresholdLocation = this.gl.getUniformLocation(this.program, 'uThreshold');
    this.gl.uniform1f(thresholdLocation, threshold);

    const usePaletteLocation = this.gl.getUniformLocation(this.program, 'uUsePalette');
    this.gl.uniform1i(usePaletteLocation, palette ? 1 : 0);

    if (palette) {
      const paletteSizeLocation = this.gl.getUniformLocation(this.program, 'uPaletteSize');
      this.gl.uniform1i(paletteSizeLocation, palette.length);

      const paletteLocation = this.gl.getUniformLocation(this.program, 'uPalette');
      const paletteData: number[] = [];
      for (let i = 0; i < 16; i++) {
        if (i < palette.length) {
          paletteData.push(palette[i][0] / 255, palette[i][1] / 255, palette[i][2] / 255);
        } else {
          paletteData.push(0, 0, 0);
        }
      }
      this.gl.uniform3fv(paletteLocation, paletteData);
    }

    const textureLocation = this.gl.getUniformLocation(this.program, 'uTexture');
    this.gl.uniform1i(textureLocation, 0);

    // Draw
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8ClampedArray(imageData.width * imageData.height * 4);
    this.gl.readPixels(0, 0, imageData.width, imageData.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    return new ImageData(pixels, imageData.width, imageData.height);
  }

  /**
   * Render Halftone Pattern using WebGL
   */
  private renderHalftoneDithering(imageData: ImageData, palette: number[][] | null): ImageData {
    if (!this.gl || !this.canvas) throw new Error('WebGL not initialized');

    // Setup canvas
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.gl.viewport(0, 0, imageData.width, imageData.height);

    // Create and compile shader program
    this.program = this.createHalftoneProgram();
    if (!this.program) throw new Error('Failed to create halftone program');

    this.gl.useProgram(this.program);

    // Setup texture
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);

    // Setup vertex buffer
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set uniforms
    const resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');
    this.gl.uniform2f(resolutionLocation, imageData.width, imageData.height);

    const usePaletteLocation = this.gl.getUniformLocation(this.program, 'uUsePalette');
    this.gl.uniform1i(usePaletteLocation, palette ? 1 : 0);

    if (palette) {
      const paletteSizeLocation = this.gl.getUniformLocation(this.program, 'uPaletteSize');
      this.gl.uniform1i(paletteSizeLocation, palette.length);

      const paletteLocation = this.gl.getUniformLocation(this.program, 'uPalette');
      const paletteData: number[] = [];
      for (let i = 0; i < 16; i++) {
        if (i < palette.length) {
          paletteData.push(palette[i][0] / 255, palette[i][1] / 255, palette[i][2] / 255);
        } else {
          paletteData.push(0, 0, 0);
        }
      }
      this.gl.uniform3fv(paletteLocation, paletteData);
    }

    const textureLocation = this.gl.getUniformLocation(this.program, 'uTexture');
    this.gl.uniform1i(textureLocation, 0);

    // Draw
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8ClampedArray(imageData.width * imageData.height * 4);
    this.gl.readPixels(0, 0, imageData.width, imageData.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    return new ImageData(pixels, imageData.width, imageData.height);
  }

  /**
   * Render Crosshatch Pattern using WebGL
   */
  private renderCrosshatchDithering(imageData: ImageData, palette: number[][] | null): ImageData {
    if (!this.gl || !this.canvas) throw new Error('WebGL not initialized');

    // Setup canvas
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.gl.viewport(0, 0, imageData.width, imageData.height);

    // Create and compile shader program
    this.program = this.createCrosshatchProgram();
    if (!this.program) throw new Error('Failed to create crosshatch program');

    this.gl.useProgram(this.program);

    // Setup texture
    this.texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);

    // Setup vertex buffer
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set uniforms
    const resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');
    this.gl.uniform2f(resolutionLocation, imageData.width, imageData.height);

    const usePaletteLocation = this.gl.getUniformLocation(this.program, 'uUsePalette');
    this.gl.uniform1i(usePaletteLocation, palette ? 1 : 0);

    if (palette) {
      const paletteSizeLocation = this.gl.getUniformLocation(this.program, 'uPaletteSize');
      this.gl.uniform1i(paletteSizeLocation, palette.length);

      const paletteLocation = this.gl.getUniformLocation(this.program, 'uPalette');
      const paletteData: number[] = [];
      for (let i = 0; i < 16; i++) {
        if (i < palette.length) {
          paletteData.push(palette[i][0] / 255, palette[i][1] / 255, palette[i][2] / 255);
        } else {
          paletteData.push(0, 0, 0);
        }
      }
      this.gl.uniform3fv(paletteLocation, paletteData);
    }

    const textureLocation = this.gl.getUniformLocation(this.program, 'uTexture');
    this.gl.uniform1i(textureLocation, 0);

    // Draw
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8ClampedArray(imageData.width * imageData.height * 4);
    this.gl.readPixels(0, 0, imageData.width, imageData.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    return new ImageData(pixels, imageData.width, imageData.height);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
    if (this.gl && this.texture) {
      this.gl.deleteTexture(this.texture);
    }
  }
}
