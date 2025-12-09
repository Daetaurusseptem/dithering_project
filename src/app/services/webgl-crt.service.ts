import { Injectable } from '@angular/core';

export interface CRTOptions {
  intensity: number;
  scanlineThickness: number;
  scanlineSpacing: number;
  curvature: number;
  vignette: number;
  chromaticAberration: number;
  phosphorGlow: number;
  brightness: number;
  contrast: number;
}

/**
 * WebGL CRT Effect Service
 * 
 * Simulates a vintage CRT monitor with:
 * - Animated scanlines
 * - Screen curvature distortion
 * - Chromatic aberration (RGB color separation)
 * - Vignette darkening
 * - Phosphor green glow
 * - Brightness/contrast adjustments
 * 
 * Optimized for mobile with highp precision and efficient calculations.
 */
@Injectable({
  providedIn: 'root'
})
export class WebGLCRTService {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;

  constructor() {}

  /**
   * Initialize WebGL context and compile shaders
   */
  private initWebGL(width: number, height: number): boolean {
    try {
      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      
      // Get WebGL context
      this.gl = this.canvas.getContext('webgl', {
        premultipliedAlpha: false,
        preserveDrawingBuffer: true
      }) || this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      
      if (!this.gl) {
        console.warn('⚠️ WebGL not supported for CRT effect');
        return false;
      }

      console.log('✅ WebGL CRT initialized');

      // Create shaders
      const vertexShader = this.createShader(this.gl.VERTEX_SHADER, this.getVertexShader());
      const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, this.getFragmentShader());
      
      if (!vertexShader || !fragmentShader) {
        console.error('❌ Failed to create CRT shaders');
        return false;
      }

      // Create program
      this.program = this.gl.createProgram();
      if (!this.program) {
        console.error('❌ Failed to create CRT program');
        return false;
      }

      this.gl.attachShader(this.program, vertexShader);
      this.gl.attachShader(this.program, fragmentShader);
      this.gl.linkProgram(this.program);
      
      if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        console.error('❌ CRT program link error:', this.gl.getProgramInfoLog(this.program));
        return false;
      }

      this.gl.useProgram(this.program);

      // Setup buffers
      this.setupBuffers();

      // Create texture
      this.texture = this.gl.createTexture();
      
