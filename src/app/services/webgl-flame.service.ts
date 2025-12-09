import { Injectable } from '@angular/core';

export type FlameAlgorithm = 'realistic' | 'plasma' | 'dragon' | 'inferno' | 'cool' | 'mystic';

export interface FlameOptions {
  algorithm: FlameAlgorithm;
  intensity: number;
  phase: number;
  turbulence: number;
  speed: number;
  
  // Advanced parameters
  direction?: 'up' | 'down' | 'left' | 'right';
  distortion?: number;
  baseHeat?: number;
  brightness?: number;
  contrast?: number;
  noiseScale?: number;
  noiseOctaves?: number;
  opacity?: number;
  blendMode?: 'normal' | 'additive' | 'screen' | 'multiply' | 'overlay';
  
  // Custom color
  customColorR?: number;
  customColorG?: number;
  customColorB?: number;
  
  // Gradient color (second color)
  gradientColorR?: number;
  gradientColorG?: number;
  gradientColorB?: number;
  useGradient?: boolean;
  
  // Positioning
  offsetX?: number;
  offsetY?: number;
  
  // Spawn Area Control
  spawnArea?: 'full' | 'bottom' | 'top' | 'left' | 'right' | 'center' | 'first-half' | 'second-half' | 'edges' | 'corners';
  spawnStart?: number;
  spawnEnd?: number;
  spawnFadeIn?: number;
  spawnFadeOut?: number;
  
  // Quality
  smoothing?: number;
  
