import { Injectable } from '@angular/core';

export interface MotionSenseOptions {
  direction: 'horizontal' | 'vertical' | 'radial' | 'zoom' | 'spin' | 'wave' | 'spiral';
  speed: number;
  intensity: number;
  phase: number;
  
  // New advanced options
  blurSamples?: number;        // Number of motion blur samples (default: 8)
  blurSpread?: number;         // How spread out the blur samples are (default: 1.0)
  chromaticAberration?: number; // RGB separation amount (default: 0)
  vignette?: number;           // Vignette intensity (default: 0)
  distortion?: number;         // Lens distortion (default: 0)
  trails?: number;             // Motion trail persistence (default: 0)
  edgeGlow?: number;           // Glow on motion edges (default: 0)
}

@Injectable({
  providedIn: 'root'
})
export class WebGLMotionService {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private trailTexture: WebGLTexture | null = null;
  private trailFramebuffer: WebGLFramebuffer | null = null;
  private previousFrame: ImageData | null = null;

  constructor() {
    this.initWebGL();
  }

  private initWebGL(): void {
    try {
      this.canvas = document.createElement('canvas');
      const gl = this.canvas.getContext('webgl', {
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        antialias: false
      });

      if (!gl) {
        console.warn('WebGL not available for motion sense');
        return;
      }

      this.gl = gl;
      
      // Enable necessary extensions
      const floatExt = gl.getExtension('OES_texture_float');
      if (floatExt) {
        console.log('✅ Float textures available for motion trails');
      }
      
      console.log('✅ WebGL Motion Sense Service initialized');
    } catch (e) {
      console.error('WebGL Motion initialization failed:', e);
    }
  }

  isAvailable(): boolean {
    return this.gl !== null;
  }

  /**
   * Apply motion sense effect using WebGL
   */
  renderMotion(imageData: ImageData, options: MotionSenseOptions): ImageData | null {
    if (!this.gl || !this.canvas) return null;

    // Setup canvas
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.gl.viewport(0, 0, imageData.width, imageData.height);

    // Create shader program for the specific motion type
    if (!this.createMotionProgram(options)) {
      return null;
    }

    return this.renderMotionEffect(imageData, options);
  }

  /**
   * Create motion sense shader program
   */
  private createMotionProgram(options: MotionSenseOptions): boolean {
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
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = vec2(aPosition.x * 0.5 + 0.5, aPosition.y * 0.5 + 0.5);
      }
    `;

    const fragmentShaderSource = this.getFragmentShader(options);

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return false;

    this.program = this.gl.createProgram();
    if (!this.program) return false;

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Motion program link failed:', this.gl.getProgramInfoLog(this.program));
      return false;
    }

    return true;
  }

  /**
   * Get fragment shader based on motion direction and options
   */
  private getFragmentShader(options: MotionSenseOptions): string {
    const blurSamples = options.blurSamples || 8;
    const hasChromaticAberration = (options.chromaticAberration || 0) > 0;
    const hasVignette = (options.vignette || 0) > 0;
    const hasDistortion = (options.distortion || 0) > 0;
    const hasEdgeGlow = (options.edgeGlow || 0) > 0;
    const hasTrails = (options.trails || 0) > 0;

    return `
      precision highp float;
      
      uniform sampler2D uTexture;
      ${hasTrails ? 'uniform sampler2D uTrailTexture;' : ''}
      uniform vec2 uResolution;
      uniform float uPhase;
      uniform float uIntensity;
      uniform float uSpeed;
      uniform float uBlurSpread;
      ${hasChromaticAberration ? 'uniform float uChromaticAberration;' : ''}
      ${hasVignette ? 'uniform float uVignette;' : ''}
      ${hasDistortion ? 'uniform float uDistortion;' : ''}
      ${hasEdgeGlow ? 'uniform float uEdgeGlow;' : ''}
      ${hasTrails ? 'uniform float uTrails;' : ''}
      
      varying vec2 vTexCoord;
      
      // Motion vector calculation based on direction
      vec2 getMotionVector(vec2 uv, float phase) {
        ${this.getMotionVectorCode(options.direction)}
      }
      
      ${hasDistortion ? `
      // Barrel/Pincushion distortion
      vec2 applyDistortion(vec2 uv, float amount) {
        vec2 center = vec2(0.5, 0.5);
        vec2 delta = uv - center;
        float dist = length(delta);
        float distortion = 1.0 + amount * dist * dist;
        return center + delta * distortion;
      }
      ` : ''}
      