      return true;
    } catch (error) {
      console.error('❌ WebGL CRT initialization error:', error);
      return false;
    }
  }

  /**
   * Create and compile shader
   */
  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  /**
   * Setup vertex and texture coordinate buffers
   */
  private setupBuffers(): void {
    if (!this.gl || !this.program) return;

    // Position buffer (full screen quad)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    
    const positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Texture coordinate buffer (correct orientation)
    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]);

    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
    
    const texCoordLocation = this.gl.getAttribLocation(this.program, 'aTexCoord');
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
  }

  /**
   * Vertex shader - simple passthrough
   */
  private getVertexShader(): string {
    return `
      attribute vec2 aPosition;
      attribute vec2 aTexCoord;
      varying vec2 vTexCoord;
      
      void main() {
        vTexCoord = aTexCoord;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;
  }

  /**
   * Fragment shader - CRT effect with all features
   */
  private getFragmentShader(): string {
    return `
      precision highp float;
      
      uniform sampler2D uTexture;
      uniform vec2 uResolution;
      uniform float uPhase;
      uniform float uIntensity;
      uniform float uScanlineThickness;
      uniform float uScanlineSpacing;
      uniform float uCurvature;
      uniform float uVignette;
      uniform float uChromaticAberration;
      uniform float uPhosphorGlow;
      uniform float uBrightness;
      uniform float uContrast;
      
      varying vec2 vTexCoord;
      
      // Apply CRT curvature distortion
      vec2 applyCurvature(vec2 uv, float amount) {
        if (amount <= 0.0) return uv;
        
        vec2 centered = uv * 2.0 - 1.0;
        
        // Barrel distortion formula
        highp float r2 = dot(centered, centered);
        highp float distortion = 1.0 + amount * r2;
        
        vec2 distorted = centered * distortion;
        return distorted * 0.5 + 0.5;
      }
      
      // Check if UV is within valid range (for curvature edge clipping)
      bool isInBounds(vec2 uv) {
        return uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0;
      }
      
      // Apply scanlines
      float getScanline(vec2 uv, float thickness, float spacing, float phase) {
        float scanlinePos = mod(uv.y * uResolution.y + phase * spacing, spacing);
        float scanline = smoothstep(0.0, thickness, scanlinePos) * 
                        smoothstep(spacing, spacing - thickness, scanlinePos);
        return scanline;
      }
      
      // Apply vignette darkening
      float getVignette(vec2 uv, float intensity) {
        vec2 center = vec2(0.5, 0.5);
        highp float dist = distance(uv, center);
        return 1.0 - smoothstep(0.3, 1.0, dist) * intensity;
      }
      
      // Phosphor glow effect (green CRT glow)
      vec3 applyPhosphorGlow(vec3 color, float intensity) {
        float luminance = dot(color, vec3(0.299, 0.587, 0.114));
        vec3 greenGlow = vec3(0.0, 1.0, 0.3);
        return mix(color, color + greenGlow * luminance * 0.3, intensity);
      }
      
      // Apply brightness and contrast
      vec3 applyBrightnessContrast(vec3 color, float brightness, float contrast) {
        // Contrast: (color - 0.5) * contrast + 0.5
        color = (color - 0.5) * contrast + 0.5;
        // Brightness: color + brightness
        color = color + brightness;
        return clamp(color, 0.0, 1.0);
      }
      
      void main() {
        vec2 uv = vTexCoord;
        
        // Apply curvature distortion
        vec2 distortedUV = applyCurvature(uv, uCurvature * uIntensity);
        
        // Check if we're outside the curved screen bounds
        if (!isInBounds(distortedUV)) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }
        
        vec3 color;
        
        // Apply chromatic aberration (RGB separation)
        if (uChromaticAberration > 0.0) {
          float caAmount = uChromaticAberration * uIntensity * 0.01;
          vec2 caOffset = (distortedUV - 0.5) * caAmount;
          
          float r = texture2D(uTexture, distortedUV - caOffset).r;
          float g = texture2D(uTexture, distortedUV).g;
          float b = texture2D(uTexture, distortedUV + caOffset).b;
          
          color = vec3(r, g, b);
        } else {
          color = texture2D(uTexture, distortedUV).rgb;
        }
        
        // Apply brightness and contrast
        color = applyBrightnessContrast(color, uBrightness - 1.0, uContrast);
        
        // Apply phosphor glow
        if (uPhosphorGlow > 0.0) {
          color = applyPhosphorGlow(color, uPhosphorGlow * uIntensity);
        }
        
        // Apply scanlines
        float scanline = getScanline(uv, uScanlineThickness, uScanlineSpacing, uPhase);
        color *= mix(1.0, 0.3 + scanline * 0.7, uIntensity);
        
        // Apply vignette
        if (uVignette > 0.0) {
          float vignette = getVignette(uv, uVignette * uIntensity);
          color *= vignette;
        }
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }

  /**
   * Apply CRT effect to image data using WebGL
   */
  applyCRTEffect(imageData: ImageData, options: CRTOptions, phase: number): ImageData | null {
    try {
      const { width, height } = imageData;

      // Initialize WebGL if needed
      if (!this.gl || !this.canvas || this.canvas.width !== width || this.canvas.height !== height) {
        if (!this.initWebGL(width, height)) {
          return null;
        }
      }

      if (!this.gl || !this.program || !this.texture) {
        return null;
      }

      // Upload texture
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        imageData
      );
      
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

      // Set uniforms
      const resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');
      this.gl.uniform2f(resolutionLocation, width, height);

      const phaseLocation = this.gl.getUniformLocation(this.program, 'uPhase');
      this.gl.uniform1f(phaseLocation, phase * 100); // Animate scanlines

      const intensityLocation = this.gl.getUniformLocation(this.program, 'uIntensity');
      this.gl.uniform1f(intensityLocation, options.intensity);

      const scanlineThicknessLocation = this.gl.getUniformLocation(this.program, 'uScanlineThickness');
      this.gl.uniform1f(scanlineThicknessLocation, options.scanlineThickness);

      const scanlineSpacingLocation = this.gl.getUniformLocation(this.program, 'uScanlineSpacing');
      this.gl.uniform1f(scanlineSpacingLocation, options.scanlineSpacing);

      const curvatureLocation = this.gl.getUniformLocation(this.program, 'uCurvature');
      this.gl.uniform1f(curvatureLocation, options.curvature);

      const vignetteLocation = this.gl.getUniformLocation(this.program, 'uVignette');
      this.gl.uniform1f(vignetteLocation, options.vignette);

      const chromaticAberrationLocation = this.gl.getUniformLocation(this.program, 'uChromaticAberration');
      this.gl.uniform1f(chromaticAberrationLocation, options.chromaticAberration);

      const phosphorGlowLocation = this.gl.getUniformLocation(this.program, 'uPhosphorGlow');
      this.gl.uniform1f(phosphorGlowLocation, options.phosphorGlow);

      const brightnessLocation = this.gl.getUniformLocation(this.program, 'uBrightness');
      this.gl.uniform1f(brightnessLocation, options.brightness);

      const contrastLocation = this.gl.getUniformLocation(this.program, 'uContrast');
      this.gl.uniform1f(contrastLocation, options.contrast);

      // Draw
      this.gl.clearColor(0, 0, 0, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

      // Flush to ensure rendering completes (important for mobile)
      this.gl.flush();

      // Read pixels
      const outputData = new Uint8ClampedArray(width * height * 4);
      this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, outputData);

      return new ImageData(outputData, width, height);
    } catch (error) {
      console.error('❌ WebGL CRT effect error:', error);
      return null;
    }
  }

  /**
   * Cleanup WebGL resources
   */
  dispose(): void {
    if (this.gl) {
      if (this.texture) {
        this.gl.deleteTexture(this.texture);
      }
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
      if (this.positionBuffer) {
        this.gl.deleteBuffer(this.positionBuffer);
      }
      if (this.texCoordBuffer) {
        this.gl.deleteBuffer(this.texCoordBuffer);
      }
    }
    
    this.gl = null;
    this.canvas = null;
    this.program = null;
    this.texture = null;
    this.positionBuffer = null;
    this.texCoordBuffer = null;
  }
}