  // Height/spread
  height?: number;
  spread?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebGLFlameService {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private texture: WebGLTexture | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): boolean {
    try {
      this.canvas = document.createElement('canvas');
      this.gl = this.canvas.getContext('webgl', { 
        premultipliedAlpha: false,
        preserveDrawingBuffer: true 
      });

      if (!this.gl) {
        console.warn('WebGL not supported, falling back to CPU rendering');
        return false;
      }

      this.program = this.createShaderProgram();
      if (!this.program) {
        return false;
      }

      this.setupBuffers();
      this.isInitialized = true;
      return true;
    } catch (e) {
      console.error('WebGL initialization failed:', e);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.gl !== null && this.program !== null;
  }

  private createShaderProgram(): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, this.getVertexShader());
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, this.getFragmentShader());

    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Shader program link failed:', this.gl.getProgramInfoLog(program));
      return null;
    }

    return program;
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

  private getVertexShader(): string {
    return `
      attribute vec2 position;
      varying vec2 vUv;
      
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
  }

  private getFragmentShader(): string {
    return `
      precision highp float;
      
      uniform sampler2D uImage;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uTurbulence;
      uniform int uAlgorithm;
      uniform vec2 uResolution;
      
      // Advanced parameters
      uniform int uDirection; // 0=up, 1=down, 2=left, 3=right
      uniform float uDistortion;
      uniform float uBaseHeat;
      uniform float uBrightness;
      uniform float uContrast;
      uniform float uNoiseScale;
      uniform int uNoiseOctaves;
      uniform float uOpacity;
      uniform vec3 uCustomColor;
      uniform vec3 uGradientColor; // Second color for gradient mode
      uniform bool uUseGradient; // Whether to use gradient
      uniform vec2 uOffset;
      uniform float uSmoothing;
      uniform float uHeight;
      uniform float uSpread;
      
      // Spawn area control
      uniform int uSpawnArea; // 0=full, 1=bottom, 2=top, 3=left, 4=right, 5=center, 6=first-half, 7=second-half, 8=edges, 9=corners
      uniform float uSpawnStart;
      uniform float uSpawnEnd;
      uniform float uSpawnFadeIn;
      uniform float uSpawnFadeOut;
      
      varying vec2 vUv;
      
      // Perlin noise implementation with highp precision for mobile
      highp vec3 mod289(highp vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      highp vec2 mod289(highp vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      highp vec3 permute(highp vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      highp float snoise(highp vec2 v) {
        const highp vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        highp vec2 i  = floor(v + dot(v, C.yy));
        highp vec2 x0 = v - i + dot(i, C.xx);
        highp vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        highp vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        highp vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      
      // Flame color gradient
      vec3 getFlameColor(float heat, int algorithm) {
        heat = clamp(heat, 0.0, 1.0);
        
        if (algorithm == 0) { // realistic
          if (heat < 0.3) return vec3(0.1, 0.0, 0.0);
          if (heat < 0.5) return mix(vec3(0.6, 0.0, 0.0), vec3(1.0, 0.3, 0.0), (heat - 0.3) / 0.2);
          if (heat < 0.7) return mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.8, 0.0), (heat - 0.5) / 0.2);
          return mix(vec3(1.0, 0.8, 0.0), vec3(1.0, 1.0, 0.8), (heat - 0.7) / 0.3);
        } 
        else if (algorithm == 1) { // plasma
          float r = 0.5 + 0.5 * sin(heat * 6.28318);
          float g = 0.5 + 0.5 * sin(heat * 6.28318 + 2.094395);
          float b = 0.5 + 0.5 * sin(heat * 6.28318 + 4.18879);
          return vec3(r, g, b);
        }
        else if (algorithm == 2) { // dragon
          if (heat < 0.4) return vec3(0.0, 0.0, 0.1);
          if (heat < 0.6) return mix(vec3(0.8, 0.0, 0.0), vec3(1.0, 0.2, 0.0), (heat - 0.4) / 0.2);
          return mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 1.0, 0.3), (heat - 0.6) / 0.4);
        }
        else if (algorithm == 3) { // inferno
          if (heat < 0.25) return vec3(0.0);
          if (heat < 0.5) return mix(vec3(0.0), vec3(0.5, 0.0, 0.5), (heat - 0.25) / 0.25);
          if (heat < 0.75) return mix(vec3(0.5, 0.0, 0.5), vec3(1.0, 0.0, 0.0), (heat - 0.5) / 0.25);
          return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), (heat - 0.75) / 0.25);
        }
        else if (algorithm == 4) { // cool
          if (heat < 0.3) return vec3(0.0, 0.0, 0.2);
          if (heat < 0.6) return mix(vec3(0.0, 0.0, 0.6), vec3(0.0, 0.6, 0.8), (heat - 0.3) / 0.3);
          return mix(vec3(0.0, 0.6, 0.8), vec3(0.5, 1.0, 1.0), (heat - 0.6) / 0.4);
        }
        else { // mystic
          if (heat < 0.3) return vec3(0.1, 0.0, 0.2);
          if (heat < 0.6) return mix(vec3(0.3, 0.0, 0.5), vec3(0.5, 0.0, 0.8), (heat - 0.3) / 0.3);
          return mix(vec3(0.5, 0.0, 0.8), vec3(0.8, 0.5, 1.0), (heat - 0.6) / 0.4);
        }
      }
      
      void main() {
        vec4 original = texture2D(uImage, vUv);
        vec2 uv = vUv;
        
        // Apply offset
        uv += uOffset * 0.01;
        
        // Transform UV based on direction
        vec2 transformedUV = uv;
        if (uDirection == 1) { // down
          transformedUV.y = 1.0 - transformedUV.y;
        } else if (uDirection == 2) { // left
          transformedUV = vec2(transformedUV.y, 1.0 - transformedUV.x);
        } else if (uDirection == 3) { // right
          transformedUV = vec2(1.0 - transformedUV.y, transformedUV.x);
        }
        
        // Multi-octave noise unrolled for mobile GPU compatibility
        highp float noise = 0.0;
        highp float amplitude = 1.0;
        highp float frequency = uNoiseScale;
        
        // Octave 1
        noise += snoise(transformedUV * frequency * 8.0 + vec2(0.0, uTime * 2.0)) * amplitude;
        
        // Octave 2 (conditional)
        if (uNoiseOctaves >= 2) {
          amplitude *= 0.5;
          frequency *= 2.0;
          noise += snoise(transformedUV * frequency * 8.0 + vec2(0.0, uTime * 3.0)) * amplitude;
        }
        
        // Octave 3 (conditional)
        if (uNoiseOctaves >= 3) {
          amplitude *= 0.5;
          frequency *= 2.0;
          noise += snoise(transformedUV * frequency * 8.0 + vec2(0.0, uTime * 4.0)) * amplitude;
        }
        
        // Octave 4 (conditional)
        if (uNoiseOctaves >= 4) {
          amplitude *= 0.5;
          frequency *= 2.0;
          noise += snoise(transformedUV * frequency * 8.0 + vec2(0.0, uTime * 5.0)) * amplitude;
        }
        
        noise *= uTurbulence;
        
        // Calculate base position for heat calculation
        // For upward flames: 0=bottom (hot), 1=top (cold)
        float basePosition = transformedUV.y;
        
        // Heat value based on position and noise (inverted Y so bottom is hot)
        float heat = (1.0 - basePosition) + noise * 0.5 + uBaseHeat;
        heat = heat * uIntensity;
        
        // Add horizontal distortion for flame movement
        float distortX = noise * uDistortion * 0.1;
        vec2 distortedUV = transformedUV;
        distortedUV.x += distortX;
        
        // Apply spread (horizontal scaling)
        float spreadMask = smoothstep(0.5 - uSpread * 0.005, 0.5 + uSpread * 0.005, abs(distortedUV.x - 0.5));
        heat *= (1.0 - spreadMask);
        
        // Apply spawn area mask (optimized for mobile)
        highp float spawnMask = 1.0;
        highp float fadeInNorm = uSpawnFadeIn * 0.01;
        highp float fadeOutNorm = uSpawnFadeOut * 0.01;
        
        if (uSpawnArea == 1) { // bottom
          highp float range = uSpawnEnd * 0.01;
          spawnMask = smoothstep(range + fadeOutNorm, range, transformedUV.y);
        }
        else if (uSpawnArea == 2) { // top
          highp float range = 1.0 - uSpawnEnd * 0.01;
          spawnMask = smoothstep(range - fadeOutNorm, range, 1.0 - transformedUV.y);
        }
        else if (uSpawnArea == 3) { // left
          highp float range = uSpawnEnd * 0.01;
          spawnMask = smoothstep(range + fadeOutNorm, range, transformedUV.x);
        }
        else if (uSpawnArea == 4) { // right
          highp float range = 1.0 - uSpawnEnd * 0.01;
          spawnMask = smoothstep(range - fadeOutNorm, range, 1.0 - transformedUV.x);
        }
        else if (uSpawnArea == 5) { // center (circular)
          highp float dist = distance(transformedUV, vec2(0.5));
          highp float radius = 0.3;
          spawnMask = 1.0 - smoothstep(radius - fadeOutNorm, radius + fadeOutNorm, dist);
        }
        else if (uSpawnArea == 6) { // first-half
          if (uDirection == 0 || uDirection == 1) {
            spawnMask = smoothstep(0.5 + fadeOutNorm, 0.5 - fadeInNorm, transformedUV.y);
          } else {
            spawnMask = smoothstep(0.5 + fadeOutNorm, 0.5 - fadeInNorm, transformedUV.x);
          }
        }
        else if (uSpawnArea == 7) { // second-half
          if (uDirection == 0 || uDirection == 1) {
            spawnMask = smoothstep(0.5 - fadeOutNorm, 0.5 + fadeInNorm, transformedUV.y);
          } else {
            spawnMask = smoothstep(0.5 - fadeOutNorm, 0.5 + fadeInNorm, transformedUV.x);
          }
        }
        else if (uSpawnArea == 8) { // edges (border)
          highp float distFromCenter = max(abs(transformedUV.x - 0.5), abs(transformedUV.y - 0.5));
          highp float edgeThreshold = 0.4;
          spawnMask = smoothstep(edgeThreshold - fadeInNorm, edgeThreshold + fadeOutNorm, distFromCenter);
        }
        else if (uSpawnArea == 9) { // corners
          highp float cornerDist = max(abs(transformedUV.x - 0.5), abs(transformedUV.y - 0.5));
          highp float cornerThreshold = 0.3;
          spawnMask = smoothstep(cornerThreshold, cornerThreshold + fadeInNorm, cornerDist);
        }
        
        // Apply spawn start/end range (optimized)
        if (uSpawnStart > 0.0 || uSpawnEnd < 100.0) {
          highp float spawnRange;
          
          if (uDirection == 0) {
            spawnRange = 1.0 - transformedUV.y;
          } else if (uDirection == 1) {
            spawnRange = transformedUV.y;
          } else if (uDirection == 2) {
            spawnRange = 1.0 - transformedUV.x;
          } else {
            spawnRange = transformedUV.x;
          }
          
          highp float startNorm = uSpawnStart * 0.01;
          highp float endNorm = uSpawnEnd * 0.01;
          highp float fadeIn = uSpawnFadeIn * 0.01;
          highp float fadeOut = uSpawnFadeOut * 0.01;
          
          highp float startFade = smoothstep(startNorm - fadeIn, startNorm, spawnRange);
          highp float endFade = 1.0 - smoothstep(endNorm, endNorm + fadeOut, spawnRange);
          
          spawnMask *= startFade * endFade;
        }
        
        heat *= spawnMask;
        
        // Get flame color
        vec3 flameColor = getFlameColor(heat, uAlgorithm);
        
        // Apply custom color or gradient
        if (uUseGradient) {
          // Gradient mode: interpolate between two custom colors based on heat
          flameColor = mix(uCustomColor, uGradientColor, heat);
        } else if (length(uCustomColor) > 0.1) {
          // Custom single color mode: blend with generated flame color
          flameColor = mix(flameColor, uCustomColor, 0.6);
        }
        
        // Apply brightness and contrast
        flameColor *= uBrightness;
        flameColor = ((flameColor - 0.5) * uContrast) + 0.5;
        flameColor = clamp(flameColor, 0.0, 1.0);
        
        // Create flame mask with smoothing
        float flameMask = smoothstep(0.0, uSmoothing, heat);
        
        // Apply opacity
        flameMask *= uOpacity;
        
        // Blend with original image (additive by default)
        vec3 result = original.rgb + flameColor * flameMask;
        result = clamp(result, 0.0, 1.0);
        
        gl_FragColor = vec4(result, 1.0);
      }
    `;
  }

  private setupBuffers(): void {
    if (!this.gl || !this.program) return;

    // Create quad vertices
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);

    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
  }

  renderFlames(imageData: ImageData, options: FlameOptions): ImageData | null {
    if (!this.isAvailable() || !this.gl || !this.program || !this.canvas) {
      return null;
    }

    try {
      const { width, height } = imageData;

      // Resize canvas if needed
      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
      }

      // Create/update texture
      if (!this.texture) {
        this.texture = this.gl.createTexture();
      }

      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0,
        this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData.data
      );
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

      // Use program
      this.gl.useProgram(this.program);

      // Set uniforms
      const algorithmMap: Record<FlameAlgorithm, number> = {
        'realistic': 0,
        'plasma': 1,
        'dragon': 2,
        'inferno': 3,
        'cool': 4,
        'mystic': 5
      };

      // Basic uniforms
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uImage'), 0);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uTime'), options.phase * (options.speed || 1.0));
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uIntensity'), options.intensity);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uTurbulence'), options.turbulence);
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uAlgorithm'), algorithmMap[options.algorithm]);
      this.gl.uniform2f(this.gl.getUniformLocation(this.program, 'uResolution'), width, height);

      // Advanced uniforms with defaults
      const directionMap = { 'up': 0, 'down': 1, 'left': 2, 'right': 3 };
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uDirection'), directionMap[options.direction || 'up']);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uDistortion'), options.distortion || 0.3);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uBaseHeat'), options.baseHeat || 0.1);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uBrightness'), options.brightness || 1.0);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uContrast'), options.contrast || 1.0);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uNoiseScale'), options.noiseScale || 1.0);
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uNoiseOctaves'), options.noiseOctaves || 3);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uOpacity'), options.opacity || 1.0);
      this.gl.uniform3f(this.gl.getUniformLocation(this.program, 'uCustomColor'), 
        (options.customColorR || 0) / 255.0,
        (options.customColorG || 0) / 255.0,
        (options.customColorB || 0) / 255.0
      );
      this.gl.uniform3f(this.gl.getUniformLocation(this.program, 'uGradientColor'), 
        (options.gradientColorR || 255) / 255.0,
        (options.gradientColorG || 255) / 255.0,
        (options.gradientColorB || 0) / 255.0
      );
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uUseGradient'), options.useGradient ? 1 : 0);
      this.gl.uniform2f(this.gl.getUniformLocation(this.program, 'uOffset'), 
        options.offsetX || 0,
        options.offsetY || 0
      );
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSmoothing'), options.smoothing || 0.3);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uHeight'), options.height || 60);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSpread'), options.spread || 50);

      // Spawn area uniforms
      const spawnAreaMap: Record<string, number> = {
        'full': 0, 'bottom': 1, 'top': 2, 'left': 3, 'right': 4,
        'center': 5, 'first-half': 6, 'second-half': 7, 'edges': 8, 'corners': 9
      };
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uSpawnArea'), spawnAreaMap[options.spawnArea || 'full']);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSpawnStart'), options.spawnStart || 0);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSpawnEnd'), options.spawnEnd || 100);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSpawnFadeIn'), options.spawnFadeIn || 10);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uSpawnFadeOut'), options.spawnFadeOut || 10);

      // Render
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

      // Read pixels
      const pixels = new Uint8Array(width * height * 4);
      this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
      
      // Flush commands to prevent frame corruption on mobile
      this.gl.flush();

      return new ImageData(new Uint8ClampedArray(pixels), width, height);
    } catch (e) {
      console.error('WebGL flame rendering failed:', e);
      return null;
    }
  }

  dispose(): void {
    if (this.gl) {
      if (this.texture) {
        this.gl.deleteTexture(this.texture);
        this.texture = null;
      }
      if (this.program) {
        this.gl.deleteProgram(this.program);
        this.program = null;
      }
      if (this.framebuffer) {
        this.gl.deleteFramebuffer(this.framebuffer);
        this.framebuffer = null;
      }
    }
    this.gl = null;
    this.canvas = null;
    this.isInitialized = false;
  }
}