      ${hasVignette ? `
      // Vignette effect
      float getVignette(vec2 uv, float intensity) {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        return 1.0 - smoothstep(0.3, 1.0, dist) * intensity;
      }
      ` : ''}
      
      ${hasEdgeGlow ? `
      // Edge detection for glow
      float getEdgeIntensity(sampler2D tex, vec2 uv, vec2 resolution) {
        float offset = 1.0 / min(resolution.x, resolution.y);
        vec3 center = texture2D(tex, uv).rgb;
        vec3 left = texture2D(tex, uv + vec2(-offset, 0.0)).rgb;
        vec3 right = texture2D(tex, uv + vec2(offset, 0.0)).rgb;
        vec3 up = texture2D(tex, uv + vec2(0.0, -offset)).rgb;
        vec3 down = texture2D(tex, uv + vec2(0.0, offset)).rgb;
        
        float edge = length(center - left) + length(center - right) + 
                     length(center - up) + length(center - down);
        return edge;
      }
      ` : ''}
      
      void main() {
        vec2 uv = vTexCoord;
        
        ${hasDistortion ? `
        // Apply lens distortion
        uv = applyDistortion(uv, uDistortion * uIntensity);
        ` : ''}
        
        // Get motion vector for this pixel
        vec2 motion = getMotionVector(uv, uPhase) * uIntensity * uSpeed * uBlurSpread;
        
        // Motion blur sampling
        vec3 colorSum = vec3(0.0);
        ${hasChromaticAberration ? `
        vec3 rSum = vec3(0.0), gSum = vec3(0.0), bSum = vec3(0.0);
        ` : ''}
        
        float weightSum = 0.0;
        
        for (int i = 0; i < ${blurSamples}; i++) {
          float t = float(i) / float(${blurSamples} - 1) - 0.5;
          vec2 offset = motion * t;
          
          ${hasChromaticAberration ? `
          // Chromatic aberration - separate RGB channels
          float caOffset = uChromaticAberration * t * uIntensity;
          vec2 rOffset = offset + vec2(caOffset, 0.0);
          vec2 gOffset = offset;
          vec2 bOffset = offset - vec2(caOffset, 0.0);
          
          vec2 rUV = clamp(uv + rOffset, 0.0, 1.0);
          vec2 gUV = clamp(uv + gOffset, 0.0, 1.0);
          vec2 bUV = clamp(uv + bOffset, 0.0, 1.0);
          
          float r = texture2D(uTexture, rUV).r;
          float g = texture2D(uTexture, gUV).g;
          float b = texture2D(uTexture, bUV).b;
          
          colorSum += vec3(r, g, b);
          ` : `
          vec2 sampleUV = clamp(uv + offset, 0.0, 1.0);
          colorSum += texture2D(uTexture, sampleUV).rgb;
          `}
          
          weightSum += 1.0;
        }
        
        vec3 finalColor = colorSum / weightSum;
        
        ${hasTrails ? `
        // Motion trails - blend with previous frame
        vec3 trailColor = texture2D(uTrailTexture, uv).rgb;
        finalColor = mix(finalColor, trailColor, uTrails * 0.8);
        ` : ''}
        
        ${hasEdgeGlow ? `
        // Add glow to motion edges
        float edge = getEdgeIntensity(uTexture, uv, uResolution);
        vec3 glowColor = vec3(0.5, 0.7, 1.0); // Blue-ish glow
        finalColor += glowColor * edge * uEdgeGlow * uIntensity;
        ` : ''}
        
        ${hasVignette ? `
        // Apply vignette
        float vignette = getVignette(uv, uVignette);
        finalColor *= vignette;
        ` : ''}
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }

  /**
   * Get motion vector code for specific direction
   */
  private getMotionVectorCode(direction: string): string {
    switch (direction) {
      case 'horizontal':
        return `
          float offset = sin(phase) * 0.1;
          return vec2(offset, 0.0);
        `;
      
      case 'vertical':
        return `
          float offset = sin(phase) * 0.1;
          return vec2(0.0, offset);
        `;
      
      case 'radial':
        return `
          vec2 center = vec2(0.5, 0.5);
          vec2 dir = uv - center;
          float angle = phase;
          return vec2(cos(angle), sin(angle)) * 0.1;
        `;
      
      case 'zoom':
        return `
          vec2 center = vec2(0.5, 0.5);
          vec2 dir = normalize(uv - center);
          float scale = sin(phase) * 0.1;
          return dir * scale;
        `;
      
      case 'spin':
        return `
          vec2 center = vec2(0.5, 0.5);
          vec2 delta = uv - center;
          float angle = phase * 0.5;
          mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          vec2 rotated = rotation * delta;
          return (rotated - delta) * 0.3;
        `;
      
      case 'wave':
        return `
          float waveX = sin(uv.y * 10.0 + phase) * 0.05;
          float waveY = cos(uv.x * 10.0 + phase) * 0.05;
          return vec2(waveX, waveY);
        `;
      
      case 'spiral':
        return `
          vec2 center = vec2(0.5, 0.5);
          vec2 delta = uv - center;
          float dist = length(delta);
          float angle = atan(delta.y, delta.x) + phase + dist * 5.0;
          vec2 spiralPos = vec2(cos(angle), sin(angle)) * dist;
          return (spiralPos - delta) * 0.2;
        `;
      
      default:
        return `return vec2(0.0, 0.0);`;
    }
  }

  /**
   * Render the motion effect
   */
  private renderMotionEffect(imageData: ImageData, options: MotionSenseOptions): ImageData {
    if (!this.gl || !this.program) throw new Error('WebGL not initialized');

    this.gl.useProgram(this.program);

    // Setup main texture
    this.texture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);

    // Setup trail texture if needed
    const hasTrails = (options.trails || 0) > 0;
    if (hasTrails) {
      if (!this.trailTexture) {
        this.trailTexture = this.gl.createTexture();
      }
      this.gl.activeTexture(this.gl.TEXTURE1);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.trailTexture);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      
      if (this.previousFrame) {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.previousFrame);
      } else {
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);
      }
    }

    // Setup vertex buffer (fullscreen quad)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set uniforms
    const textureLocation = this.gl.getUniformLocation(this.program, 'uTexture');
    this.gl.uniform1i(textureLocation, 0);

    if (hasTrails) {
      const trailTextureLocation = this.gl.getUniformLocation(this.program, 'uTrailTexture');
      this.gl.uniform1i(trailTextureLocation, 1);
      
      const trailsLocation = this.gl.getUniformLocation(this.program, 'uTrails');
      this.gl.uniform1f(trailsLocation, options.trails || 0);
    }

    const resolutionLocation = this.gl.getUniformLocation(this.program, 'uResolution');
    this.gl.uniform2f(resolutionLocation, imageData.width, imageData.height);

    const phaseLocation = this.gl.getUniformLocation(this.program, 'uPhase');
    this.gl.uniform1f(phaseLocation, options.phase);

    const intensityLocation = this.gl.getUniformLocation(this.program, 'uIntensity');
    this.gl.uniform1f(intensityLocation, options.intensity);

    const speedLocation = this.gl.getUniformLocation(this.program, 'uSpeed');
    this.gl.uniform1f(speedLocation, options.speed);

    const blurSpreadLocation = this.gl.getUniformLocation(this.program, 'uBlurSpread');
    this.gl.uniform1f(blurSpreadLocation, options.blurSpread || 1.0);

    if (options.chromaticAberration) {
      const caLocation = this.gl.getUniformLocation(this.program, 'uChromaticAberration');
      this.gl.uniform1f(caLocation, options.chromaticAberration);
    }

    if (options.vignette) {
      const vignetteLocation = this.gl.getUniformLocation(this.program, 'uVignette');
      this.gl.uniform1f(vignetteLocation, options.vignette);
    }

    if (options.distortion) {
      const distortionLocation = this.gl.getUniformLocation(this.program, 'uDistortion');
      this.gl.uniform1f(distortionLocation, options.distortion);
    }

    if (options.edgeGlow) {
      const edgeGlowLocation = this.gl.getUniformLocation(this.program, 'uEdgeGlow');
      this.gl.uniform1f(edgeGlowLocation, options.edgeGlow);
    }

    // Draw
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8ClampedArray(imageData.width * imageData.height * 4);
    this.gl.readPixels(0, 0, imageData.width, imageData.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    const result = new ImageData(pixels, imageData.width, imageData.height);
    
    // Store for trails
    if (hasTrails) {
      this.previousFrame = result;
    }

    return result;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Motion shader compilation failed:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.gl) {
      if (this.program) this.gl.deleteProgram(this.program);
      if (this.texture) this.gl.deleteTexture(this.texture);
      if (this.trailTexture) this.gl.deleteTexture(this.trailTexture);
      if (this.trailFramebuffer) this.gl.deleteFramebuffer(this.trailFramebuffer);
    }
    this.previousFrame = null;
  }
}
